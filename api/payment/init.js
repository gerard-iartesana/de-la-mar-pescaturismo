const { createRedsysAPI, SANDBOX_URLS, PRODUCTION_URLS } = require('redsys-easy');
const { createClient } = require('@supabase/supabase-js');

const REDSYS_SECRET_KEY = (process.env.REDSYS_SECRET_KEY || '').trim();
const REDSYS_MERCHANT_CODE = (process.env.REDSYS_MERCHANT_CODE || '').trim();
const REDSYS_TERMINAL = (process.env.REDSYS_TERMINAL || '').trim();
const REDSYS_ENV = (process.env.REDSYS_ENV || 'test').trim();

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
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0');

  // Accept GET (from "Pagar ahora" button) and POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' });
  }

  try {
    // Read params from query (GET) or body (POST)
    const params = req.method === 'GET' ? req.query : req.body;
    const { amount, order, reserva_id, modalidad, personas, nombre, email, telefono, mensaje, disponibilidad_id } = params;

    let finalAmount, finalOrder;

    if (amount && order) {
      // --- Simple GET flow from "Pagar ahora" button ---
      finalAmount = String(amount);
      finalOrder = order;
    } else if (modalidad && personas && nombre && email) {
      // --- Full POST flow from booking ---
      if (modalidad === 'manana') {
        finalAmount = String(12000 * Number(personas));
      } else if (modalidad === 'tarde') {
        finalAmount = String(35000 * Number(personas));
      } else {
        return res.status(400).json({ error: 'Modalidad no válida' });
      }
      finalOrder = generateOrderId();

      // Save reservation to Supabase
      const { error: dbError } = await supabase.from('reservas').insert({
        redsys_order: finalOrder,
        nombre,
        email,
        telefono: telefono || null,
        mensaje: mensaje || null,
        personas: Number(personas),
        disponibilidad_id: disponibilidad_id || null,
        importe_cents: Number(finalAmount),
        estado_pago: 'pendiente',
      });

      if (dbError) {
        console.error('Supabase insert error:', dbError);
        return res.status(500).json({ error: 'Error al guardar la reserva' });
      }
    } else {
      return res.status(400).json({ error: 'Faltan parámetros: amount+order o modalidad+personas+nombre+email' });
    }

    // --- Determine site URL ---
    const siteUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.SITE_URL || 'https://delamarasataula.com';

    // --- Build Redsys merchant parameters ---
    const merchantParams = {
      DS_MERCHANT_AMOUNT: finalAmount,
      DS_MERCHANT_ORDER: finalOrder,
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

    // --- Determine Redsys payment URL ---
    const redsysUrl =
      REDSYS_ENV === 'production'
        ? 'https://sis.redsys.es/sis/realizarPago'
        : 'https://sis-t.redsys.es:25443/sis/realizarPago';

    if (req.method === 'GET') {
      // Auto-submit HTML form — redirects user to Redsys
      res.setHeader('Content-Type', 'text/html');
      return res.status(200).send(`<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Redirigiendo al pago...</title>
<style>body{font-family:'DM Sans',sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;background:#f5f0e8;color:#1a2d40;}
.loader{text-align:center}.spinner{width:40px;height:40px;border:4px solid #d4c9b8;border-top:4px solid #c97b3a;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 16px}
@keyframes spin{to{transform:rotate(360deg)}}</style></head>
<body><div class="loader"><div class="spinner"></div><p>Redirigiendo a la pasarela de pago...</p></div>
<form id="redsys" action="${redsysUrl}" method="POST">
<input type="hidden" name="Ds_SignatureVersion" value="${form.Ds_SignatureVersion}">
<input type="hidden" name="Ds_MerchantParameters" value="${form.Ds_MerchantParameters}">
<input type="hidden" name="Ds_Signature" value="${form.Ds_Signature}">
</form><script>document.getElementById('redsys').submit();</script></body></html>`);
    }

    // POST response — return JSON
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
