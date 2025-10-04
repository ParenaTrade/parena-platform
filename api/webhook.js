export default async function handler(req, res) {
  if (req.method === "POST") {
    const body = req.body;

    // Kullanıcıdan gelen mesajı al
    if (body.message) {
      const chatId = body.message.chat.id;
      const text = body.message.text;

      // Eğer kullanıcı /start yazdıysa cevap verelim
      if (text === "/start") {
        await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: "👋 Merhaba! SuperPromo botuna hoş geldin 🚀",
          }),
        });
      }
    }

    res.status(200).json({ ok: true });
  } else {
    res.status(200).send("Bot webhook çalışıyor ✅");
  }
}
