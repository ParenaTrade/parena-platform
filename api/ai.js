import OpenAI from "openai";

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Vercel'den alıyor
});

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Only POST requests are allowed" });
  }

  try {
    const { message } = req.body;

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "Sen bir market sipariş asistanısın. Kullanıcı ürünleri sorarsa fiyata ve miktara göre net cevap ver." },
        { role: "user", content: message }
      ],
    });

    const reply = completion.choices[0].message.content;
    res.status(200).json({ reply });
  } catch (error) {
    console.error("AI API Hatası:", error.message);
    res.status(500).json({ error: error.message });
  }
}
