export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Sadece POST istekleri destekleniyor." });
  }

  try {
    const { text } = req.body;

    // OpenAI API çağrısı
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "Sen bir market sipariş asistanısın. Kullanıcının söylediği siparişi ürün adı, miktar ve birim olarak çıkar."
          },
          { role: "user", content: text }
        ]
      })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || "OpenAI API hatası");
    }

    res.status(200).json(data);
  } catch (error) {
    console.error("Backend Hatası:", error);
    res.status(500).json({ error: error.message });
  }
}
