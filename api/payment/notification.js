const { createRedsysAPI, SANDBOX_URLS, PRODUCTION_URLS } = require('redsys-easy');
const { createClient } = require('@supabase/supabase-js');
const querystring = require('querystring');

const REDSYS_SECRET_KEY = (process.env.REDSYS_SECRET_KEY || '').trim();
const REDSYS_ENV = (process.env.REDSYS_ENV || 'test').trim();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const { processRedirectNotification } = createRedsysAPI({
  secretKey: REDSYS_SECRET_KEY,
  urls: REDSYS_ENV === 'production' ? PRODUCTION_URLS : SANDBOX_URLS,
});

/**
 * Parse raw body as URL-encoded form data.
 * Vercel may not auto-parse application/x-www-form-urlencoded for
 * serverless functions, so we handle it manually when needed.
 */
function parseBody(req) {
  return new Promise((resolve, reject) => {
    // If Vercel already parsed the body, use it directly
    if (req.body && typeof req.body === 'object' && req.body.Ds_MerchantParameters) {
      return resolve(req.body);
    }

    // If body is a string (raw), parse it
    if (req.body && typeof req.body === 'string') {
      return resolve(querystring.parse(req.body));
    }

    // Otherwise read the raw stream
    let data = '';
    req.on('data', (chunk) => {
      data += chunk.toString();
    });
    req.on('end', () => {
      resolve(querystring.parse(data));
    });
    req.on('error', reject);
  });
}

module.exports = async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).send('Método no permitido');
  }

  try {
    // --- Parse URL-encoded body from Redsys ---
    const body = await parseBody(req);

    const { Ds_SignatureVersion, Ds_MerchantParameters, Ds_Signature } = body;

    if (!Ds_SignatureVersion || !Ds_MerchantParameters || !Ds_Signature) {
      console.error('Missing Redsys parameters in notification body');
      return res.status(400).send('Parámetros incompletos');
    }

    // --- Verify signature and decode parameters ---
    let params;
    try {
      params = processRedirectNotification({
        Ds_SignatureVersion,
        Ds_MerchantParameters,
        Ds_Signature,
      });
    } catch (signatureError) {
      console.error('Redsys signature verification failed:', signatureError);
      return res.status(403).send('Firma no válida');
    }

    const orderId = params.Ds_Order;
    const responseCode = parseInt(params.Ds_Response, 10);

    console.log(`Notification received — Order: ${orderId}, Response: ${responseCode}`);

    // --- Check if payment was successful (response code 0-99) ---
    if (responseCode >= 0 && responseCode < 100) {
      // Payment successful: update reservation status
      const { error: updateError } = await supabase
        .from('reservas')
        .update({
          estado_pago: 'pagado',
          ds_response: String(responseCode),
          ds_authorisation_code: params.Ds_AuthorisationCode || null,
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);

      if (updateError) {
        console.error('Error updating reserva:', updateError);
        return res.status(500).send('Error actualizando reserva');
      }

      // Fetch the reservation to get disponibilidad_id and personas
      const { data: reserva, error: fetchError } = await supabase
        .from('reservas')
        .select('disponibilidad_id, personas')
        .eq('order_id', orderId)
        .single();

      if (fetchError) {
        console.error('Error fetching reserva:', fetchError);
        return res.status(500).send('Error obteniendo reserva');
      }

      // Update plazas_reservadas in disponibilidad
      if (reserva && reserva.disponibilidad_id) {
        const { error: plazasError } = await supabase.rpc('incrementar_plazas', {
          p_disponibilidad_id: reserva.disponibilidad_id,
          p_cantidad: reserva.personas,
        });

        // Fallback: if the RPC doesn't exist, do a manual update
        if (plazasError) {
          console.warn('RPC incrementar_plazas failed, using manual update:', plazasError);

          const { data: dispo, error: dispoFetchError } = await supabase
            .from('disponibilidad')
            .select('plazas_reservadas')
            .eq('id', reserva.disponibilidad_id)
            .single();

          if (!dispoFetchError && dispo) {
            await supabase
              .from('disponibilidad')
              .update({
                plazas_reservadas: (dispo.plazas_reservadas || 0) + reserva.personas,
              })
              .eq('id', reserva.disponibilidad_id);
          }
        }
      }

      console.log(`Payment confirmed for order ${orderId}`);
    } else {
      // Payment failed or rejected
      await supabase
        .from('reservas')
        .update({
          estado_pago: 'rechazado',
          ds_response: String(responseCode),
          updated_at: new Date().toISOString(),
        })
        .eq('order_id', orderId);

      console.log(`Payment rejected for order ${orderId} — code: ${responseCode}`);
    }

    // Always return 200 to Redsys to acknowledge receipt
    return res.status(200).send('OK');
  } catch (err) {
    console.error('Notification handler error:', err);
    // Return 200 anyway to prevent Redsys from retrying indefinitely
    return res.status(200).send('OK');
  }
};
