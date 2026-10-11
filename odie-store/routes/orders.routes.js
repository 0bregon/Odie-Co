const express = require('express');
const { supabase, check } = require('../db/supabase');
const asyncHandler = require('../middleware/asyncHandler');
const requireAuth = require('../middleware/requireAuth');
const { sendMail, orderConfirmationHtml } = require('../utils/mailer');

const router = express.Router();

// Confirmar el pedido. Toda la lógica crítica (validar stock, crear el pedido,
// descontar y vaciar el carrito) ocurre dentro de la función checkout_order en
// Supabase, en una sola transacción: dos compras simultáneas no pueden vender
// la misma unidad dos veces.
router.post('/checkout', requireAuth, asyncHandler(async (req, res) => {
  const token = req.session.cartToken;
  if (!token) return res.status(400).json({ error: 'Tu carrito está vacío.' });

  const cart = check(await supabase.from('carts').select('id').eq('token', token).maybeSingle());
  if (!cart) return res.status(400).json({ error: 'Tu carrito está vacío.' });

  const { data: orderId, error } = await supabase.rpc('checkout_order', {
    p_user_id: req.session.userId,
    p_cart_id: cart.id
  });

  if (error) {
    const msg = error.message || '';
    if (msg.includes('CARRITO_VACIO')) {
      return res.status(400).json({ error: 'Tu carrito está vacío.' });
    }
    if (msg.includes('SIN_STOCK')) {
      const [, name, size] = msg.split('|');
      return res.status(409).json({
        error: `Ya no hay suficiente disponibilidad de "${name}" en talla ${size}.`
      });
    }
    throw error;
  }

  const order = check(await supabase.from('orders').select('*').eq('id', orderId).single());
  const items = check(await supabase.from('order_items').select('*').eq('order_id', orderId));
  const user = check(await supabase.from('users').select('name, email').eq('id', req.session.userId).single());

  const orderOut = { ...order, total: Number(order.total) };
  const itemsOut = items.map(i => ({ ...i, unit_price: Number(i.unit_price) }));

  // El pedido ya quedó guardado; si el correo falla, solo lo registramos.
  sendMail({
    to: user.email,
    subject: `Confirmación de tu pedido #${order.id} - Odie & Co.`,
    html: orderConfirmationHtml({ name: user.name, order: orderOut, items: itemsOut })
  }).catch(err => console.error('Error enviando correo de confirmación:', err.message));

  res.status(201).json({ order: orderOut, items: itemsOut });
}));

// Historial de pedidos del usuario (para "Mi cuenta")
router.get('/', requireAuth, asyncHandler(async (req, res) => {
  const rows = check(await supabase.from('orders')
    .select('*, order_items(*)')
    .eq('user_id', req.session.userId)
    .order('created_at', { ascending: false }));

  const orders = rows.map(o => ({
    id: o.id,
    total: Number(o.total),
    status: o.status,
    created_at: o.created_at,
    items: o.order_items.map(i => ({ ...i, unit_price: Number(i.unit_price) }))
  }));

  res.json({ orders });
}));

module.exports = router;
