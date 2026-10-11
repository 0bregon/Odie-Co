// Envío de correos vía SMTP (Gmail, o cualquier otro proveedor que uses).
// Si no se han configurado SMTP_USER / SMTP_PASS en el archivo .env,
// los correos no se envían de verdad: solo se muestran en la consola,
// para que puedas probar todo el flujo sin tener credenciales todavía.

const nodemailer = require('nodemailer');

const hasCredentials = Boolean(process.env.SMTP_USER && process.env.SMTP_PASS);

let transporter = null;

if (hasCredentials) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 465),
    secure: process.env.SMTP_SECURE !== 'false',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
}

async function sendMail({ to, subject, html }) {
  if (!transporter) {
    console.log('--- [SIMULACIÓN DE CORREO] ---');
    console.log('Para:', to);
    console.log('Asunto:', subject);
    console.log('Contenido:', html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
    console.log('--------------------------------');
    console.log('(No se envió un correo real: faltan SMTP_USER / SMTP_PASS en .env)');
    return { simulated: true };
  }

  const info = await transporter.sendMail({
    from: process.env.MAIL_FROM || process.env.SMTP_USER,
    to,
    subject,
    html
  });

  return { simulated: false, messageId: info.messageId };
}

function welcomeEmailHtml(name) {
  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: auto;">
      <h2 style="color:#77764f;">¡Bienvenido/a a Odie & Co., ${name}!</h2>
      <p>Tu cuenta se creó correctamente. Ya puedes iniciar sesión y empezar a comprar calzado infantil cómodo y de calidad para tus pequeños.</p>
      <p style="color:#77776f; font-size: 13px;">Si tú no creaste esta cuenta, puedes ignorar este correo.</p>
    </div>
  `;
}

function orderConfirmationHtml({ name, order, items }) {
  const rows = items.map(it => `
    <tr>
      <td style="padding:8px; border-bottom:1px solid #e8e5dd;">${it.product_name}</td>
      <td style="padding:8px; border-bottom:1px solid #e8e5dd; text-align:center;">${it.size}</td>
      <td style="padding:8px; border-bottom:1px solid #e8e5dd; text-align:center;">${it.quantity}</td>
      <td style="padding:8px; border-bottom:1px solid #e8e5dd; text-align:right;">$${it.unit_price.toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <div style="font-family: Arial, sans-serif; max-width: 560px; margin: auto;">
      <h2 style="color:#77764f;">¡Gracias por tu compra, ${name}!</h2>
      <p>Confirmamos tu pedido <strong>#${order.id}</strong>.</p>
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
        <strong>Total: $${order.total.toFixed(2)}</strong>
      </p>
      <p style="color:#77776f; font-size: 13px;">Si tienes alguna duda sobre tu pedido, escríbenos respondiendo este correo o usando el chat de ayuda en la tienda.</p>
    </div>
  `;
}

module.exports = { sendMail, welcomeEmailHtml, orderConfirmationHtml };
