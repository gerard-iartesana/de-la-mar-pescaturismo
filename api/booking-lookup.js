// =============================================
// BOOKING LOOKUP API — Fetch reservation details
// =============================================

const { createClient } = require('@supabase/supabase-js');

module.exports = async function handler(req, res) {
  // CORS
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { order, email } = req.body || {};

  if (!order || !email) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: localizador, email' });
  }

  // Init Supabase with service role key (bypasses RLS)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { data: reserva, error } = await supabase
      .from('reservas')
      .select('*, disponibilidad(fecha)')
      .eq('redsys_order', order.trim())
      .ilike('email', email.trim().toLowerCase())
      .maybeSingle();

    if (error) {
      console.error('Supabase query error:', error);
      return res.status(500).json({ error: 'Error al consultar la reserva' });
    }

    if (!reserva) {
      return res.status(404).json({ error: 'No se encontró ninguna reserva con ese localizador y email' });
    }

    return res.status(200).json({
      success: true,
      reserva: {
        nombre: reserva.nombre,
        email: reserva.email,
        telefono: reserva.telefono,
        personas: reserva.personas,
        modalidad: reserva.modalidad || (reserva.disponibilidad ? reserva.disponibilidad.modalidad : 'manana'),
        fecha: reserva.disponibilidad ? reserva.disponibilidad.fecha : null,
        estado_pago: reserva.estado_pago,
        importe_cents: reserva.importe_cents,
        localizador: reserva.redsys_order
      }
    });

  } catch (err) {
    console.error('Lookup error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
