// Vercel serverless function — proxy till Gemini Vision API
// Löser CORS-problemet och håller API-nyckeln säker

const GEMINI_API_KEY = "AIzaSyC7bPCFtUoR23ShPRjQswgmEXb7rZ8JKfk";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;

export default async function handler(req, res) {
  // CORS headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const { base64, mediaType, weatherContext, locationName } = req.body;

    if (!base64) return res.status(400).json({ error: "No image data" });

    const weatherPart = weatherContext
      ? `Aktuellt väder i ${locationName || "Sverige"}: ${weatherContext}. Anpassa råden efter vädret och nordiskt klimat.`
      : "Ge råd anpassade för nordiskt klimat och växthusodling i Sverige.";

    const prompt = `Du är världens bästa botaniker, växtpatolog och odlingsexpert med 30 års erfarenhet av grönsaksodling i nordiskt klimat.

${weatherPart}

Analysera bilden MYCKET noggrant. Titta specifikt på:
1. Vilken växt är det? Art och möjlig sort.
2. Vilket tillväxtstadium befinner sig plantan i?
3. Behöver tjuvskott plockas? Var och hur?
4. Finns sjuka, döende eller onödiga blad som ska tas bort?
5. Tecken på skadedjur (bladlöss, spinnkvalster, vita flygare etc)?
6. Tecken på sjukdomar (mjöldagg, gråmögel, botritis, etc)?
7. Näringsbrist? (gula blad = kväve, lila = fosfor, brun kant = kalium etc)
8. Vattenstatus baserat på bladens utseende?
9. Hur nära skörd? Tips för optimal skördetid?
10. Påverkar vädret något du bör göra nu?

Svara ENBART med ett JSON-objekt, inga backticks, ingen extra text:
{
  "plant_name": "Växtnamn på svenska",
  "variety_guess": "Möjlig sort baserat på utseende",
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
  "pruning_instructions": "Exakt instruktion om tjuvskott/beskärning behövs",
  "leaves_to_remove": "Vilka blad ska tas bort och varför",
  "watering_assessment": "Vattenbehov baserat på plantans utseende",
  "nutrient_assessment": "Näringsstatus baserat på bladfärg och tillväxt",
  "harvest_readiness": "Hur nära skörd och tips för optimal skördetid",
  "pest_disease_risk": "Identifierade skadedjur, sjukdomar eller risker",
  "care_tips": "3-5 konkreta tips för att maximera skörden",
  "next_week_tasks": ["Uppgift inom en vecka 1", "Uppgift 2"]
}`;

    const geminiBody = {
      contents: [{
        parts: [
          { text: prompt },
          { inline_data: { mime_type: mediaType || "image/jpeg", data: base64 } }
        ]
      }],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 2048,
      }
    };

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiBody)
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error:", errText);
      return res.status(502).json({ error: `Gemini API error ${geminiRes.status}`, detail: errText.slice(0, 200) });
    }

    const geminiData = await geminiRes.json();
    const rawText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    if (!rawText) return res.status(502).json({ error: "Tomt svar från Gemini" });

    // Strip markdown fences
    const clean = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();

    let parsed;
    try {
      parsed = JSON.parse(clean);
    } catch (e) {
      // Try to extract JSON from response
      const match = clean.match(/\{[\s\S]*\}/);
      if (match) {
        parsed = JSON.parse(match[0]);
      } else {
        return res.status(502).json({ error: "Kunde inte tolka svar från AI", raw: clean.slice(0, 300) });
      }
    }

    return res.status(200).json(parsed);

  } catch (err) {
    console.error("Proxy error:", err);
    return res.status(500).json({ error: err.message || "Serverfel" });
  }
}
