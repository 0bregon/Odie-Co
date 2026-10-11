// Carga el catálogo de ejemplo en Supabase.
// Ejecutar con:  npm run seed
// Es SEGURO volver a correrlo: solo agrega los productos y tallas que
// todavía no existen, no borra nada ni reinicia el stock de lo ya cargado.

require('dotenv').config();
const { supabase, check } = require('./supabase');

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

async function main() {
  for (const p of products) {
    const { sizes, ...product } = p;

    // ignoreDuplicates: si el slug ya existe, no lo toca
    check(await supabase.from('products').upsert(product, { onConflict: 'slug', ignoreDuplicates: true }));

    const row = check(await supabase.from('products').select('id').eq('slug', product.slug).single());

    const sizeRows = sizes.map(s => ({ product_id: row.id, size: s.size, stock: s.stock }));
    check(await supabase.from('product_sizes').upsert(sizeRows, { onConflict: 'product_id,size', ignoreDuplicates: true }));
  }
  console.log(`Catálogo de ejemplo listo: ${products.length} productos revisados.`);
}

main().catch(err => {
  console.error('Error cargando el catálogo:', err.message || err);
  process.exit(1);
});
