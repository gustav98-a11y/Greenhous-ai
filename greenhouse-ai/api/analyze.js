// Greenhouse AI — bildanalys via Google Gemini API
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
      ? `Aktuellt väder i ${locationName||"Sverige"}: ${weatherContext}. Anpassa råden efter vädret och nordiskt klimat.`
      : "Ge råd anpassade för nordiskt klimat och växthusodling i Sverige.";

    const prompt = `Du är världens bästa botaniker och odlingsexpert med 30 års erfarenhet av nordisk växthusodling. ${weatherPart}

Analysera bilden mycket noggrant. Svara ENBART med ett JSON-objekt, inga backticks, ingen extra text alls:
{"plant_name":"Växtnamn på svenska","variety_guess":"Möjlig sort","emoji":"Passande emoji","health_score":85,"status":"optimal","confidence":90,"diagnosis":"Detaljerad beskrivning","growth_stage":"Vegetativ fas","issues":["Problem om det finns"],"urgent_actions":["Brådskande åtgärd om det behövs"],"recommended_actions":["Åtgärd 1","Åtgärd 2","Åtgärd 3"],"pruning_needed":false,"pruning_instructions":"Instruktion om beskärning behövs annars tom","leaves_to_remove":"Blad att ta bort om det behövs annars tom","watering_assessment":"Vattenbehov","nutrient_assessment":"Näringsstatus","harvest_readiness":"Skördestatus","pest_disease_risk":"Skadedjur eller sjukdomsrisker","care_tips":"Konkreta tips för bästa skörd","next_week_tasks":["Uppgift 1","Uppgift 2"]}`;

    const GEMINI_KEY = "AIzaSyDefw2aFMmDkrHiiV_vTu74ElSzcbTRko4";
    const BASE_V1 = "https://generativelanguage.googleapis.com/v1/models";
    const BASE_BETA = "https://generativelanguage.googleapis.com/v1beta/models";

    // Prova alla tillgängliga vision-modeller i turordning
    const endpoints = [
      `${BASE_V1}/gemini-2.0-flash:generateContent?key=${GEMINI_KEY}`,
      `${BASE_V1}/gemini-2.0-flash-001:generateContent?key=${GEMINI_KEY}`,
      `${BASE_V1}/gemini-1.5-flash:generateContent?key=${GEMINI_KEY}`,
      `${BASE_V1}/gemini-1.5-flash-001:generateContent?key=${GEMINI_KEY}`,
      `${BASE_V1}/gemini-1.5-flash-002:generateContent?key=${GEMINI_KEY}`,
      `${BASE_V1}/gemini-1.5-pro:generateContent?key=${GEMINI_KEY}`,
      `${BASE_BETA}/gemini-2.0-flash-exp:generateContent?key=${GEMINI_KEY}`,
      `${BASE_BETA}/gemini-exp-1206:generateContent?key=${GEMINI_KEY}`,
    ];

    const body = JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mediaType || "image/jpeg", data: base64 } }
        ]
      }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2048 }
    });

    const errors = [];

    for (const url of endpoints) {
      const modelName = url.match(/models\/([^:]+)/)?.[1] || url;
      try {
        const r = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body
        });

        if (r.status === 404) { errors.push(`${modelName}: 404`); continue; }
        if (r.status === 429) { errors.push(`${modelName}: 429`); await new Promise(x=>setTimeout(x,1000)); continue; }
        if (!r.ok) { const t=await r.text(); errors.push(`${modelName}: ${r.status}`); continue; }

        const data = await r.json();
        const raw = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
        if (!raw) { errors.push(`${modelName}: tomt svar`); continue; }

        const clean = raw.replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/,"").trim();
        let parsed;
        try { parsed = JSON.parse(clean); }
        catch {
          const m = clean.match(/\{[\s\S]*\}/);
          if (m) { try { parsed = JSON.parse(m[0]); } catch { errors.push(`${modelName}: parse-fel`); continue; } }
          else { errors.push(`${modelName}: parse-fel`); continue; }
        }

        // Success — log which model worked
        console.log(`Success with model: ${modelName}`);
        return res.status(200).json(parsed);

      } catch (e) { errors.push(`${modelName}: ${e.message}`); continue; }
    }

    // All failed
    const hasRateLimit = errors.some(e => e.includes("429"));
    return res.status(502).json({
      error: hasRateLimit
        ? "Gemini-kvoten tillfälligt slut — vänta 1 minut och försök igen."
        : `Ingen modell tillgänglig. Fel: ${errors.slice(0,3).join(", ")}`,
      errors
    });

  } catch (err) {
    return res.status(500).json({ error: err.message || "Serverfel" });
  }
}
