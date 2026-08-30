// Archivo: netlify/functions/interpretar.js

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
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Fallo crítico: GEMINI_API_KEY no detectada por el servidor." })
      };
    }

    let bodyData;
    try {
      bodyData = JSON.parse(event.body || "{}");
    } catch (e) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "El cuerpo de la petición no es un JSON válido." })
      };
    }

    const { spreadTitle, cards, customQuery } = bodyData;
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No se han proporcionado cartas." })
      };
    }

    const cardsText = cards.map((c, i) => 
      `Posición ${i + 1}: ${c.name} (Significado: ${c.archetype})`
    ).join(', ');

    const intentionContext = customQuery ? ` con la intención / pregunta específica del usuario: "${customQuery}"` : '';

    const prompt = `Actúa como un guía espiritual empático, cercano y experto en claridad emocional. Explica de forma muy sencilla, humana y directa esta tirada de "${spreadTitle || 'Lectura de Claridad'}"${intentionContext} compuesta por: ${cardsText}. 
    Estructura tu respuesta estrictamente en formato HTML utilizando etiquetas <p> para separar los párrafos (máximo 3 párrafos cortos y conversacionales). 
    CRUCIAL: El último párrafo DEBE terminar obligatoriamente con una pregunta abierta, persuasiva y reflexiva que invite al usuario a seguir pensando en su situación o a profundizar más. 
    No incluyas markdown ni bloques de código adicionales, solo texto con etiquetas <p>.`;

    // Usamos el endpoint oficial compatible con el token de ayer
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

    const apiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const resultJson = await apiResponse.json();

    if (!apiResponse.ok) {
      const errorMsg = resultJson.error?.message || "Error devuelto por la API de Google.";
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: `Google API Error: ${errorMsg}` })
      };
    }

    if (!resultJson.candidates || resultJson.candidates.length === 0 || !resultJson.candidates[0].content) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "La IA no devolvió ningún contenido." })
      };
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
      body: JSON.stringify({ error: `Excepción interna: ${err.message}` })
    };
  }
};
