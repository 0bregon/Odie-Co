// Conexión a Supabase desde el SERVIDOR.
// Usa la clave service_role: tiene acceso total, por eso vive solo en
// el servidor (variables de entorno) y nunca se envía al navegador.

const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !key) {
  console.error('Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en el archivo .env');
  process.exit(1);
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false }
});

// Si Supabase devuelve un error, lo lanzamos para que lo atrape el manejador global.
function check({ data, error }) {
  if (error) throw error;
  return data;
}

module.exports = { supabase, check };
