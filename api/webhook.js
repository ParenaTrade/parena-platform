import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const TELEGRAM_API = `https://api.telegram.org/bot${process.env.TELEGRAM_TOKEN}`;

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(200).json({ message: 'ok' });
  }

  const body = req.body;

  if (!body.message) {
    return res.status(200).json({ message: 'no message' });
  }

  const chatId = body.message.chat.id;
  const text = body.message.text;

  if (text === '/start') {
    await sendMessage(chatId, '👋 Merhaba! SuperPromo botuna hoş geldin 🚀\n/promos yazarak güncel kampanyaları görebilirsin.');
  }

  if (text === '/promos') {
    // Kullanıcının dilini (örnek TR) alalım
    let lang = body.message.from.language_code || 'tr';

    const { data: promos, error } = await supabase
      .from('promos')
      .select('title, url')
      .eq('active', true)
      .eq('language', lang)
      .limit(5);

    if (error) {
      console.error('Supabase error:', error);
      await sendMessage(chatId, '❌ Kampanyalar yüklenemedi, daha sonra tekrar dene.');
    } else if (promos.length === 0) {
      await sendMessage(chatId, '📭 Şu anda aktif promosyon yok.');
    } else {
      let msg = promos
        .map(p => `🎁 ${p.title}\n🔗 ${p.url}`)
        .join('\n\n');
      await sendMessage(chatId, msg);
    }
  }

  res.status(200).json({ ok: true });
}

async function sendMessage(chatId, text) {
  await fetch(`${TELEGRAM_API}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text }),
  });
}
