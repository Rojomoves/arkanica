exports.handler = async function(event, context) {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Content-Type": "application/json"
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: "Método no permitido" }) 
    };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      throw new Error("Falta la variable GEMINI_API_KEY en Netlify.");
    }

    let bodyData = JSON.parse(event.body || "{}");
    const { spreadTitle, cards, customQuery } = bodyData;
    
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      throw new Error("No hay cartas proporcionadas.");
    }

    const cardsText = cards.map((c, i) => `Posición ${i + 1}: ${c.name} (${c.archetype})`).join(', ');
    const intention = customQuery ? ` con la pregunta: "${customQuery}"` : '';

    const prompt = `Actúa como un guía espiritual empático y cercano. Explica de forma sencilla esta tirada de "${spreadTitle || 'Claridad'}"${intention} compuesta por: ${cardsText}. Estructura la respuesta estrictamente en formato HTML con etiquetas <p> (máximo 3 párrafos cortos). El último párrafo DEBE terminar obligatoriamente con una pregunta abierta y reflexiva. No uses markdown.`;

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const resultJson = await apiResponse.json();

    if (!apiResponse.ok) {
      throw new Error(resultJson.error?.message || "Error al conectar con Google.");
    }

    const generatedText = resultJson.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ interpretacion: generatedText })
    };

  } catch (err) {
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
