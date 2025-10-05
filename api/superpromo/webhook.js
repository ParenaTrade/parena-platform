import fetch from "node-fetch";
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_API = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(200).send("Webhook aktif 🚀");

  try {
    const message = req.body.message;
    if (!message || !message.text) return res.status(200).send("Mesaj yok");

    const chatId = message.chat.id;
    const text = message.text.trim();
    const userId = message.from.id;
    const userCountry = message.from.language_code.toUpperCase() || "TR";

    // Kara liste kontrolü
    const { data: blacklist } = await supabase
      .from("tlgsp_blacklist")
      .select("*")
      .eq("telegram_user_id", userId);

    if ((blacklist || []).length > 0) {
      await sendMessage(chatId, "⚠️ Bu kullanıcı kara listede");
      return res.status(200).send("Kara listede");
    }

    // Komut tablosu kontrolü
    const { data: command } = await supabase
      .from("tlgsp_commands")
      .select("*")
      .eq("command", text)
      .eq("active", true)
      .limit(1)
      .single();

    if (!command) {
      await sendMessage(chatId, "Komut bulunamadı. /deneme deneyin 💬");
      return res.status(200).send("Komut yok");
    }

    // Görev tablosu
    const { data: tasks } = await supabase
      .from("tlgsp_tasks")
      .select("*")
      .eq("command_id", command.id)
      .eq("active", true);

    for (let task of (tasks || [])) {
      if (task.task_type === "check_rules") {
        const { data: rules } = await supabase
          .from("tlgsp_rules")
          .select("*")
          .eq("country", userCountry);

        if ((rules || []).length === 0 || rules[0].status !== "allowed") {
          await sendMessage(chatId, "❌ Üzgünüm, ülkenize yönelik kampanya bulunamadı");
          // Kara listeye ekle
          await supabase.from("tlgsp_blacklist").insert({
            telegram_user_id: userId,
            reason: `Kural dışı ülke: ${userCountry}`,
          });
          continue;
        } else {
          await sendButtons(chatId);
        }
      } else if (task.task_type === "send_message") {
        await sendMessage(chatId, task.task_payload.text);
      }
    }

    res.status(200).send("OK");

  } catch (err) {
    console.error("Webhook error:", err);
    res.status(500).send("Webhook error");
  }
}

// Normal mesaj gönderme
async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "Markdown" }),
  });
}

// Inline buton gönderme
async function sendButtons(chatId) {
  const buttons = {
    chat_id: chatId,
    text: "Seçeneklerden devam edin:",
    reply_markup: {
      inline_keyboard: [
        [{ text: "Başla", callback_data: "start" }],
        [{ text: "Kampanyalar", callback_data: "campaigns" }],
        [{ text: "Üyelik", callback_data: "membership" }],
        [{ text: "Canlı Sonuçlar", callback_data: "live_results" }],
        [{ text: "İstatistikler", callback_data: "stats" }],
        [{ text: "Bahisler", callback_data: "bets" }]
      ]
    }
  };

  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buttons),
  });
}
