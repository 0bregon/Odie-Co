const express = require('express');
const db = require('../db/database');
const requireAuth = require('../middleware/requireAuth');
const { sendMail, orderConfirmationHtml } = require('../utils/mailer');

const router = express.Router();

// Confirmar el pedido: requiere tener sesión iniciada (cuenta),
// valida que todo siga disponible, descuenta el stock y
// envía el correo de confirmación.
router.post('/checkout', requireAuth, async (req, res) => {
  const cart = db.prepare('SELECT * FROM carts WHERE session_id = ?').get(req.sessionID);

  if (!cart) {
    return res.status(400).json({ error: 'Tu carrito está vacío.' });
  }

  const items = db.prepare(`
    SELECT ci.id, ci.product_id, ci.size, ci.quantity, p.name, p.price
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ?
  `).all(cart.id);

  if (items.length === 0) {
    return res.status(400).json({ error: 'Tu carrito está vacío.' });
  }

  // Revalidamos stock justo antes de confirmar, por si cambió mientras tanto.
  for (const item of items) {
    const sizeRow = db.prepare('SELECT stock FROM product_sizes WHERE product_id = ? AND size = ?')
      .get(item.product_id, item.size);
    if (!sizeRow || sizeRow.stock < item.quantity) {
      return res.status(409).json({
        error: `Ya no hay suficiente disponibilidad de "${item.name}" en talla ${item.size}.`
      });
    }
  }

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.session.userId);
  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  const createOrder = db.transaction(() => {
    const orderInfo = db.prepare('INSERT INTO orders (user_id, total) VALUES (?, ?)').run(user.id, total);
    const orderId = orderInfo.lastInsertRowid;

    const insertOrderItem = db.prepare(`
      INSERT INTO order_items (order_id, product_id, product_name, size, quantity, unit_price)
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const decreaseStock = db.prepare(`
      UPDATE product_sizes SET stock = stock - ? WHERE product_id = ? AND size = ?
    `);

    for (const item of items) {
      insertOrderItem.run(orderId, item.product_id, item.name, item.size, item.quantity, item.price);
      decreaseStock.run(item.quantity, item.product_id, item.size);
    }

    db.prepare('DELETE FROM cart_items WHERE cart_id = ?').run(cart.id);

    return orderId;
  });

  const orderId = createOrder();
  const order = db.prepare('SELECT * FROM orders WHERE id = ?').get(orderId);
  const orderItems = db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(orderId);

  try {
    await sendMail({
      to: user.email,
      subject: `Confirmación de tu pedido #${order.id} - Odie & Co.`,
      html: orderConfirmationHtml({ name: user.name, order, items: orderItems })
    });
  } catch (err) {
    console.error('Error enviando correo de confirmación:', err.message);
    // El pedido ya quedó registrado aunque el correo falle; se lo decimos al cliente.
  }

  res.status(201).json({ order, items: orderItems });
});

// Historial de pedidos del usuario (para "Mi cuenta")
router.get('/', requireAuth, (req, res) => {
  const orders = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC').all(req.session.userId);
  const withItems = orders.map(order => ({
    ...order,
    items: db.prepare('SELECT * FROM order_items WHERE order_id = ?').all(order.id)
  }));
  res.json({ orders: withItems });
});

module.exports = router;
