// server.js
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fetch from "node-fetch";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;

if (!VERCEL_TOKEN || !PROJECT_ID) {
  console.error("⚠️ VERCEL_TOKEN veya PROJECT_ID .env içinde eksik!");
  process.exit(1);
}

// Deployları listele
app.get("/deployments", async (req, res) => {
  try {
    const r = await fetch(`https://api.vercel.com/v9/projects/${PROJECT_ID}/deployments`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
    });
    const data = await r.json();
    res.json(data.deployments || []);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Deployları çekmede hata" });
  }
});

// Seçilen deployları sil
app.post("/delete", async (req, res) => {
  const { ids } = req.body;
  if (!ids || !ids.length) return res.status(400).json({ message: "Seçili deploy yok" });

  let success = [];
  let failed = [];

  for (const id of ids) {
    try {
      await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
      });
      success.push(id);
    } catch (err) {
      failed.push(id);
    }
  }

  res.json({
    message: `Silinen deploylar: ${success.join(", ")}${failed.length ? "\nBaşarısız: " + failed.join(", ") : ""}`
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`🌍 Server çalışıyor: http://localhost:${PORT}`));
