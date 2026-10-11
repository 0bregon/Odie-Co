const express = require('express');
const { supabase, check } = require('../db/supabase');
const asyncHandler = require('../middleware/asyncHandler');

const router = express.Router();

const PRODUCT_COLS = 'id, name, slug, category, description, price, image_url, created_at, product_sizes(size, stock)';

// Convierte la fila de Supabase al formato que espera el frontend
function shape(row) {
  const sizes = (row.product_sizes || [])
    .map(s => ({ size: s.size, stock: s.stock }))
    .sort((a, b) => Number(a.size) - Number(b.size));
  const totalStock = sizes.reduce((sum, s) => sum + s.stock, 0);
  const { product_sizes, ...product } = row;
  return { ...product, price: Number(product.price), sizes, in_stock: totalStock > 0, total_stock: totalStock };
}

// Catálogo. Ejemplo: /api/products?category=Sandalias&available=1
router.get('/', asyncHandler(async (req, res) => {
  const { category, available } = req.query;

  let q = supabase.from('products').select(PRODUCT_COLS).eq('active', true).order('created_at', { ascending: false });
  if (typeof category === 'string' && category) q = q.eq('category', category);

  let products = check(await q).map(shape);
  if (available === '1') products = products.filter(p => p.in_stock);

  res.json({ products });
}));

// Categorías para los filtros
router.get('/categories', asyncHandler(async (req, res) => {
  const rows = check(await supabase.from('products').select('category').eq('active', true));
  const categories = [...new Set(rows.map(r => r.category))].sort();
  res.json({ categories });
}));

// Un producto por slug
router.get('/:slug', asyncHandler(async (req, res) => {
  const row = check(await supabase.from('products').select(PRODUCT_COLS)
    .eq('slug', req.params.slug).eq('active', true).maybeSingle());

  if (!row) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json({ product: shape(row) });
}));

module.exports = router;
