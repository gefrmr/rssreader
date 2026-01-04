import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

// Initialiseer de AI met de API Key uit je omgevingsvariabelen
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL ontbreekt" });

  try {
    // 1. Artikel ophalen en parsen
    const response = await fetch(decodeURIComponent(url));
    const html = await response.text();
    const dom = new JSDOM(html, { url: decodeURIComponent(url) });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) throw new Error("De tekst van dit artikel kon niet worden opgehaald.");

    // 2. Model initialiseren - Gebruik 'gemini-1.5-flash' (zonder -latest voor betere v1 support)
    // We stellen ook de safetySettings in op de meest tolerante waarden voor nieuwsberichten
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
    }, { apiVersion: 'v1' }); // FORCEER V1 API in plaats van de falende v1beta

    const prompt = `Vertaal de volgende HTML naar Portugees-Braziliaans (PT-BR). 
    Instructie: Zet de vertaling onmiddellijk na elke zin tussen haakjes, cursief en in de kleur #2e7d32.
    Behoud alle HTML tags. Geef enkel de resulterende HTML terug zonder markdown codeblokken: 
    ${article.content}`;

    // 3. AI aanroepen
    const result = await model.generateContent(prompt);
    const aiResponse = await result.response;
    let translatedHtml = aiResponse.text();
    
    // Verwijder eventuele resterende markdown indicators
    translatedHtml = translatedHtml.replace(/```html/gi, "").replace(/```/gi, "").trim();

    res.status(200).json({
      title: article.title,
      content: translatedHtml
    });

  } catch (err) {
    console.error("DEBUG ERROR:", err);
    // Gedetailleerde foutmelding voor debugging
    res.status(500).json({ error: `AI Fout: ${err.message}` });
  }
}
