const crypto = require('crypto');
const express = require('express');
const { supabase, check } = require('../db/supabase');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

// El carrito se identifica con un código aleatorio guardado en la cookie de
// sesión, así funciona para visitantes sin cuenta y también para clientes.

async function getOrCreateCart(req) {
  if (!req.session.cartToken) {
    req.session.cartToken = crypto.randomUUID();
  }
  const token = req.session.cartToken;

  let cart = check(await supabase.from('carts').select('*').eq('token', token).maybeSingle());

  if (!cart) {
    cart = check(await supabase.from('carts')
      .insert({ token, user_id: req.session.userId || null })
      .select('*').single());
  } else if (req.session.userId && cart.user_id !== req.session.userId) {
    // Si el visitante inicia sesión después de armar su carrito, lo vinculamos a su cuenta.
    check(await supabase.from('carts').update({ user_id: req.session.userId }).eq('id', cart.id));
  }

  return cart;
}

async function getCartWithItems(cartId) {
  const rows = check(await supabase.from('cart_items')
    .select('id, size, quantity, products(id, name, price, image_url, slug)')
    .eq('cart_id', cartId)
    .order('id'));

  const items = rows.map(r => ({
    id: r.id,
    size: r.size,
    quantity: r.quantity,
    product_id: r.products.id,
    name: r.products.name,
    price: Number(r.products.price),
    image_url: r.products.image_url,
    slug: r.products.slug
  }));

  // Total calculado en centavos para evitar errores de decimales
  const totalCents = items.reduce((sum, it) => sum + Math.round(it.price * 100) * it.quantity, 0);

  return { items, total: totalCents / 100, count: items.reduce((n, it) => n + it.quantity, 0) };
}

async function availableStock(productId, size) {
  const row = check(await supabase.from('product_sizes').select('stock')
    .eq('product_id', productId).eq('size', size).maybeSingle());
  return row ? row.stock : 0;
}

function toPositiveInt(value) {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 99 ? n : null;
}

// Ver el carrito actual
router.get('/', asyncHandler(async (req, res) => {
  const cart = await getOrCreateCart(req);
  res.json(await getCartWithItems(cart.id));
}));

// Agregar un producto (talla y cantidad)
router.post('/items', asyncHandler(async (req, res) => {
  const { product_id, size, quantity } = req.body || {};
  const productId = Number(product_id);
  const qty = quantity === undefined ? 1 : toPositiveInt(quantity);

  if (!Number.isInteger(productId) || productId < 1 || typeof size !== 'string' || !size) {
    return res.status(400).json({ error: 'Falta el producto o la talla.' });
  }
  if (!qty) {
    return res.status(400).json({ error: 'La cantidad debe ser un número entre 1 y 99.' });
  }

  const product = check(await supabase.from('products').select('id')
    .eq('id', productId).eq('active', true).maybeSingle());
  if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

  const stock = await availableStock(productId, size);
  if (stock <= 0) {
    return res.status(409).json({ error: `No hay disponibilidad en la talla ${size}.` });
  }

  const cart = await getOrCreateCart(req);
  const existing = check(await supabase.from('cart_items').select('id, quantity')
    .eq('cart_id', cart.id).eq('product_id', productId).eq('size', size).maybeSingle());

  const desiredQty = (existing ? existing.quantity : 0) + qty;
  if (desiredQty > stock) {
    return res.status(409).json({ error: `Solo quedan ${stock} unidades disponibles en la talla ${size}.` });
  }

  if (existing) {
    check(await supabase.from('cart_items').update({ quantity: desiredQty }).eq('id', existing.id));
  } else {
    check(await supabase.from('cart_items')
      .insert({ cart_id: cart.id, product_id: productId, size, quantity: qty }));
  }

  res.status(201).json(await getCartWithItems(cart.id));
}));

// Cambiar la cantidad de una línea
router.patch('/items/:itemId', asyncHandler(async (req, res) => {
  const qty = toPositiveInt(req.body && req.body.quantity);
  if (!qty) return res.status(400).json({ error: 'La cantidad debe ser un número entre 1 y 99.' });

  const itemId = Number(req.params.itemId);
  if (!Number.isInteger(itemId)) return res.status(404).json({ error: 'Ese producto no está en tu carrito.' });

  const cart = await getOrCreateCart(req);
  const item = check(await supabase.from('cart_items').select('id, product_id, size')
    .eq('id', itemId).eq('cart_id', cart.id).maybeSingle());
  if (!item) return res.status(404).json({ error: 'Ese producto no está en tu carrito.' });

  const stock = await availableStock(item.product_id, item.size);
  if (qty > stock) {
    return res.status(409).json({ error: `Solo quedan ${stock} unidades disponibles en la talla ${item.size}.` });
  }

  check(await supabase.from('cart_items').update({ quantity: qty }).eq('id', item.id));
  res.json(await getCartWithItems(cart.id));
}));

// Quitar un producto
router.delete('/items/:itemId', asyncHandler(async (req, res) => {
  const itemId = Number(req.params.itemId);
  const cart = await getOrCreateCart(req);

  if (Number.isInteger(itemId)) {
    check(await supabase.from('cart_items').delete().eq('id', itemId).eq('cart_id', cart.id));
  }
  res.json(await getCartWithItems(cart.id));
}));

module.exports = router;
