{
  "name": "superpromo-bot",
  "version": "1.0.0",
  "description": "Telegram affiliate promo bot with Supabase backend",
  "main": "api/webhook.js",
  "type": "module",
  "scripts": {
    "dev": "vercel dev",
    "start": "node api/webhook.js"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.44.0",
    "node-fetch": "^3.3.2"
  }
}
