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
      throw new Error("GEMINI_API_KEY no está configurada en el entorno de Netlify.");
    }

    let bodyData;
    try {
      bodyData = JSON.parse(event.body || "{}");
    } catch (e) {
      throw new Error("El formato del cuerpo de la solicitud no es un JSON válido.");
    }

    const { spreadTitle, cards, customQuery } = bodyData;
    if (!cards || !Array.isArray(cards) || cards.length === 0) {
      throw new Error("No se han proporcionado cartas válidas para la lectura.");
    }

    const cardsText = cards.map((c, i) => 
      `Posición ${i + 1}: ${c.name} (Significado: ${c.archetype})`
    ).join(', ');

    const intentionContext = customQuery ? ` con la intención / pregunta específica del usuario: "${customQuery}"` : '';

    const prompt = `Actúa como un guía espiritual empático, cercano y experto en claridad emocional. Explica de forma muy sencilla, humana y directa esta tirada de "${spreadTitle || 'Lectura de Claridad'}"${intentionContext} compuesta por: ${cardsText}. 
    Estructura tu respuesta estrictamente en formato HTML utilizando etiquetas <p> para separar los párrafos (máximo 3 párrafos cortos y conversacionales). 
    CRUCIAL: El último párrafo DEBE terminar obligatoriamente con una pregunta abierta, persuasiva y reflexiva que invite al usuario a seguir pensando en su situación o a profundizar más. 
    No incluyas markdown ni bloques de código adicionales, solo texto con etiquetas <p>.`;

    // Usamos el endpoint estándar y pasamos la clave AQ. como Bearer Token en la cabecera
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent`;

    const apiResponse = await fetch(endpoint, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const resultJson = await apiResponse.json();

    if (!apiResponse.ok) {
      const errorMsg = resultJson.error?.message || "Error desconocido devuelto por la API de Google Gemini.";
      throw new Error(errorMsg);
    }

    if (!resultJson.candidates || resultJson.candidates.length === 0 || !resultJson.candidates[0].content) {
      throw new Error("La IA no generó ninguna respuesta válida para esta tirada.");
    }

    const generatedText = resultJson.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ interpretacion: generatedText })
    };

  } catch (err) {
    console.error("Error crítico en Netlify Function (interpretar):", err.message);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message })
    };
  }
};
