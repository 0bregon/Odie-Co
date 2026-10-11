# Odie & Co. — Tienda en línea

Node.js + Express + **Supabase (Postgres)**. Catálogo, cuentas, carrito, pedidos con control de stock y correos.

## Puesta en marcha (primera vez)

### 1. Crear las tablas en Supabase
1. Entra a tu proyecto en [supabase.com](https://supabase.com).
2. Menú **SQL Editor → New query**.
3. Abre `db/schema.sql`, copia **todo**, pégalo y pulsa **Run**.

### 2. Copiar las claves
En Supabase: **Project Settings → API**.
- `Project URL` → `SUPABASE_URL`
- Clave **secret / service_role** → `SUPABASE_SERVICE_ROLE_KEY`

> La service_role es secreta: solo va en tu `.env` y en las variables del hosting. Nunca en GitHub ni en archivos del `public/`.

### 3. Crear tu `.env`
```bash
cp .env.example .env
```
Llénalo. Para `SESSION_SECRET` genera uno con:
```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
```
Gmail: usa una **contraseña de aplicación** (https://myaccount.google.com/apppasswords), no tu contraseña normal.
Si dejas `SMTP_USER`/`SMTP_PASS` vacíos, los correos se muestran en la consola (modo prueba).

### 4. Instalar, cargar productos y arrancar
```bash
npm install
npm run seed     # carga los productos de ejemplo (se puede repetir sin duplicar)
npm start        # http://localhost:3000
```

## Estructura
```
server.js              arranque, sesión, límites de intentos
db/schema.sql          tablas + seguridad (RLS) + función de compra atómica
db/supabase.js         conexión a Supabase (solo servidor)
db/seed.js             productos de ejemplo
routes/                API: auth, products, cart, orders
middleware/            requireAuth, asyncHandler
utils/mailer.js        correos
public/                frontend (HTML, css/, js/)
```

## Cambiar los productos
Edita el arreglo `products` en `db/seed.js` y corre `npm run seed`. Los productos que ya existen (mismo `slug`) no se tocan; para editar stock o precios de uno existente, hazlo en Supabase → **Table Editor**.

## Desplegar (Render, Railway, etc.)
Conecta el repo y define estas variables en el panel: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SESSION_SECRET`, `NODE_ENV=production`, y las `SMTP_*`. Comando de inicio: `npm start`.
Como la base ahora vive en Supabase y la sesión en una cookie, ya no importa si el hosting borra el disco.

## Seguridad
- Todas las tablas tienen RLS activado sin políticas: la clave pública no puede leer nada.
- La compra se ejecuta en una sola transacción (`checkout_order`): no se vende más stock del que hay.
- Nunca subas `.env` al repositorio.

## Pendiente (ideas)
Pasarela de pago real, panel de administración, recuperar contraseña por correo.
