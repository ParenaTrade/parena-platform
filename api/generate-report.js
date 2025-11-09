import OpenAI from "openai";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Sadece POST metodu destekleniyor." });
  }

  const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      success: false,
      error: "Environment değişkenleri eksik.",
    });
  }

  const { prompt, template, parameters } = req.body;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  try {
    console.log("🧠 OpenAI rapor oluşturma başladı...");

    const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

    // 1️⃣ GPT ile rapor metni oluştur
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Sen bir uluslararası ticaret ve pazar analizi uzmanısın. 
          Profesyonel, veri odaklı, yönetim sunumuna uygun, Türkçe rapor üret.
          Başlıklar, alt başlıklar ve analiz bölümleri içersin.`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const reportContent = completion.choices?.[0]?.message?.content || "Rapor oluşturulamadı.";

    // 2️⃣ PDF oluştur
    const pdfBuffer = await createPDF(reportContent);
    const fileName = `report_${Date.now()}.pdf`;

    // 3️⃣ Supabase Storage'a yükle
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (uploadError) {
      console.warn("PDF yükleme hatası:", uploadError);
      // PDF yükleme hatası rapor oluşturmaya engel değil
    }

    const { data: publicURL } = supabase.storage.from("reports").getPublicUrl(fileName);
    const pdf_url = publicURL?.publicUrl || null;

    // 4️⃣ Sadece rapor içeriğini döndür, veritabanına kayıt frontend'de yapılacak
    console.log("✅ Rapor başarıyla oluşturuldu");

    return res.status(200).json({
      success: true,
      result: reportContent,
      pdf_url: pdf_url,
    });

  } catch (error) {
    console.error("❌ Rapor oluşturma hatası:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Bilinmeyen hata oluştu.",
    });
  }
}

async function createPDF(content) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 40 });
      const buffers = [];

      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));

      doc.fontSize(18).text("📊 Parena Trade Pazar Analizi Raporu", { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(content, { align: "left" });
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
