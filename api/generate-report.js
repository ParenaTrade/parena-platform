import OpenAI from "openai";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  // 🔒 Yalnızca POST isteklerine izin ver
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Sadece POST metodu destekleniyor." });
  }

  // 🔑 Environment değişkenleri kontrolü
  const { OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY } = process.env;
  if (!OPENAI_API_KEY || !SUPABASE_URL || !SUPABASE_KEY) {
    return res.status(500).json({
      success: false,
      error: "Gerekli environment değişkenleri eksik (OPENAI_API_KEY, SUPABASE_URL, SUPABASE_KEY).",
    });
  }

  const { prompt, template, user_id, template_id } = req.body;
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
          ${template || "pazar raporu"} hazırlıyorsun.
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

    // 3️⃣ Supabase Storage’a yükle
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw new Error("Supabase yükleme hatası: " + uploadError.message);

    const { data: publicURL } = supabase.storage.from("reports").getPublicUrl(fileName);
    const pdf_url = publicURL?.publicUrl;

    // 4️⃣ Supabase veritabanına kayıt
    const { data: reportData, error: insertError } = await supabase
      .from("ai_reports")
      .insert([
        {
          user_id,
          template_id,
          report_title: template || "Kapsamlı Pazar Raporu",
          report_prompt: prompt,
          report_content: reportContent,
          pdf_url,
          status: "completed",
        },
      ])
      .select();

    if (insertError) throw new Error("Supabase kayıt hatası: " + insertError.message);

    console.log("✅ Rapor başarıyla oluşturuldu:", reportData?.[0]?.id);

    // 5️⃣ Cevap döndür
    return res.status(200).json({
      success: true,
      report_id: reportData?.[0]?.id,
      pdf_url,
      content: reportContent,
    });
  } catch (error) {
    console.error("❌ Rapor oluşturma hatası:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Bilinmeyen hata oluştu.",
    });
  }
}

// PDF üretici yardımcı fonksiyon
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
