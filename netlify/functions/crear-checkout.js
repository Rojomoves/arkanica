const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { packId, packName, priceInCents, crystalsAmount, username } = JSON.parse(event.body);

    const isCommunity = packName.includes('Comunidad');
    const productName = isCommunity 
      ? `Acceso a la Comunidad Privada VIP Arkanica` 
      : `Pack de Cristales: ${packName} (${crystalsAmount} Cristales)`;

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price_data: {
            currency: 'eur',
            product_data: {
              name: productName,
            },
            unit_amount: priceInCents, // Ej: 8.90€ -> 890, 9.99€ -> 999
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      success_url: `${process.env.URL}/ente-superior.html?pagado=true&cristales=${crystalsAmount}&comunidad=${isCommunity ? 'true' : 'false'}&user=${encodeURIComponent(username)}`,
      cancel_url: `${process.env.URL}/ente-superior.html?cancelado=true`,
      metadata: {
        username: username,
        crystals: crystalsAmount,
        isCommunityPass: isCommunity ? 'true' : 'false'
      }
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