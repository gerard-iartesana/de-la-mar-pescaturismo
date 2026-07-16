// =============================================
// BOOKING API — Save reservation via service key
// Automatically creates disponibilidad if needed
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
  const mod = modalidad || 'manana';
  let importe_cents = 0;
  if (mod === 'manana') {
    importe_cents = 12000 * personasNum; // 120€ × personas
  } else if (mod === 'tarde') {
    importe_cents = 35000; // 350€ fixed
  }

  // Init Supabase with service role key (bypasses RLS)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
  );

  try {
    // --- Step 1: Resolve disponibilidad ---
    let dispId = disponibilidad_id || null;

    if (!dispId && fecha) {
      // Check if a disponibilidad entry already exists for this date + modalidad
      const { data: existing } = await supabase
        .from('disponibilidad')
        .select('id, plazas_reservadas')
        .eq('fecha', fecha)
        .eq('modalidad', mod)
        .maybeSingle();

      if (existing) {
        dispId = existing.id;
      } else {
        // Create a new disponibilidad entry for this date
        const { data: newDisp, error: dispError } = await supabase
          .from('disponibilidad')
          .insert({
            fecha: fecha,
            modalidad: mod,
            plazas_totales: mod === 'manana' ? 6 : 10,
            plazas_reservadas: 0,
            estado: 'disponible'
          })
          .select()
          .single();

        if (dispError) {
          console.error('Error creating disponibilidad:', dispError);
          // Continue without disponibilidad — don't block the booking
        } else {
          dispId = newDisp.id;
        }
      }
    }

    // --- Step 2: Insert reservation ---
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
        disponibilidad_id: dispId
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase insert error:', error);
      return res.status(500).json({ error: 'Error al guardar la reserva: ' + error.message });
    }

    // --- Step 3: Update plazas_reservadas ---
    if (dispId) {
      try {
        const { data: d } = await supabase
          .from('disponibilidad')
          .select('plazas_reservadas')
          .eq('id', dispId)
          .single();

        if (d) {
          await supabase
            .from('disponibilidad')
            .update({ plazas_reservadas: (d.plazas_reservadas || 0) + personasNum })
            .eq('id', dispId);
        }
      } catch (updateErr) {
        console.error('Error updating plazas:', updateErr);
        // Don't block the booking response
      }
    }

    return res.status(200).json({
      success: true,
      reserva_id: data.id,
      disponibilidad_id: dispId,
      message: 'Reserva registrada correctamente'
    });

  } catch (err) {
    console.error('Booking error:', err.message, err.stack);
    return res.status(500).json({ error: 'Error interno del servidor: ' + (err.message || 'desconocido') });
  }
};
