const { createClient } = require('@supabase/supabase-js');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Inicializar Supabase con la Service Role Key (privada del servidor)
const supabaseAdmin = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Es crucial desactivar el body parser predeterminado para validar la firma de Stripe
exports.config = {
  path: "/.netlify/functions/stripe-webhook",
  // Netlify por defecto procesa JSON, necesitamos el buffer crudo para Stripe
};

module.exports.handler = async (event) => {
  const sig = event.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let stripeEvent;

  try {
    // Si usas Netlify Functions estándar, el evento viene en string. 
    // Asegúrate de pasar el body crudo (rawBody) si tu framework lo requiere.
    stripeEvent = stripe.webhooks.constructEvent(event.body, sig, webhookSecret);
  } catch (err) {
    console.error(`⚠️ Error de firma en Webhook: ${err.message}`);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  // Manejar el evento de pago exitoso
  if (stripeEvent.type === 'checkout.session.completed') {
    const session = stripeEvent.data.object;
    
    const customerEmail = session.customer_details?.email || session.metadata?.email;
    const packId = session.metadata?.packId || session.client_reference_id;

    console.log(`💰 Pago completado con éxito para: ${customerEmail}, Producto: ${packId}`);

    // Si el producto comprado es el pase de comunidad
    if (packId === 'community_pass' || session.amount_total === 390) {
      try {
        // 1. Buscar si el usuario ya existe en Supabase por email
        const { data: users, error: searchError } = await supabaseAdmin
          .from('profiles')
          .select('id')
          .eq('email', customerEmail); // O usa auth.admin si manejas los IDs directamente

        if (users && users.length > 0) {
          const userId = users[0].id;
          
          // 2. Actualizar el estado de miembro en la base de datos
          await supabaseAdmin
            .from('profiles')
            .update({ is_member: true })
            .eq('id', userId);
            
          console.log(`✅ Acceso a comunidad concedido en BD para usuario ID: ${userId}`);
        } else {
          console.log(`ℹ️ El usuario ${customerEmail} pagó pero no tiene cuenta registrada previa en profiles.`);
          // Aquí puedes programar el envío de un correo automático (ej: usando Resend o SendGrid) 
          // con un enlace para que cree su cuenta y reclame su acceso.
        }
      } catch (dbErr) {
        console.error("❌ Error actualizando Supabase desde el Webhook:", dbErr);
      }
    }
  }

  return { statusCode: 200, body: JSON.stringify({ received: true }) };
};