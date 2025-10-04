import express from "express";
import fetch from "node-fetch";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const PROJECT_ID = process.env.PROJECT_ID;

// Deployment listesi
app.get("/deployments", async (req, res) => {
  try {
    const response = await fetch(`https://api.vercel.com/v6/deployments?projectId=${PROJECT_ID}&limit=50`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    const data = await response.json();
    res.json(data.deployments || []);
  } catch (err) {
    res.status(500).json({ error: "Liste alınamadı", details: err.message });
  }
});

// Seçilen deployları sil
app.post("/delete", async (req, res) => {
  const { ids } = req.body;
  if (!ids?.length) return res.status(400).json({ message: "ID listesi boş" });

  let success = 0;
  for (const id of ids) {
    const del = await fetch(`https://api.vercel.com/v13/deployments/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    if (del.ok) success++;
  }

  res.json({ message: `✅ ${success}/${ids.length} deployment silindi.` });
});

app.listen(3000, () => console.log("🌍 Server çalışıyor: http://localhost:3000"));
