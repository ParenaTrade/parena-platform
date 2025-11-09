import OpenAI from "openai";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";
import stream from "stream";
import { promisify } from "util";

const pipeline = promisify(stream.pipeline);

export const config = {
  api: { bodyParser: true },
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ success: false, error: "Yalnızca POST metodu destekleniyor" });
  }

  const { prompt, template, parameters, user_id, template_id } = req.body;

  // Supabase bağlantısı (service key varsa onu kullan, yoksa public key)
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_KEY
  );

  try {
    console.log("🧠 OpenAI çağrısı başlatıldı...");

    const openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });

    // 1️⃣ GPT'den rapor içeriğini al
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `Sen bir uluslararası ticaret ve pazar analizi uzmanısın.
          ${template || "pazar raporu"} hazırlıyorsun.
          Profesyonel, veri odaklı, yönetim sunumuna uygun, Türkçe rapor üret.
          Tablo, başlık ve analiz bölümleri içersin.`,
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const reportContent = completion.choices[0]?.message?.content || "Rapor oluşturulamadı.";

    // 2️⃣ PDF oluştur
    const pdfBuffer = await createPDF(reportContent);

    // 3️⃣ Supabase Storage’a PDF yükle
    const fileName = `report_${Date.now()}.pdf`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    const { data: publicURL } = supabase.storage
      .from("reports")
      .getPublicUrl(fileName);

    const pdf_url = publicURL.publicUrl;

    // 4️⃣ Raporu tabloya kaydet
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

    if (insertError) throw insertError;

    console.log("✅ Rapor kaydedildi:", reportData?.[0]?.id);

    // 5️⃣ Cevabı döndür
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
      error: error.message,
      details: error.stack,
    });
  }
}

// PDF üretim fonksiyonu
async function createPDF(content) {
  return new Promise((resolve) => {
    const doc = new PDFDocument({ margin: 40 });
    const buffers = [];

    doc.on("data", buffers.push.bind(buffers));
    doc.on("end", () => {
      const pdfData = Buffer.concat(buffers);
      resolve(pdfData);
    });

    doc.fontSize(18).text("📊 Parena Trade Pazar Analizi Raporu", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(content, { align: "left" });
    doc.end();
  });
}
