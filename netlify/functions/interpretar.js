// Archivo: netlify/functions/interpretar.js

exports.handler = async function(event, context) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: JSON.stringify({ error: "Método no permitido" }) };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return { statusCode: 500, body: JSON.stringify({ error: "CRÍTICO: GEMINI_API_KEY no está definida en Netlify." }) };
    }

    const bodyData = JSON.parse(event.body);
    const { spreadTitle, cards } = bodyData;

    const cardsText = cards.map((c, i) => `Pos ${i+1}: ${c.name} (${c.archetype})`).join('\n');
    
    const prompt = `Actúa como maestro de tarot. Analiza esta tirada de "${spreadTitle}":\n${cardsText}\nEscribe una síntesis profunda en un solo bloque de texto con etiquetas <p>.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
    const apiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const resultJson = await apiResponse.json();

    // Si Google nos devuelve un error, lo atrapamos y lo devolvemos con pelos y señales
    if (!apiResponse.ok) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: "Google Error: " + JSON.stringify(resultJson) })
      };
    }

    const text = resultJson.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interpretacion: text })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ error: "Catch interno: " + err.message })
    };
  }
};