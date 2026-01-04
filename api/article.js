import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL ontbreekt" });

  try {
    const response = await fetch(decodeURIComponent(url));
    const html = await response.text();
    const dom = new JSDOM(html, { url: decodeURIComponent(url) });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) throw new Error("Kon artikel tekst niet extraheren.");

    // Gebruik v1 API voor stabiliteit
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash" 
    }, { apiVersion: 'v1' });

    const prompt = `Vertaal de volgende HTML naar Portugees-Braziliaans (PT-BR). 
    Regel: Zet de vertaling onmiddellijk na elke zin tussen haakjes, cursief en in de kleur #2e7d32.
    Behoud alle HTML tags. Geef enkel de resulterende HTML terug: 
    ${article.content}`;

    const result = await model.generateContent(prompt);
    const aiResponse = await result.response;
    let translatedHtml = aiResponse.text();
    
    // Verwijder mogelijke markdown blokken
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
