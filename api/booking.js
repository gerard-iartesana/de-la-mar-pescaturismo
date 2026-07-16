// =============================================
// BOOKING API — Save reservation via service key
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

  const { nombre, email, telefono, modalidad, fecha, personas, mensaje, disponibilidad_id } = req.body || {};

  // Validate required fields
  if (!nombre || !email || !telefono) {
    return res.status(400).json({ error: 'Faltan campos obligatorios: nombre, email, telefono' });
  }

  // Calculate amount
  const personasNum = parseInt(personas, 10) || 1;
  let importe_cents = 0;
  if (modalidad === 'manana') {
    importe_cents = 12000 * personasNum; // 120€ × personas
  } else if (modalidad === 'tarde') {
    importe_cents = 35000; // 350€ fixed
  }

  // Init Supabase with service role key (bypasses RLS)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    const { data, error } = await supabase
      .from('reservas')
      .insert({
        nombre,
        email,
        telefono,
        personas: personasNum,
        mensaje: mensaje || '',
        estado_pago: 'pendiente',
        importe_cents,
        disponibilidad_id: disponibilidad_id || null
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Error al guardar la reserva: ' + error.message });
    }

    return res.status(200).json({ 
      success: true, 
      reserva_id: data.id,
      message: 'Reserva registrada correctamente'
    });

  } catch (err) {
    console.error('Booking error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
