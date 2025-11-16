// generate-report.js
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";

// --- YARDIMCI FONKSİYONLAR ---

// 1. GTIP Raporundan Kritik Verileri Ayıklama Fonksiyonu (REVİZE EDİLDİ)
function parseGtipReport(gtipReportContent) {
  const data = {};

  // Regex desenleri
  const maliyetMatch = gtipReportContent.match(/Yerel Üretim Maliyet Avantajı:\s*([^\n]+)/i);
  const roiMatch = gtipReportContent.match(/Tahmini Yatırım Geri Dönüş Süresi \(ROI\):\s*([^\n]+)/i);
  const rekabetMatch = gtipReportContent.match(/Pazar Rekabet Durumu \(Yerel Üretici Sayısı\):\s*([^\n]+)/i);

  data.maliyetAvantaji = maliyetMatch ? maliyetMatch[1].trim() : "araştırma tabanlı tahmini avantaj";
  data.roi = roiMatch ? roiMatch[1].trim() : "araştırma tabanlı tahmini ROI aralığı";
  data.rekabetDurumu = rekabetMatch ? rekabetMatch[1].trim() : "araştırma tabanlı düşük rekabet";

  // Sabit verinin gelip gelmediğini kontrol etmek için kesinleşen verilerimizle kontrol (392321 ve %66.30)
  if (data.roi.includes('12-18 ay') && data.maliyetAvantaji.includes('%66.30')) {
      data.maliyetAvantaji = "Kanıtlanmış %66.30 Brüt Kâr Potansiyeli";
      data.roi = "12-18 ay (Yüksek Marj ve Hızlı ROI)";
      data.rekabetDurumu = "Yıllık 5 Milyon USD Pazarında %25.4 Pazar Payı Hedefi";
  } else if (data.roi.includes('12-18 ay')) { 
        // Eski veya varsayılan 12-18 ay kontrolü için fallback
        data.maliyetAvantaji = "kanıtlanmış %40-%60 aralığındaki";
        data.rekabetDurumu = "%15'in altındaki düşük rekabet";
    }

  return data;
}

// 2. GTIP Raporu Prompt Şablonu (KESİNLEŞEN VERİLERLE REVİZE EDİLDİ)
// GTIP Kodu 392321 ve kesinleşen %66.30 kâr potansiyeli entegre edildi.
const gtipReportPromptTemplate = (params) => {
    // Sadece Fizibilite bölümünün mantığı basitleştirilmiştir.
    return `Sen bir dış ticaret ve gümrük veri analistisin. GTIP: ${params.gtip} ve Ülke: ${params.ulke} için bir ticaret raporu oluştur. Sadece 7. bölüm için koşullu veri kullan:
    
    7️⃣ Yatırım İkamesi Potansiyeli ve Fizibilite (Hibrit Veri Modeli):
    - ZORUNLU İÇERİK: Aşağıdaki alanları doldururken: Eğer GTIP Kodu 392321 ise ve ${params.ulke} "Gürcistan" ise, Eşleşen Sabit Veri değerlerini kullan. Aksi halde, ilgili alanları genel pazar araştırması yaparak doldur.
    
    İthalat İkamesi Fizibilite Veri Alanları:
    - Yerel Üretim Maliyet Avantajı: GTIP 392321 Eşleşiyorsa: Kanıtlanmış %66.30 Brüt Kâr Potansiyeli (Tüm Piyasa Ortalaması). Eşleşmiyorsa: Araştırma tabanlı tahmini ikame maliyeti.
    - Tahmini Yatırım Geri Dönüş Süresi (ROI): GTIP 392321 Eşleşiyorsa: 12-18 ay (Yüksek Marj ve Hızlı ROI). Eşleşmiyorsa: Araştırma tabanlı tahmini ROI aralığı.
    - Pazar Rekabet Durumu (Yerel Üretici Sayısı): GTIP 392321 Eşleşiyorsa: Yıllık 5 Milyon USD Pazarında %25.4 Pazar Payı Hedefi. Eşleşmiyorsa: Araştırma tabanlı rekabet tahmini.
    
    Raporun diğer tüm bölümlerini (1-6) de doldur.`;
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
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  let finalPrompt = prompt;
  let parsedData = { maliyetAvantaji: "bilinmeyen", roi: "bilinmeyen", rekabetDurumu: "bilinmeyen" };

  try {
    console.log("🧠 OpenAI rapor oluşturma başladı. Talep Edilen Şablon:", template);

    // --- AŞAMA 1: GTIP Raporu (Veri Doğrulama ve Çekme) ---
    if (template === "Kapsamlı Pazar Raporu") {
        console.log("🔍 Kapsamlı Rapor istendi. Önce GTIP raporu çalıştırılıyor...");

        // GTIP Raporu için prompt oluşturuluyor
        const gtipPrompt = gtipReportPromptTemplate(parameters);

        // GPT'ye ilk çağrı: GTIP Raporu verilerini üret
        const gtipCompletion = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Veri çekme için uygun model
            messages: [{ role: "user", content: gtipPrompt }],
            max_tokens: 3000,
            temperature: 0.1, // Düşük sıcaklık, kesin veri için
        });
        
        const gtipReportContent = gtipCompletion.choices?.[0]?.message?.content || "";
        
        // Üretilen rapordan kritik veriler ayıklanıyor
        parsedData = parseGtipReport(gtipReportContent);
        
        console.log("✅ GTIP Verileri Ayıklandı:", parsedData);

        // --- AŞAMA 2: Kapsamlı Rapor Prompt'una Veri Enjeksiyonu ---
        
        // Kapsamlı Rapor prompt'undaki yer tutucular dolduruluyor 
        finalPrompt = finalPrompt
            .replace(/\(GTIP Raporu'ndan çekilen Maliyet Avantajı\)/g, parsedData.maliyetAvantaji)
            .replace(/\(GTIP Raporu'ndan çekilen ROI\)/g, parsedData.roi)
            .replace(/\(GTIP Raporu'ndan çekilen Rekabet Durumu\)/g, parsedData.rekabetDurumu)
            // Diğer yer tutucular burada devam edebilir...
        
        console.log("📝 Prompt Güncellendi. Nihai Rapor Üretimine Geçiliyor...");

    } else {
        // Kapsamlı Rapor değilse (Örn: GTIP Bazlı veya Firma Bazlı), tek adımda ilerle
        finalPrompt = prompt;
    }


    // 1️⃣ GPT ile final rapor metni oluştur (İkinci GPT Çağrısı)
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
        { role: "user", content: finalPrompt }, // finalPrompt, GTIP verileri enjekte edilmiş prompt'tur
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const reportContent = completion.choices?.[0]?.message?.content || "Rapor oluşturulamadı.";

    // 2️⃣ PDF oluştur
    const pdfBuffer = await createPDF(reportContent, template);
    const fileName = `report_${Date.now()}.pdf`;

    // 3️⃣ Supabase Storage'a yükle
    // ... (Yükleme ve URL alma kısmı değişmedi)
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

// createPDF fonksiyonu aynı kalır.
async function createPDF(content, templateName = "Pazar Analiz Raporu") {
    // ... (PDF oluşturma mantığı değişmedi)
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

            let currentPage = 1;

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
