import OpenAI from "openai";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";

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
          Raporu aşağıdaki yapıda oluştur:
          
          # [RAPOR BAŞLIĞI]
          
          ## Özet
          [Kısa özet buraya]
          
          ## Pazar Analizi
          [Detaylı pazar analizi]
          
          ## Rakip Analizi
          [Rakip değerlendirmesi]
          
          ## Fiyat Trendleri
          [Fiyat analizi]
          
          ## Öneriler
          [Stratejik öneriler]
          
          ## Sonuç
          [Genel değerlendirme]`,
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const reportContent = completion.choices?.[0]?.message?.content || "Rapor oluşturulamadı.";

    // 2️⃣ PDF oluştur
    const pdfBuffer = await createPDF(reportContent, template);
    const fileName = `report_${Date.now()}.pdf`;

    // 3️⃣ Supabase Storage'a yükle
    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(fileName, pdfBuffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    let pdf_url = null;
    if (!uploadError) {
      const { data: publicURL } = supabase.storage.from("reports").getPublicUrl(fileName);
      pdf_url = publicURL?.publicUrl;
    } else {
      console.warn("PDF yükleme hatası:", uploadError);
    }

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

// Gelişmiş PDF oluşturma - DÜZELTİLMİŞ VERSİYON
async function createPDF(content, templateName = "Pazar Analiz Raporu") {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ 
        margin: 50,
        size: 'A4'
      });
      
      const buffers = [];
      doc.on("data", (chunk) => buffers.push(chunk));
      doc.on("end", () => resolve(Buffer.concat(buffers)));
      doc.on("error", reject);

      // Manuel sayfa takibi
      let currentPage = 1;
      
      // Footer ekleme fonksiyonu
      const addFooter = () => {
        doc.fontSize(8)
           .font('Helvetica')
           .text(`ParenaTrade - Akıllı Pazar Analiz Platformu - Sayfa ${currentPage}`, 50, 800, {
             align: "center",
             width: 500
           });
      };

      // İlk sayfa içeriği
      doc.fontSize(20).font('Helvetica-Bold')
         .text(`📊 ${templateName}`, { align: "center" });
      
      doc.moveDown(0.5);
      doc.fontSize(10).font('Helvetica')
         .text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, { align: "center" });
      
      doc.moveDown();
      doc.lineWidth(1).strokeColor('#cccccc')
         .moveTo(50, doc.y).lineTo(550, doc.y).stroke();
      
      doc.moveDown();

      // İlk sayfa footer'ı
      addFooter();
      
      // İçerik işleme
      const lines = content.split('\n');
      doc.fontSize(12).font('Helvetica');
      
      lines.forEach(line => {
        if (line.startsWith('# ')) {
          doc.fontSize(16).font('Helvetica-Bold')
             .text(line.replace('# ', ''), { align: "left" });
          doc.moveDown(0.5);
        } else if (line.startsWith('## ')) {
          doc.fontSize(14).font('Helvetica-Bold')
             .text(line.replace('## ', ''), { align: "left" });
          doc.moveDown(0.3);
        } else if (line.startsWith('### ')) {
          doc.fontSize(12).font('Helvetica-Bold')
             .text(line.replace('### ', ''), { align: "left" });
          doc.moveDown(0.2);
        } else if (line.trim() === '') {
          doc.moveDown(0.5);
        } else {
          doc.fontSize(11).font('Helvetica')
             .text(line, { 
               align: "left",
               width: 500,
               indent: 20
             });
          doc.moveDown(0.3);
        }
        
        // Sayfa sonu kontrolü - YENİ SAYFA EKLE
        if (doc.y > 700) {
          currentPage++;
          doc.addPage();
          
          // Yeni sayfa footer'ı
          addFooter();
          
          doc.fontSize(11).font('Helvetica');
        }
      });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
}
