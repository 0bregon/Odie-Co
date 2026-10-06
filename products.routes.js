const express = require('express');
const db = require('../db/database');

const router = express.Router();

function attachSizes(product) {
  const sizes = db.prepare(`
    SELECT size, stock FROM product_sizes WHERE product_id = ? ORDER BY CAST(size AS INTEGER)
  `).all(product.id);

  const totalStock = sizes.reduce((sum, s) => sum + s.stock, 0);

  return { ...product, sizes, in_stock: totalStock > 0, total_stock: totalStock };
}

// Catálogo completo, con filtros opcionales por categoría o disponibilidad
// Ejemplo: /api/products?category=Sandalias&available=1
router.get('/', (req, res) => {
  const { category, available } = req.query;

  let sql = 'SELECT * FROM products WHERE active = 1';
  const params = [];

  if (category) {
    sql += ' AND category = ?';
    params.push(category);
  }

  sql += ' ORDER BY created_at DESC';

  let products = db.prepare(sql).all(...params).map(attachSizes);

  if (available === '1') {
    products = products.filter(p => p.in_stock);
  }

  res.json({ products });
});

// Categorías existentes, útil para armar los filtros del catálogo
router.get('/categories', (req, res) => {
  const rows = db.prepare('SELECT DISTINCT category FROM products WHERE active = 1 ORDER BY category').all();
  res.json({ categories: rows.map(r => r.category) });
});

// Un solo producto por su slug (para la página de detalle)
router.get('/:slug', (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE slug = ? AND active = 1').get(req.params.slug);
  if (!product) {
    return res.status(404).json({ error: 'Producto no encontrado.' });
  }
  res.json({ product: attachSizes(product) });
});

module.exports = router;
