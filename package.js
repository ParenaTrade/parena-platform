{
  name superpromo-bot,
  version 1.0.0,
  description Telegram affiliate promo bot with Supabase backend,
  main apiwebhook.js,
  type module,
  scripts {
    dev vercel dev,
    start node apiwebhook.js
  },
  dependencies {
    @supabasesupabase-js ^2.44.0,
    node-fetch ^3.3.2
  }
}
