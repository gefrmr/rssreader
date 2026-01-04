import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL ontbreekt" });

  try {
    const response = await fetch(decodeURIComponent(url));
    const html = await response.text();
    const dom = new JSDOM(html, { url: decodeURIComponent(url) });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) throw new Error("Kon artikel niet parsen.");

    const apiKey = process.env.GEMINI_API_KEY;
    const apiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash-001:generateContent?key=${apiKey}`;

    const prompt = `Vertaal de volgende HTML naar Portugees-Braziliaans (PT-BR). 
    Zet de vertaling onmiddellijk na elke zin tussen haakjes, cursief en in de kleur #2e7d32.
    Behoud alle HTML tags. Geef enkel de schone HTML terug: 
    ${article.content}`;

    const geminiResponse = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      })
    });

    const data = await geminiResponse.json();

    if (data.error) {
      throw new Error(data.error.message);
    }

    let translatedHtml = data.candidates[0].content.parts[0].text;
    translatedHtml = translatedHtml.replace(/```html/gi, "").replace(/```/gi, "").trim();

    res.status(200).json({
      title: article.title,
      content: translatedHtml
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: `AI Fout: ${err.message}` });
  }
}
