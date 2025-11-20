// /api/ai.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Vercel environment variable
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnızca POST destekleniyor" });
  }

  try {
    // Gelen body'yi parse et
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: "Sorgu boş olamaz" });
    }

    // OpenAI çağrısı
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sen bir market sipariş asistanısın. Kullanıcı ürünleri sipariş ediyor. Kısa ve net cevap ver." },
        { role: "user", content: query },
      ],
    });

    const answer = completion.choices[0].message.content;

    return res.status(200).json({ reply: answer });
  } catch (error) {
    console.error("API Hatası:", error);
    return res.status(500).json({ error: error.message });
  }
}
