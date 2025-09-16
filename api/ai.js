// api/ai.js
import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // ✅ Vercel env içine ekle
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Yalnızca POST destekleniyor" });
  }

  try {
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: "Mesaj boş olamaz" });
    }

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini", // hızlı ve ucuz
      messages: [
        {
          role: "system",
          content: `
          Sen bir market sipariş asistanısın.
          Kullanıcının konuşmasını analiz et ve şu formatta JSON dön:
          {
            "product": "ürün adı",
            "quantity": "miktar",
            "unit": "kg/adet",
            "action": "add/remove/info"
          }
          Sadece JSON döndür, başka açıklama yazma.
          `
        },
        { role: "user", content: message }
      ],
      temperature: 0.2,
    });

    let aiResponse = completion.choices[0].message.content.trim();

    // JSON parse et
    let parsed = JSON.parse(aiResponse);

    return res.status(200).json(parsed);
  } catch (err) {
    console.error("🔥 API Hatası:", err);
    return res.status(500).json({ error: "Sunucu hatası" });
  }
}
