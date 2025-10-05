import express from "express";
import fetch from "node-fetch";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();
const app = express();
app.use(express.json());

// Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Telegram
const TELEGRAM_API = `https://api.telegram.org/bot${process.env.BOT_TOKEN}`;

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text })
  });
}

// Kullanıcı kayıt fonksiyonu
async function processRegistration({ chatId, name, country }) {
  // 1) Rules kontrolü
  const { data: rule } = await supabase.from("tlgsp_rules").select("*").eq("country_code", country).maybeSingle();
  if (rule && rule.is_banned) {
    await sendMessage(chatId, `Üzgünüm, ${country} için kampanyamız yok veya paylaşıma izin verilmiyor.`);
    return { ok: false, reason: "banned_country" };
  }

  // 2) Kampanya kontrolü
  const { data: campaigns } = await supabase
    .from("tlgsp_campaigns")
    .select("*")
    .eq("target_country", country)
    .eq("active", true)
    .limit(1);

  if (!campaigns || campaigns.length === 0) {
    await sendMessage(chatId, `Üzgünüm, ${country} için aktif kampanya bulunamadı.`);
    return { ok: false, reason: "no_campaign" };
  }

  // 3) Kullanıcı kaydı
  const [firstName, ...lastNameParts] = name.split(" ");
  const lastName = lastNameParts.join(" ") || "";
  const { data: newUser } = await supabase
    .from("tlgsp_users")
    .insert([{ first_name: firstName, last_name: lastName }])
    .select("*")
    .single();

  const campaign = campaigns[0];
  const affiliateUrl = `${campaign.api_url}${campaign.api_url.includes("?") ? "&" : "?"}sub_id=${newUser.id}`;

  await sendMessage(chatId, `Kayıt tamam! Kampanya linkiniz: ${affiliateUrl}`);
  return { ok: true, user: newUser, campaign };
}

// Telegram webhook endpoint
app.post("/telegram-webhook", async (req, res) => {
  const message = req.body.message;
  if (!message) return res.sendStatus(200);

  const chatId = message.chat.id;
  const text = message.text;

  if (text === "/start") {
    await sendMessage(chatId, "👋 SuperPromos Bot'a hoş geldiniz!");
  } else if (text === "/register") {
    await sendMessage(chatId, "Lütfen Ad Soyad, Ülke yazın (ör: Ahmet Yılmaz, Türkiye)");
  } else if (text.includes(",")) {
    const [name, country] = text.split(",").map(s => s.trim());
    await processRegistration({ chatId, name, country });
  } else if (text === "/campaigns") {
    const { data: campaigns } = await supabase.from("tlgsp_campaigns").select("*").eq("active", true);
    const list = campaigns.map(c => `${c.program_name} - ${c.target_country}`).join("\n");
    await sendMessage(chatId, `Aktif Kampanyalar:\n${list}`);
  } else {
    await sendMessage(chatId, "Komut tanınmadı. /start, /register, /campaigns deneyin.");
  }

  res.sendStatus(200);
});

app.listen(process.env.PORT, () => console.log(`SuperPromos bot çalışıyor, port ${process.env.PORT}`));
