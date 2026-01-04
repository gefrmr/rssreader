import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from "@google/generative-ai";

export default async function handler(req, res) {
  const url = req.query.url;
  if (!url) return res.status(400).json({ error: "URL ontbreekt" });

  try {
    // 1. Check of de sleutel er wel is
    if (!process.env.GEMINI_API_KEY) {
       return res.status(500).json({ error: "Systeemfout: API Key niet geconfigureerd op server." });
    }

    const response = await fetch(decodeURIComponent(url));
    const html = await response.text();
    const dom = new JSDOM(html, { url: decodeURIComponent(url) });
    const reader = new Readability(dom.window.document);
    const article = reader.parse();

    if (!article) throw new Error("De tekst van dit artikel kon niet worden opgehaald.");

    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash-latest",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    });

    const prompt = `Vertaal de volgende HTML naar Portugees-Braziliaans (PT-BR). 
    Zet de vertaling onmiddellijk na elke zin tussen haakjes, cursief en in de kleur #2e7d32.
    Geef enkel de resulterende HTML terug: ${article.content}`;

    // Probeer de AI aan te roepen
    const result = await model.generateContent(prompt);
    const aiResponse = await result.response;
    let translatedHtml = aiResponse.text();
    
    translatedHtml = translatedHtml.replace(/```html/gi, "").replace(/```/gi, "").trim();

    res.status(200).json({
      title: article.title,
      content: translatedHtml
    });

  } catch (err) {
    // Hier vangen we de specifieke foutmelding van Google op
    console.error("DEBUG ERROR:", err);
    res.status(500).json({ error: `AI Fout: ${err.message || "Onbekende fout"}` });
  }
}
