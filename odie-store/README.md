# Odie & Co. — Tienda en línea

Proyecto completo en **Node.js + Express + SQLite** con:

- Catálogo de productos conectado a base de datos real (precio, tallas, stock/disponibilidad, categoría, imagen, descripción).
- Cuentas de usuario (registro / inicio de sesión) con contraseñas cifradas.
- Carrito de compras persistente, con validación de stock por talla.
- Confirmación de pedido: descuenta el stock real y guarda el pedido en la base de datos.
- Envío de correos (bienvenida al registrarse, confirmación de pedido) vía SMTP.
- Las páginas de identidad, ubicación, contacto y políticas que ya tenías, ahora integradas con el catálogo y el carrito.

## 1. Instalar

Necesitas tener [Node.js](https://nodejs.org) 18 o superior instalado en tu servidor.

```bash
npm install
```

## 2. Configurar el correo (y otras variables)

Copia el archivo de ejemplo y complétalo con tus datos:

```bash
cp .env.example .env
```

Abre `.env` y coloca:

- `SESSION_SECRET`: cualquier texto largo y aleatorio (para firmar las cookies de sesión).
- `SMTP_USER` / `SMTP_PASS`: tus credenciales de correo.

**Si usas Gmail:** no funciona con tu contraseña normal. Debes:
1. Activar la verificación en dos pasos en tu cuenta de Google.
2. Crear una "contraseña de aplicación" en https://myaccount.google.com/apppasswords
3. Usar esa contraseña de 16 caracteres como `SMTP_PASS`.

Si dejas `SMTP_USER` / `SMTP_PASS` vacíos, el sistema **no falla**: simplemente muestra el correo que habría enviado en la consola del servidor, para que puedas probar todo el flujo sin tener el correo configurado todavía.

## 3. Cargar el catálogo

El proyecto incluye 6 productos de ejemplo (ficticios) para que pruebes el flujo completo:

```bash
npm run seed
```

Esto crea el archivo `db/odie.sqlite` con las tablas y los productos de ejemplo. Puedes volver a correr este comando cuando quieras (reemplaza el catálogo, no te duplica productos).

### Cómo reemplazar los productos de ejemplo por los tuyos

Abre `db/seed.js` y edita el arreglo `products` al principio del archivo. Cada producto necesita:

```js
{
  name: 'Nombre del producto',
  slug: 'nombre-del-producto',       // usado en la URL, sin espacios ni acentos
  category: 'Categoría',
  description: 'Descripción del producto.',
  price: 25.00,
  image_url: 'https://...',          // o una ruta a una imagen en /public/img
  sizes: [
    { size: '20', stock: 10 },
    { size: '21', stock: 5 }
  ]
}
```

Luego vuelve a correr `npm run seed`.

Si prefieres cargar los productos desde un Excel/CSV en lugar de escribirlos a mano, dímelo y te preparo un script de importación.

## 4. Arrancar el servidor

```bash
npm start
```

Por defecto corre en `http://localhost:3000` (puedes cambiar el puerto con la variable `PORT` en `.env`).

## 5. Probar el flujo completo

1. Entra a `/catalogo.html`, elige un producto.
2. Selecciona talla y cantidad, agrégalo al carrito.
3. Ve a `/carrito.html`.
4. Si no tienes cuenta, el botón de "Confirmar pedido" te llevará a `/registro.html` o `/login.html`.
5. Al confirmar el pedido, se descuenta el stock real y se envía (o simula) el correo de confirmación.
6. En `/mi-cuenta.html` puedes ver tu historial de pedidos.

## Estructura del proyecto

```
odie-store/
├── server.js              punto de entrada del servidor
├── db/
│   ├── database.js         conexión y esquema de SQLite
│   └── seed.js              datos de ejemplo (edítalo con tus productos reales)
├── routes/                 endpoints de la API (auth, productos, carrito, pedidos)
├── middleware/              protección de rutas que requieren sesión
├── utils/mailer.js          envío de correos (SMTP) con plantillas
└── public/                 todo el frontend (HTML, CSS, JS)
    ├── index.html, identidad.html, ubicacion.html, contacto.html, politicas.html
    ├── catalogo.html, producto.html, carrito.html
    ├── login.html, registro.html, mi-cuenta.html, pedido-confirmado.html
    ├── css/shop.css
    └── js/ (catalogo.js, producto.js, carrito.js, cuenta.js, site.js)
```

## Desplegar a un servidor real (producción)

Este proyecto corre en cualquier hosting que soporte Node.js, por ejemplo:

- **Railway** o **Render**: conectas tu repositorio de GitHub, configuras las variables de entorno (las mismas del `.env`) en el panel, y listo.
- **Un VPS propio** (DigitalOcean, Hostinger VPS, etc.): subes el proyecto, corres `npm install`, `npm run seed` (la primera vez) y usas un gestor de procesos como `pm2` para mantenerlo corriendo:
  ```bash
  npm install -g pm2
  pm2 start server.js --name odie-store
  ```

**Importante sobre la base de datos:** SQLite guarda todo en el archivo `db/odie.sqlite`. Asegúrate de que tu hosting tenga almacenamiento persistente (no efímero) para que los pedidos y usuarios no se pierdan al reiniciar. Si tu tráfico crece mucho, se puede migrar a PostgreSQL sin rehacer la lógica de las rutas — avísame cuando llegues a ese punto.

## Qué sigue (opcional)

- Pasarela de pago real (tarjeta) — por ahora el checkout confirma el pedido sin cobro en línea.
- Panel de administración para editar productos y stock sin tocar código.
- Recuperar contraseña por correo.
- Importar catálogo desde un Excel/CSV.

Dime si quieres que avancemos con alguno de estos.
