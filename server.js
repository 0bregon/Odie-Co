require('dotenv').config();
const express = require('express');
const { createClient } = require('@supabase/supabase-js');
const nodemailer = require('nodemailer');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Conexión a la base de datos de Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

app.use(express.json());
app.use(cors());

// Servir los archivos estáticos de la carpeta public
app.use(express.static(path.join(__dirname, 'public')));

// Configuración de NodeMailer para enviar correos desde Gmail
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_PASS
  }
});

// --- RUTAS DE LA API ---

// 1. Obtener los productos desde Supabase
app.get('/api/productos', async (req, res) => {
  const { data, error } = await supabase
    .from('productos')
    .select('*')
    .order('id', { ascending: true });

  if (error) {
    return res.status(500).json({ error: error.message });
  }
  res.json(data);
});

// 2. Procesar la compra y enviar correo de confirmación
app.post('/api/checkout', async (req, res) => {
  const { email, cliente, carrito, total } = req.body;

  if (!carrito || carrito.length === 0) {
    return res.status(400).json({ message: 'El carrito está vacío.' });
  }

  // Crear la lista de productos para el correo
  const detallePedido = carrito.map(item => 
    `<li><b>${item.nombre}</b> (Talla: ${item.tallaSeleccionada}) - Cantidad: ${item.cantidad} x $${Number(item.precio).toFixed(2)}</li>`
  ).join('');

  const mailOptions = {
    from: `"Odie & Co. Zapatitos" <${process.env.GMAIL_USER}>`,
    to: email,
    subject: 'Confirmación de Compra - Odie & Co.',
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h2>¡Gracias por tu compra, ${cliente}!</h2>
        <p>Hemos recibido tu pedido de calzado infantil y lo estamos preparando con mucho cariño.</p>
        <h3>Resumen de tu pedido:</h3>
        <ul>${detallePedido}</ul>
        <p><b>Total Pagado: $${Number(total).toFixed(2)}</b></p>
        <hr>
        <p><small>Odie & Co. - Especialistas en Calzado Infantil</small></p>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Error enviando correo:', error);
      return res.status(500).json({ message: 'Error al enviar el correo de confirmación.' });
    }
    res.json({ message: '¡Compra realizada con éxito! Revisa tu correo electrónico para la confirmación.' });
  });
});

// Iniciar el servidor
app.listen(PORT, () => {
  console.log(`Servidor de Odie & Co. corriendo en: http://localhost:${PORT}`);
});
