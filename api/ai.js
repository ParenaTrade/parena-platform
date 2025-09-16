// /api/ai.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // ✅ Vercel env'den alacak
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnızca POST destekleniyor" });
  }

  try {
    // 🔑 Body parse et
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const { query } = body;

    if (!query) {
      return res.status(400).json({ error: "query alanı gerekli" });
    }

    // ✅ OpenAI çağrısı
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sen bir market sipariş asistanısın. Kullanıcıdan ürün ve miktar al." },
        { role: "user", content: query },
      ],
    });

    const answer = completion.choices[0].message.content;

    return res.status(200).json({
      ok: true,
      query,
      answer,
    });
  } catch (error) {
    console.error("API Hatası:", error);
    return res.status(500).json({
      ok: false,
      error: error.message || "Bilinmeyen sunucu hatası",
    });
  }
}
