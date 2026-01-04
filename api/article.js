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

    if (!article) throw new Error("Artikel kon niet worden uitgelezen.");

    // Gebruik Gemini 1.5 Flash met versoepelde filters voor nieuws
    const model = genAI.getGenerativeModel({ 
        model: "gemini-1.5-flash",
        safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
    });

    const prompt = `Vertaal de volgende HTML naar Portugees-Braziliaans (PT-BR). 
    Zet de vertaling onmiddellijk na elke zin tussen haakjes, cursief en in het groen.
    Originele HTML behouden. Geef enkel de schone HTML terug: ${article.content}`;

    const result = await model.generateContent(prompt);
    let translatedHtml = result.response.text();
    
    // Opschonen van AI output
    translatedHtml = translatedHtml.replace(/```html/gi, "").replace(/```/gi, "").trim();

    res.status(200).json({
      title: article.title,
      content: translatedHtml
    });

  } catch (err) {
    console.error("API ERROR:", err.message);
    res.status(500).json({ error: `Fout: ${err.message}` });
  }
}
