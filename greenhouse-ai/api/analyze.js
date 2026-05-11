export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { base64, mediaType, weatherContext, locationName } = req.body;
    if (!base64) return res.status(400).json({ error: "Ingen bilddata" });

    const weatherPart = weatherContext
      ? `Aktuellt väder i ${locationName||"Sverige"}: ${weatherContext}. Anpassa råden efter vädret.`
      : "Ge råd anpassade för nordiskt klimat.";

    const prompt = `Du är världens bästa botaniker och odlingsexpert med 30 års erfarenhet av nordisk växthusodling.

${weatherPart}

Analysera bilden noggrant. Svara ENBART med JSON, inga backticks, ingen extra text:
{
  "plant_name": "Växtnamn på svenska",
  "variety_guess": "Möjlig sort",
  "emoji": "Passande emoji",
  "health_score": 0-100,
  "status": "optimal|good|warning|critical",
  "confidence": 0-100,
  "diagnosis": "Detaljerad beskrivning av plantans tillstånd",
  "growth_stage": "T.ex. vegetativ fas / blomning / fruktbildning",
  "issues": ["Problem 1", "Problem 2"],
  "urgent_actions": ["Åtgärd som måste göras IDAG"],
  "recommended_actions": ["Åtgärd 1", "Åtgärd 2", "Åtgärd 3"],
  "pruning_needed": true,
  "pruning_instructions": "Instruktion om tjuvskott/beskärning",
  "leaves_to_remove": "Vilka blad ska tas bort och varför",
  "watering_assessment": "Vattenbehov baserat på plantans utseende",
  "nutrient_assessment": "Näringsstatus baserat på bladfärg",
  "harvest_readiness": "Hur nära skörd och tips för optimal skördetid",
  "pest_disease_risk": "Skadedjur, sjukdomar eller risker",
  "care_tips": "3-5 konkreta tips för att maximera skörden",
  "next_week_tasks": ["Uppgift 1", "Uppgift 2"]
}`;

    const GEMINI_KEY = "AIzaSyDKlvgH46UK8G9pzn4z4O6A8lM7WzaASQs";

    // Prova v1 och v1beta med aktuella modellnamn
    const endpoints = [
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      `https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=${GEMINI_KEY}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${GEMINI_KEY}`,
    ];

    let lastError = null;

    for (const url of endpoints) {
      try {
        const geminiRes = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: prompt },
                { inline_data: { mime_type: mediaType || "image/jpeg", data: base64 } }
              ]
            }],
            generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
          })
        });

        if (geminiRes.status === 429) {
          lastError = "rate_limit";
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        if (geminiRes.status === 404) {
          // Model not found — try next
          lastError = "404";
          continue;
        }

        if (!geminiRes.ok) {
          const t = await geminiRes.text();
          lastError = `${geminiRes.status}: ${t.slice(0,150)}`;
          continue;
        }

        const data = await geminiRes.json();
        const rawText = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!rawText) { lastError = "Tomt svar"; continue; }

        const clean = rawText.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
        let parsed;
        try {
          parsed = JSON.parse(clean);
        } catch {
          const match = clean.match(/\{[\s\S]*\}/);
          if (match) parsed = JSON.parse(match[0]);
          else { lastError = "Parse-fel"; continue; }
        }

        return res.status(200).json(parsed);
      } catch (e) {
        lastError = e.message;
        continue;
      }
    }

    // All endpoints failed — return helpful error
    const msg = lastError === "rate_limit"
      ? "Gemini-kvoten tillfälligt slut — vänta 1 minut och försök igen."
      : lastError === "404"
      ? "Gemini-modellen hittades inte — kontakta support."
      : `Analysfel: ${lastError}`;

    return res.status(502).json({ error: msg });

  } catch (err) {
    return res.status(500).json({ error: err.message || "Serverfel" });
  }
}
