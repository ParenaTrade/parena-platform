export default async function (req, res) {
  const { userId } = req.body;
  const code = 'GRUP-' + Math.random().toString(36).substring(2, 8).toUpperCase();
  // burada Supabase’e kaydedebilirsin
  res.json({ code });
}
