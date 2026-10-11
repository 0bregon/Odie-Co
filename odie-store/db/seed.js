// Datos de ejemplo (ficticios) para probar el catálogo.
// Ejecutar con: npm run seed
// Puedes volver a correrlo cuando quieras: borra los productos
// existentes y los vuelve a crear, para que no se dupliquen.

const db = require('./database');

const products = [
  {
    name: 'Zapato Primeros Pasos Nube',
    slug: 'zapato-primeros-pasos-nube',
    category: 'Primeros pasos',
    description: 'Calzado ultra flexible de suela antideslizante, ideal para los primeros pasos. Interior acolchado y cierre con velcro.',
    price: 24.99,
    image_url: 'https://images.unsplash.com/photo-1514989940723-e8e51635b782?auto=format&fit=crop&w=600&q=80',
    sizes: [
      { size: '18', stock: 8 },
      { size: '19', stock: 5 },
      { size: '20', stock: 0 },
      { size: '21', stock: 6 }
    ]
  },
  {
    name: 'Sandalia Verano Coral',
    slug: 'sandalia-verano-coral',
    category: 'Sandalias',
    description: 'Sandalia liviana y fresca para los días calurosos, con hebilla ajustable y plantilla suave.',
    price: 19.5,
    image_url: 'https://images.unsplash.com/photo-1603808033192-082d6919d3e1?auto=format&fit=crop&w=600&q=80',
    sizes: [
      { size: '22', stock: 10 },
      { size: '23', stock: 7 },
      { size: '24', stock: 4 }
    ]
  },
  {
    name: 'Tenis Caminante Explorer',
    slug: 'tenis-caminante-explorer',
    category: 'Caminantes',
    description: 'Tenis con refuerzo en la punta y suela flexible, pensado para niños que ya caminan con seguridad.',
    price: 29.99,
    image_url: 'https://images.unsplash.com/photo-1600185365483-26d7a4cc7519?auto=format&fit=crop&w=600&q=80',
    sizes: [
      { size: '25', stock: 9 },
      { size: '26', stock: 0 },
      { size: '27', stock: 3 },
      { size: '28', stock: 5 }
    ]
  },
  {
    name: 'Botín Invierno Osito',
    slug: 'botin-invierno-osito',
    category: 'Botines',
    description: 'Botín forrado, cálido y cómodo, con cierre de broches para un calce seguro.',
    price: 27.0,
    image_url: 'https://images.unsplash.com/photo-1518893883800-45cd0954574b?auto=format&fit=crop&w=600&q=80',
    sizes: [
      { size: '19', stock: 4 },
      { size: '20', stock: 6 },
      { size: '21', stock: 2 }
    ]
  },
  {
    name: 'Zapatilla Bebé Algodón',
    slug: 'zapatilla-bebe-algodon',
    category: 'Bebés',
    description: 'Zapatilla súper suave de algodón para bebés que aún no caminan, ideal para mantener los pies abrigados.',
    price: 14.99,
    image_url: 'https://images.unsplash.com/photo-1522771930-78848d9293e8?auto=format&fit=crop&w=600&q=80',
    sizes: [
      { size: '15', stock: 12 },
      { size: '16', stock: 10 },
      { size: '17', stock: 8 }
    ]
  },
  {
    name: 'Sandalia Deportiva Splash',
    slug: 'sandalia-deportiva-splash',
    category: 'Sandalias',
    description: 'Sandalia deportiva resistente al agua, perfecta para la playa o la piscina.',
    price: 22.5,
    image_url: 'https://images.unsplash.com/photo-1603252109303-2751441dd157?auto=format&fit=crop&w=600&q=80',
    sizes: [
      { size: '23', stock: 6 },
      { size: '24', stock: 5 },
      { size: '25', stock: 0 }
    ]
  }
];

const insertProduct = db.prepare(`
  INSERT INTO products (name, slug, category, description, price, image_url)
  VALUES (@name, @slug, @category, @description, @price, @image_url)
`);

const insertSize = db.prepare(`
  INSERT INTO product_sizes (product_id, size, stock)
  VALUES (?, ?, ?)
`);

const clear = db.transaction(() => {
  db.exec('DELETE FROM product_sizes;');
  db.exec('DELETE FROM products;');
  db.exec("DELETE FROM sqlite_sequence WHERE name IN ('products','product_sizes');");
});

const seed = db.transaction(() => {
  clear();
  for (const p of products) {
    const info = insertProduct.run(p);
    const productId = info.lastInsertRowid;
    for (const s of p.sizes) {
      insertSize.run(productId, s.size, s.stock);
    }
  }
});

seed();

console.log(`Catálogo de ejemplo cargado: ${products.length} productos.`);
