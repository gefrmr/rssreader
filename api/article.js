import { Readability } from "@mozilla/readability";
import { JSDOM } from "jsdom";

export default async function handler(req, res) {
  const url = req.query.url;

  if (!url) {
    return res.status(400).json({ error: "URL ontbreekt" });
  }

  try {
    const response = await fetch(decodeURIComponent(url));
    const html = await response.text();

    const dom = new JSDOM(html, { url });
    const doc = dom.window.document;

    // 1. Probeer Readability
    const reader = new Readability(doc);
    const article = reader.parse();

    if (article && article.content) {
      return res.status(200).json({
        title: article.title || "Artikel",
        content: article.content
      });
    }

    // 2. Fallback: probeer <article> tags
    const articleTag = doc.querySelector("article");
    if (articleTag) {
      return res.status(200).json({
        title: doc.title || "Artikel",
        content: articleTag.innerHTML
      });
    }

    // 3. Fallback: toon hele body
    const body = doc.querySelector("body");
    if (body) {
      return res.status(200).json({
        title: doc.title || "Artikel",
        content: body.innerHTML
      });
    }

    // 4. Fallback: toon tekstversie
    return res.status(200).json({
      title: doc.title || "Artikel",
      content: `<p>${doc.body.textContent}</p>`
    });

  } catch (err) {
    return res.status(500).json({ error: "Kon artikel niet ophalen" });
  }
}
