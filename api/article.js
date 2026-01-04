import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL ontbreekt" });

  try {
    // 1. Haal de bron-HTML op
    const response = await fetch(decodeURIComponent(url));
    const html = await response.text();

    // 2. Extraheer de hoofdtekst
    const dom = new JSDOM(html, { url: decodeURIComponent(url) });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) throw new Error("Kon artikel niet parsen");

    // 3. Initialiseer Gemini 1.5 Flash
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    // 4. De Prompt voor zin-per-zin vertaling
    const prompt = `
      Vertaal de volgende HTML-content naar het Portugees-Braziliaans (PT-BR).
      Regel: Elke individuele zin moet onmiddellijk gevolgd worden door zijn eigen vertaling.
      De vertaling moet tussen haakjes staan, cursief zijn en een groene kleur hebben.
      
      Voorbeeld: "Dit is een zin. Dit is de tweede zin." 
      Wordt: "Dit is een zin. <i style='color: #2e7d32;'>(Isto é uma frase.)</i> Dit is de tweede zin. <i style='color: #2e7d32;'>(Isto é a segunda frase.)</i>"
      
      Behoud alle bestaande HTML-structuren zoals <p>, <h2>, <ul> en <img> tags.
      Geef alleen de resulterende HTML terug zonder extra uitleg of Markdown-blokken.
      
      Hier is de content:
      ${article.content}
    `;

    const result = await model.generateContent(prompt);
    const translatedHtml = result.response.text().replace(/```html|```/g, ""); // Verwijder eventuele markdown tags

    res.status(200).json({
      title: article.title,
      content: translatedHtml
    });
  } catch (err) {
    console.error("Fout:", err);
    res.status(500).json({ error: "Vertaling mislukt via Gemini Flash." });
  }
}
