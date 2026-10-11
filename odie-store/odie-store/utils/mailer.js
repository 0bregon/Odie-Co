// Envío de correos vía SMTP (Gmail u otro proveedor).
// Si no hay credenciales en .env, los correos NO se envían: se muestran
// en la consola del servidor, para poder probar el flujo sin configurarlo.

const nodemailer = require('nodemailer');

const SMTP_USER = process.env.SMTP_USER || process.env.GMAIL_USER;
const SMTP_PASS = process.env.SMTP_PASS || process.env.GMAIL_PASS;

let transporter = null;

if (SMTP_USER && SMTP_PASS) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  });
}

// Evita que un nombre como "<script>" se inserte como HTML en el correo.
function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const money = (n) => `$${Number(n).toFixed(2)}`;

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.log('--- [SIMULACIÓN DE CORREO] ---');
    console.log('Para:', to);
    console.log('Asunto:', subject);
    console.log('Contenido:', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('(No se envió un correo real: faltan SMTP_USER / SMTP_PASS en .env)');
    return { simulated: true };
  }

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || SMTP_USER,
    to,
    subject,
    html
  });

  return { simulated: false, messageId: info.messageId };
}

function welcomeEmailHtml(name) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color:#77764f;">¡Bienvenido/a a Odie &amp; Co., ${esc(name)}!</h2>
      <p>Tu cuenta se creó correctamente. Ya puedes iniciar sesión y empezar a comprar calzado infantil cómodo y de calidad para tus pequeños.</p>
      <p style="color:#77776f; font-size: 13px;">Si tú no creaste esta cuenta, puedes ignorar este correo.</p>
    </div>
  `;
}

function orderConfirmationHtml({ name, order, items }) {
  const rows = items.map(it => `
    <tr>
      <td style="padding:8px; border-bottom:1px solid #e8e5dd;">${esc(it.product_name)}</td>
      <td style="padding:8px; border-bottom:1px solid #e8e5dd; text-align:center;">${esc(it.size)}</td>
      <td style="padding:8px; border-bottom:1px solid #e8e5dd; text-align:center;">${esc(it.quantity)}</td>
      <td style="padding:8px; border-bottom:1px solid #e8e5dd; text-align:right;">${money(it.unit_price)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
      <h2 style="color:#77764f;">¡Gracias por tu compra, ${esc(name)}!</h2>
      <p>Confirmamos tu pedido <strong>#${esc(order.id)}</strong>.</p>
      <table style="width:100%; border-collapse: collapse; margin-top:12px;">
        <thead>
          <tr style="background:#e8e7d5;">
            <th style="padding:8px; text-align:left;">Producto</th>
            <th style="padding:8px;">Talla</th>
            <th style="padding:8px;">Cant.</th>
            <th style="padding:8px; text-align:right;">Precio</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="text-align:right; font-size: 16px; margin-top:12px;">
        <strong>Total: ${money(order.total)}</strong>
      </p>
      <p style="color:#77776f; font-size: 13px;">Si tienes alguna duda sobre tu pedido, escríbenos respondiendo este correo.</p>
    </div>
  `;
}

module.exports = { sendMail, welcomeEmailHtml, orderConfirmationHtml };
