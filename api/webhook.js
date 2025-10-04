export default async function handler(req, res) {
  if (req.method === "POST") {
    console.log("Telegram update:", req.body);

    // Telegram'a bir "200 OK" dönmek zorunlu
    res.status(200).json({ ok: true });
  } else {
    res.status(200).send("Bot webhook çalışıyor ✅");
  }
}
