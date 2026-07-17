function generateOrderId() {
  const now = Date.now().toString();
  // Take last 5 digits of timestamp for uniqueness
  const timestampPart = now.slice(-5);
  // 4-digit zero-padded sequence from timestamp middle section
  const digitPrefix = now.slice(-9, -5);
  // Result: 4 digits + "PES" + 5 digits = 12 chars
  return `${digitPrefix}PES${timestampPart}`;
}

async function sendEmailConfirmation({ email, nombre, localizador, modalidad, fecha, personas, importe_cents }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.log('[Email] No RESEND_API_KEY found, skipping email confirmation.');
    return;
  }

  const fromEmail = process.env.EMAIL_FROM || 'onboarding@resend.dev';
  const siteUrl = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : process.env.SITE_URL || 'https://delamarasataula.com';

  const modLabel = modalidad === 'manana' ? 'Amanecer y pesca (Mañana)' : 'Demostración al atardecer (Tarde)';
  const totalEur = (importe_cents / 100).toFixed(2);

  const htmlContent = `
    <div style="font-family: 'DM Sans', Arial, sans-serif; color: #1a2d40; max-width: 600px; margin: 0 auto; padding: 20px; background: #f5f0e8; border-radius: 12px; border: 1px solid #d4c9b8;">
      <h2 style="font-family: 'DM Serif Display', serif; color: #0b1d2e; border-bottom: 2px solid #c97b3a; padding-bottom: 10px; margin-top: 0;">¡Hola ${nombre}!</h2>
      <p style="font-size: 1.05rem; line-height: 1.5;">Gracias por tu reserva en <strong>De la Mar a sa Taula</strong>.</p>
      <p style="font-size: 1.05rem; line-height: 1.5;">Hemos registrado tu solicitud correctamente. Estos son los detalles:</p>
      
      <div style="background: #ffffff; border-radius: 8px; padding: 15px; margin: 20px 0; border: 1px solid #ccc3b3; box-shadow: 0 4px 6px rgba(0,0,0,0.02);">
        <table style="width: 100%; border-collapse: collapse;">
          <tr style="border-bottom: 1px solid #f0ede6;">
            <td style="padding: 8px 0; font-weight: bold; color: #5a6a78;">Localizador (Nº Reserva)</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #c97b3a; font-size: 1.1rem;">${localizador}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f0ede6;">
            <td style="padding: 8px 0; font-weight: bold; color: #5a6a78;">Modalidad</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${modLabel}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f0ede6;">
            <td style="padding: 8px 0; font-weight: bold; color: #5a6a78;">Fecha</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${fecha}</td>
          </tr>
          <tr style="border-bottom: 1px solid #f0ede6;">
            <td style="padding: 8px 0; font-weight: bold; color: #5a6a78;">Personas</td>
            <td style="padding: 8px 0; text-align: right; font-weight: bold;">${personas}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; font-weight: bold; color: #5a6a78;">Importe Total</td>
            <td style="padding: 8px 0; text-align: right; font-weight: 800; color: #1a2d40; font-size: 1.05rem;">${totalEur} €</td>
          </tr>
        </table>
      </div>

      <p style="font-size: 1rem; line-height: 1.5; margin-bottom: 25px;">
        Tu reserva está en estado <strong>Pendiente de confirmación</strong>. Nos pondremos en contacto contigo por teléfono o email para confirmarte los detalles finales de la salida.
      </p>

      <div style="text-align: center; margin: 30px 0;">
        <a href="${siteUrl}/api/payment/init?amount=${importe_cents}&order=${localizador}" 
           style="background: #c97b3a; color: #ffffff; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 1.05rem; display: inline-block; box-shadow: 0 4px 10px rgba(201,123,58,0.3);">
          Pagar Reserva Online
        </a>
      </div>

      <p style="font-size: 0.9rem; color: #5a6a78; line-height: 1.4; border-top: 1px solid #ccc3b3; padding-top: 15px; margin-top: 25px;">
        Si tienes cualquier duda, puedes responder a este correo o contactarnos directamente. ¡Esperamos verte pronto a bordo!<br><br>
        <strong>El equipo de De la Mar a sa Taula</strong>
      </p>
    </div>
  `;

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [email],
        subject: `Confirmación de tu reserva ${localizador} - De la Mar a sa Taula`,
        html: htmlContent
      })
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Email] Resend API error:', errText);
    } else {
      console.log('[Email] Confirmation email sent successfully to', email);
    }
  } catch (err) {
    console.error('[Email] Failed to send email via Resend:', err);
  }
}

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
    importe_cents = 35000 * personasNum; // 350€ × personas
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

    // Generate Redsys-compliant order ID (localizador)
    const localizador = generateOrderId();

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
        disponibilidad_id: dispId,
        redsys_order: localizador
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
      }
    }

    // --- Step 4: Send optional confirmation email (async) ---
    sendEmailConfirmation({
      email,
      nombre,
      localizador,
      modalidad: mod,
      fecha,
      personas: personasNum,
      importe_cents
    }).catch(mailErr => console.error('[Email] Async mail failed:', mailErr));

    return res.status(200).json({
      success: true,
      reserva_id: data.id,
      redsys_order: localizador,
      disponibilidad_id: dispId,
      message: 'Reserva registrada correctamente'
    });

  } catch (err) {
    console.error('Booking error:', err.message, err.stack);
    return res.status(500).json({ error: 'Error interno del servidor: ' + (err.message || 'desconocido') });
  }
};
