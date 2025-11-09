import OpenAI from "openai";
import { createClient } from "@supabase/supabase-js";
import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

// 🧠 API ve DB bağlantıları
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const {
    user_id,
    template_id,
    country,
    sector,
    product,
    region,
    gtip,
    period,
    purpose,
    depth,
    language,
  } = req.body;

  try {
    console.log("🧠 AI rapor isteği alındı:", { country, sector, product });

    // 1️⃣ Prompt oluştur
    const prompt = `
Sen bir uluslararası ticaret ve pazar analizi uzmanısın.
Aşağıdaki bilgilere göre profesyonel, veri odaklı bir pazar araştırma raporu hazırla:

Ülke/Bölge: ${country || "Belirtilmemiş"}
Sektör: ${sector || "Belirtilmemiş"}
Ürün: ${product || "Belirtilmemiş"}
GTIP Kodu: ${gtip || "Belirtilmemiş"}
Zaman Aralığı: ${period || "2020-2025"}
Amaç: ${purpose || "Pazar giriş stratejisi"}
Derinlik Düzeyi: ${depth || "Yönetim sunumu formatı"}
Dil: ${language || "Türkçe"}

Rapor başlıkları:
1. Pazar Tanımı ve Genel Görünüm
2. Pazar Segmentasyonu
3. Hedef Müşteri Profilleri
4. Rakip Analizi
5. Trendler ve Fırsatlar
6. Fiyatlandırma Dinamikleri
7. SWOT Analizi
8. Sonuç ve Öneriler
`;

    // 2️⃣ OpenAI API çağrısı
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: "Sen bir profesyonel pazar analisti ve rapor yazarı olarak çalışıyorsun.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.7,
      max_tokens: 3500,
    });

    const reportText = completion.choices[0].message.content;
    console.log("✅ OpenAI cevabı alındı.");

    // 3️⃣ PDF oluştur
    const doc = new PDFDocument();
    const pdfPath = path.join("/tmp", `report_${Date.now()}.pdf`);
    const stream = fs.createWriteStream(pdfPath);
    doc.pipe(stream);

    doc.fontSize(18).text("PARENA TRADE - Pazar Raporu", { align: "center" });
    doc.moveDown();
    doc.fontSize(12).text(`Ülke: ${country}`);
    doc.text(`Sektör: ${sector}`);
    doc.text(`Ürün: ${product}`);
    doc.moveDown();
    doc.text(reportText, { align: "left" });
    doc.end();

    await new Promise((resolve) => stream.on("finish", resolve));

    // 4️⃣ Supabase Storage’a PDF yükle
    const fileBuffer = fs.readFileSync(pdfPath);
    const { data: fileData, error: uploadError } = await supabase.storage
      .from("reports")
      .upload(`report_${Date.now()}.pdf`, fileBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });

    if (uploadError) {
      console.error("❌ PDF upload hatası:", uploadError);
      throw uploadError;
    }

    const pdfUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/reports/${fileData.path}`;

    // 5️⃣ Rapor kaydını DB’ye ekle
    const { error: dbError } = await supabase.from("ai_reports").insert([
      {
        user_id,
        template_id,
        report_title: `Pazar Raporu - ${country}`,
        report_prompt: prompt,
        report_content: reportText,
        pdf_url: pdfUrl,
        country,
        sector,
        product,
        region,
        gtip,
        period,
        purpose,
        language,
        depth,
        report_type: "Kapsamlı Rapor",
        status: "completed",
      },
    ]);

    if (dbError) {
      console.error("❌ Supabase kayıt hatası:", dbError);
      throw dbError;
    }

    console.log("📄 PDF başarıyla kaydedildi:", pdfUrl);

    // 6️⃣ Yanıt döndür
    return res.status(200).json({
      success: true,
      pdf_url: pdfUrl,
      result: reportText,
    });
  } catch (error) {
    console.error("❌ Rapor oluşturma hatası:", error);
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
}
