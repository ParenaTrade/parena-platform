export default async function handler(req, res) {
  if (req.method === "POST") {
    console.log("Telegram update:", JSON.stringify(req.body, null, 2));
    const body = req.body;

    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      if (text === "/start") {
        try {
          const resp = await fetch(
            `https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                chat_id: chatId,
                text: "👋 Merhaba! SuperPromo botuna hoş geldin 🚀",
              }),
            }
          );

          const data = await resp.json();
          console.log("Telegram sendMessage response:", data);
        } catch (err) {
          console.error("Telegram API error:", err);
        }
      }
    }

    res.status(200).json({ ok: true });
  } else {
    res.status(200).send("Bot webhook çalışıyor ✅");
  }
}
