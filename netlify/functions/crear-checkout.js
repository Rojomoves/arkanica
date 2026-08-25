const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { packId, packName, priceInCents, crystalsAmount, username } = JSON.parse(event.body);

    // Crear sesión de pago en Stripe
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: `Pack de Cristales: ${packName} (${crystalsAmount} Cristales)`,
            },
            unit_amount: priceInCents, // Ej: 3.99€ -> 399
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.URL}/personalizada/personalizada.html?pagado=true&cristales=${crystalsAmount}&user=${encodeURIComponent(username)}`,
      cancel_url: `${process.env.URL}/personalizada/personalizada.html?cancelado=true`,
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};