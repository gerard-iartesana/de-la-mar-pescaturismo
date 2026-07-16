const { createRedsysAPI, SANDBOX_URLS, PRODUCTION_URLS } = require('redsys-easy');
const { createClient } = require('@supabase/supabase-js');

const REDSYS_SECRET_KEY = process.env.REDSYS_SECRET_KEY;
const REDSYS_MERCHANT_CODE = process.env.REDSYS_MERCHANT_CODE;
const REDSYS_TERMINAL = process.env.REDSYS_TERMINAL;
const REDSYS_ENV = process.env.REDSYS_ENV || 'test';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const { createRedirectForm } = createRedsysAPI({
  secretKey: REDSYS_SECRET_KEY,
  urls: REDSYS_ENV === 'production' ? PRODUCTION_URLS : SANDBOX_URLS,
});

/**
 * Generate a unique Redsys-compliant order ID.
 * First 4 chars must be digits, max 12 chars total.
 * Format: 0000PESttttt (4 digits + PES + 5 timestamp chars)
 */
function generateOrderId() {
  const now = Date.now().toString();
  // Take last 5 digits of timestamp for uniqueness
  const timestampPart = now.slice(-5);
  // 4-digit zero-padded sequence from timestamp middle section
  const digitPrefix = now.slice(-9, -5);
  // Result: 4 digits + "PES" + 5 digits = 12 chars
  return `${digitPrefix}PES${timestampPart}`;
}

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    const { modalidad, personas, nombre, email, telefono, mensaje, disponibilidad_id } = req.body;

    // --- Validate required fields ---
    if (!modalidad || !personas || !nombre || !email || !disponibilidad_id) {
      return res.status(400).json({ error: 'Faltan campos obligatorios' });
    }

    // --- Calculate amount in cents ---
    let amount;
    if (modalidad === 'manana') {
      amount = 12000 * Number(personas); // 120€ per person
    } else if (modalidad === 'tarde') {
      amount = 35000; // 350€ fixed per boat
    } else {
      return res.status(400).json({ error: 'Modalidad no válida' });
    }

    // --- Generate order ID ---
    const orderId = generateOrderId();

    // --- Determine site URL ---
    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.SITE_URL || 'https://delamarasataula.com';

    // --- Build Redsys merchant parameters ---
    const merchantParams = {
      DS_MERCHANT_AMOUNT: String(amount),
      DS_MERCHANT_ORDER: orderId,
      DS_MERCHANT_MERCHANTCODE: REDSYS_MERCHANT_CODE,
      DS_MERCHANT_TERMINAL: REDSYS_TERMINAL,
      DS_MERCHANT_CURRENCY: '978',
      DS_MERCHANT_TRANSACTIONTYPE: '0',
      DS_MERCHANT_PAYMETHODS: 'zC',
      DS_MERCHANT_URLOK: `${siteUrl}/success.html`,
      DS_MERCHANT_URLKO: `${siteUrl}/error.html`,
      DS_MERCHANT_MERCHANTURL: `${siteUrl}/api/payment/notification`,
      DS_MERCHANT_MERCHANTNAME: 'De la Mar a sa Taula',
      DS_MERCHANT_CONSUMERLANGUAGE: '001',
    };

    // --- Create signed Redsys form ---
    const form = createRedirectForm(merchantParams);

    // --- Save reservation to Supabase ---
    const { error: dbError } = await supabase.from('reservas').insert({
      order_id: orderId,
      modalidad,
      personas: Number(personas),
      nombre,
      email,
      telefono: telefono || null,
      mensaje: mensaje || null,
      disponibilidad_id,
      importe: amount,
      estado_pago: 'pendiente',
      created_at: new Date().toISOString(),
    });

    if (dbError) {
      console.error('Supabase insert error:', dbError);
      return res.status(500).json({ error: 'Error al guardar la reserva' });
    }

    // --- Determine Redsys payment URL ---
    const redsysUrl =
      REDSYS_ENV === 'production'
        ? 'https://sis.redsys.es/sis/realizarPago'
        : 'https://sis-t.redsys.es:25443/sis/realizarPago';

    // --- Return form data for client-side redirect ---
    return res.status(200).json({
      url: redsysUrl,
      Ds_SignatureVersion: form.Ds_SignatureVersion,
      Ds_MerchantParameters: form.Ds_MerchantParameters,
      Ds_Signature: form.Ds_Signature,
    });
  } catch (err) {
    console.error('Payment init error:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};
