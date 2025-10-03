import { Telegraf } from telegraf;
import { createClient } from @supabasesupabase-js;

const bot = new Telegraf(process.env.BOT_TOKEN);

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

 Start komutu
bot.start(async (ctx) = {
  const telegramId = ctx.from.id;

   kullanıcıyı Supabase'e kaydet
  await supabase.from(users).upsert({
    telegram_id telegramId,
    language tr,
  });

  await ctx.reply(Merhaba 👋 Hoş geldin! Güncel promosyonlar için promosyon yaz.);
});

 Promosyonlar
bot.command(promosyon, async (ctx) = {
  const { data promos } = await supabase
    .from(promos)
    .select()
    .eq(active, true);

  if (!promos  promos.length === 0) {
    await ctx.reply(Şu anda aktif promosyon yok.);
    return;
  }

  for (let promo of promos) {
    await ctx.reply(`🎁 ${promo.title}n👉 ${promo.url}`);
  }
});

 Vercel handler
export default async function handler(req, res) {
  if (req.method === POST) {
    await bot.handleUpdate(req.body);
    return res.status(200).send(ok);
  }
  res.status(200).send(Use POST);
}
