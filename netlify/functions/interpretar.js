// Archivo: netlify/functions/interpretar.js

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Método no permitido" };
  }

  try {
    const apiKey = process.env.GEMINI_API_KEY;
    
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY no configurada en Netlify");
    }

    const body = JSON.parse(event.body);
    const { spreadTitle, cards } = body;

    if (!cards || cards.length === 0) {
      throw new Error("No se han seleccionado cartas.");
    }

    const cardsText = cards.map((card, index) => 
      `Posición ${index + 1}: ${card.name} (Símbolo: ${card.symbol}) - Arquetipo: ${card.archetype}`
    ).join('\n');

    const prompt = `
      Actúa como un maestro intérprete de tarot con más de 30 años de experiencia, poseedor de una profunda sabiduría esotérica y psicológica. Tu enfoque es analítico, clarividente, estratégico y empático.
      
      Estás realizando la tirada "${spreadTitle}" para un consultante que busca claridad. Las cartas extraídas son:
      
      ${cardsText}

      TU TAREA:
      Analiza la interacción entre estas cartas específicas en el contexto de sus posiciones. No te limites a definir cada carta por separado; busca la narrativa y la síntesis entre ellas. Identifica patrones, energías predominantes, consejos ocultos y desafíos a enfrentar.

      FORMATO DE RESPUESTA OBLIGATORIO:
      Tu respuesta debe ser un único bloque de texto corrido, sin listas con viñetas (bullet points), separada en párrafos lógicos para facilitar la lectura. Utiliza un lenguaje culto, preciso, inspirador y directo al grano. Evita introducciones genéricas ("Basado en las cartas..."); empieza directamente con la interpretación profunda. 
      
      La longitud debe ser de aproximadamente 200-250 palabras. La respuesta debe estar formateada en HTML simple (etiquetas <p> para párrafos) ya que se inyectará directamente en el DOM de la web.
    `;

    // Llamada directa a la API REST de Google Gemini (Evita errores de empaquetado en Netlify)
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    const data = await response.json();

    if (!data.candidates || !data.candidates[0].content.parts[0].text) {
      throw new Error("Respuesta inválida de la API de Gemini");
    }

    const text = data.candidates[0].content.parts[0].text;

    return {
      statusCode: 200,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ interpretacion: text }),
    };

  } catch (error) {
    console.error("Error en la función de interpretación:", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message }),
    };
  }
};