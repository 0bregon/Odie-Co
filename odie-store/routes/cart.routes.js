const express = require('express');
const db = require('../db/database');

const router = express.Router();

// El carrito vive mientras dura la sesión del navegador (cookie),
// así que funciona tanto para alguien con cuenta como para un
// visitante que todavía no se ha registrado.

function getOrCreateCart(req) {
  const sessionId = req.sessionID;
  let cart = db.prepare('SELECT * FROM carts WHERE session_id = ?').get(sessionId);

  if (!cart) {
    const info = db.prepare('INSERT INTO carts (session_id, user_id) VALUES (?, ?)')
      .run(sessionId, req.session.userId || null);
    cart = db.prepare('SELECT * FROM carts WHERE id = ?').get(info.lastInsertRowid);
  } else if (req.session.userId && !cart.user_id) {
    // Si el visitante inicia sesión después de armar su carrito, lo vinculamos a su cuenta.
    db.prepare('UPDATE carts SET user_id = ? WHERE id = ?').run(req.session.userId, cart.id);
  }

  return cart;
}

function getCartWithItems(cartId) {
  const items = db.prepare(`
    SELECT
      ci.id, ci.size, ci.quantity,
      p.id AS product_id, p.name, p.price, p.image_url, p.slug
    FROM cart_items ci
    JOIN products p ON p.id = ci.product_id
    WHERE ci.cart_id = ?
    ORDER BY ci.id
  `).all(cartId);

  const total = items.reduce((sum, it) => sum + it.price * it.quantity, 0);

  return { items, total, count: items.reduce((n, it) => n + it.quantity, 0) };
}

function availableStock(productId, size) {
  const row = db.prepare('SELECT stock FROM product_sizes WHERE product_id = ? AND size = ?').get(productId, size);
  return row ? row.stock : 0;
}

// Ver el carrito actual
router.get('/', (req, res) => {
  const cart = getOrCreateCart(req);
  res.json(getCartWithItems(cart.id));
});

// Agregar un producto (con talla y cantidad) al carrito
router.post('/items', (req, res) => {
  const { product_id, size, quantity } = req.body || {};
  const qty = Number(quantity) || 1;

  if (!product_id || !size) {
    return res.status(400).json({ error: 'Falta el producto o la talla.' });
  }

  const product = db.prepare('SELECT * FROM products WHERE id = ? AND active = 1').get(product_id);
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }

  const stock = availableStock(product_id, size);
  if (stock <= 0) {
    return res.status(409).json({ error: `No hay disponibilidad en la talla ${size}.` });
  }

  const cart = getOrCreateCart(req);
  const existing = db.prepare('SELECT * FROM cart_items WHERE cart_id = ? AND product_id = ? AND size = ?')
    .get(cart.id, product_id, size);

  const desiredQty = (existing ? existing.quantity : 0) + qty;

  if (desiredQty > stock) {
    return res.status(409).json({
      error: `Solo quedan ${stock} unidades disponibles en la talla ${size}.`
    });
  }

  if (existing) {
    db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(desiredQty, existing.id);
  } else {
    db.prepare('INSERT INTO cart_items (cart_id, product_id, size, quantity) VALUES (?, ?, ?, ?)')
      .run(cart.id, product_id, size, qty);
  }

  res.status(201).json(getCartWithItems(cart.id));
});

// Cambiar la cantidad de una línea del carrito
router.patch('/items/:itemId', (req, res) => {
  const { quantity } = req.body || {};
  const qty = Number(quantity);

  if (!qty || qty < 1) {
    return res.status(400).json({ error: 'La cantidad debe ser al menos 1.' });
  }

  const cart = getOrCreateCart(req);
  const item = db.prepare('SELECT * FROM cart_items WHERE id = ? AND cart_id = ?').get(req.params.itemId, cart.id);
  if (!item) {
    return res.status(404).json({ error: 'Ese producto no está en tu carrito.' });
  }

  const stock = availableStock(item.product_id, item.size);
  if (qty > stock) {
    return res.status(409).json({ error: `Solo quedan ${stock} unidades disponibles en la talla ${item.size}.` });
  }

  db.prepare('UPDATE cart_items SET quantity = ? WHERE id = ?').run(qty, item.id);
  res.json(getCartWithItems(cart.id));
});

// Quitar un producto del carrito
router.delete('/items/:itemId', (req, res) => {
  const cart = getOrCreateCart(req);
  db.prepare('DELETE FROM cart_items WHERE id = ? AND cart_id = ?').run(req.params.itemId, cart.id);
  res.json(getCartWithItems(cart.id));
});

module.exports = router;
