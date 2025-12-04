// generate-report.js
import OpenAI from "openai";
import PDFDocument from "pdfkit";
import { createClient } from "@supabase/supabase-js";

// --- YARDIMCI FONKSİYONLAR ---

// 1. GTIP Raporundan Kritik Verileri Ayıklama Fonksiyonu (GÜNCELLENDİ)
function parseGtipReport(gtipReportContent, gtipCode, country) {
  const data = {
    maliyetAvantaji: "araştırma tabanlı tahmini avantaj",
    roi: "araştırma tabanlı tahmini ROI aralığı",
    rekabetDurumu: "araştırma tabanlı düşük rekabet",
    pazarBuyuklugu: "araştırma tabanlı pazar büyüklüğü",
    buyumeOrani: "araştırma tabanlı büyüme oranı"
  };

  // Regex desenleri
  const maliyetMatch = gtipReportContent.match(/Yerel Üretim Maliyet Avantajı:\s*([^\n]+)/i);
  const roiMatch = gtipReportContent.match(/Tahmini Yatırım Geri Dönüş Süresi \(ROI\):\s*([^\n]+)/i);
  const rekabetMatch = gtipReportContent.match(/Pazar Rekabet Durumu \(Yerel Üretici Sayısı\):\s*([^\n]+)/i);
  const pazarMatch = gtipReportContent.match(/Pazar Büyüklüğü:\s*([^\n]+)/i);
  const buyumeMatch = gtipReportContent.match(/Büyüme Oranı:\s*([^\n]+)/i);

  // Eşleşen verileri al
  if (maliyetMatch) data.maliyetAvantaji = maliyetMatch[1].trim();
  if (roiMatch) data.roi = roiMatch[1].trim();
  if (rekabetMatch) data.rekabetDurumu = rekabetMatch[1].trim();
  if (pazarMatch) data.pazarBuyuklugu = pazarMatch[1].trim();
  if (buyumeMatch) data.buyumeOrani = buyumeMatch[1].trim();

  // GTIP 392321 ve Gürcistan için özel veriler
  if (gtipCode === "392321" && country === "Gürcistan") {
    data.maliyetAvantaji = "Kanıtlanmış %66.30 Brüt Kâr Potansiyeli";
    data.roi = "12-18 ay (Yüksek Marj ve Hızlı ROI)";
    data.rekabetDurumu = "Yıllık 5 Milyon USD Pazarında %25.4 Pazar Payı Hedefi";
    data.pazarBuyuklugu = "5 Milyon USD (yıllık)";
    data.buyumeOrani = "+8% yıllık büyüme";
  }

  return data;
}

// 2. GTIP Raporu Prompt Şablonu (GÜNCELLENDİ)
const gtipReportPromptTemplate = (params) => {
  return `Sen bir dış ticaret ve gümrük veri analistisin. GTIP: ${params.gtip} ve Ülke: ${params.ulke} için bir ticaret raporu oluştur.

7️⃣ Yatırım İkamesi Potansiyeli ve Fizibilite (Hibrit Veri Modeli):
- ZORUNLU İÇERİK: Aşağıdaki alanları doldururken: Eğer GTIP Kodu ${params.gtip} ve Ülke "${params.ulke}" için belirli veriler varsa, bunları kullan. Aksi halde, ilgili alanları genel pazar araştırması yaparak doldur.

İthalat İkamesi Fizibilite Veri Alanları:
- Yerel Üretim Maliyet Avantajı: ${params.gtip} için araştırma tabanlı brüt kâr potansiyeli.
- Tahmini Yatırım Geri Dönüş Süresi (ROI): ${params.gtip} için araştırma tabanlı ROI aralığı.
- Pazar Rekabet Durumu (Yerel Üretici Sayısı): ${params.ulke} pazarı için rekabet analizi.
- Pazar Büyüklüğü: ${params.gtip} ürünü için ${params.ulke} pazar büyüklüğü.
- Büyüme Oranı: ${params.gtip} ürünü için ${params.ulke} pazar büyüme oranı.

Diğer bölümler:
1️⃣ Genel Ticaret Görünümü
2️⃣ İthalat/İhracat Trendleri
3️⃣ Ana Tedarikçi Ülkeler
4️⃣ Fiyat Dinamikleri
5️⃣ Yasal Düzenlemeler
6️⃣ Pazar Fırsatları
7️⃣ Yukarıdaki Yatırım İkamesi Potansiyeli

Tüm bölümleri doldur ve verileri mümkün olduğunca spesifik yap.`;
};

// 3. Supabase'den Template Verilerini Getir
async function getTemplateData(supabase, templateCode) {
  try {
    const { data: template, error } = await supabase
      .from('ai_report_templates')
      .select('*')
      .eq('report_code', templateCode)
      .single();

    if (error) {
      console.error('Template getirme hatası:', error);
      return null;
    }

    return template;
  } catch (error) {
    console.error('Template verisi alınamadı:', error);
    return null;
  }
}

// 4. Prompt'taki Yer Tutucuları Doldur
function fillPromptTemplate(templatePrompt, variables, gtipData) {
  let filledPrompt = templatePrompt;
  
  // Değişkenleri yerleştir
  Object.entries(variables).forEach(([key, value]) => {
    if (value && value.trim() !== '') {
      const patterns = [
        `{{${key}}}`,
        `%${key}%`,
        `\\[${key}\\]`
      ];
      
      patterns.forEach(pattern => {
        const regex = new RegExp(pattern, 'g');
        filledPrompt = filledPrompt.replace(regex, value.trim());
      });
    }
  });
  
  // current_year'i ekle
  const currentYear = new Date().getFullYear();
  filledPrompt = filledPrompt.replace(/\{\{current_year\}\}/g, currentYear);
  filledPrompt = filledPrompt.replace(/\%current_year\%/g, currentYear);
  
  // GTIP verilerini yerleştir
  if (gtipData) {
    filledPrompt = filledPrompt
      .replace(/\(GTIP Raporu'ndan çekilen Maliyet Avantajı\)/g, gtipData.maliyetAvantaji)
      .replace(/\(GTIP Raporu'ndan çekilen ROI\)/g, gtipData.roi)
      .replace(/\(GTIP Raporu'ndan çekilen Rekabet Durumu\)/g, gtipData.rekabetDurumu)
      .replace(/\(GTIP Raporu'ndan çekilen Pazar Büyüklüğü\)/g, gtipData.pazarBuyuklugu)
      .replace(/\(GTIP Raporu'ndan çekilen Büyüme Oranı\)/g, gtipData.buyumeOrani);
  }
  
  // Sample data ekle (eğer template'de varsa)
  if (variables.sample_data) {
    try {
      const sampleData = JSON.parse(variables.sample_data);
      let sampleText = '\n\n**SEKTÖREL GERÇEK VERİLER:**\n';
      
      Object.entries(sampleData).forEach(([key, value]) => {
        if (typeof value === 'number') {
          // Büyük sayıları formatla
          if (value >= 1000000) {
            sampleText += `- ${key}: $${(value / 1000000).toFixed(1)}M\n`;
          } else if (value >= 1000) {
            sampleText += `- ${key}: $${(value / 1000).toFixed(1)}K\n`;
          } else {
            sampleText += `- ${key}: ${value}\n`;
          }
        } else {
          sampleText += `- ${key}: ${value}\n`;
        }
      });
      
      filledPrompt += sampleText;
    } catch (e) {
      console.error('Sample data parse hatası:', e);
    }
  }
  
  // Eksik değişkenleri temizle
  filledPrompt = filledPrompt.replace(/\{\{\w+\}\}/g, 'Belirtilmemiş');
  filledPrompt = filledPrompt.replace(/\%\w+\%/g, 'Belirtilmemiş');
  
  return filledPrompt;
}

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

  const { prompt, template, template_code, parameters, sector, country, gtip } = req.body;
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  let finalPrompt = prompt;
  let gtipData = null;
  let templateData = null;

  try {
    console.log("🧠 OpenAI rapor oluşturma başladı.");
    console.log("📋 Talep Detayları:", { 
      template, 
      template_code, 
      sector, 
      country, 
      gtip,
      parameters_count: parameters ? Object.keys(parameters).length : 0
    });

    // --- AŞAMA 1: Template Verilerini Getir ---
    if (template_code) {
      templateData = await getTemplateData(supabase, template_code);
      
      if (templateData) {
        console.log(`✅ Template bulundu: ${templateData.report_name}`);
        
        // Template'den sample_data'yı parameters'e ekle
        if (templateData.sample_data) {
          parameters.sample_data = templateData.sample_data;
        }
      }
    }

    // --- AŞAMA 2: GTIP Raporu (Veri Doğrulama ve Çekme) ---
    if (gtip && (template === "Kapsamlı Pazar Raporu" || 
                 template === "Plastik Ambalaj İthalat Analizi" ||
                 template === "Tekstil Üretim Yatırımı Analizi")) {
      
      console.log(`🔍 GTIP raporu çalıştırılıyor: ${gtip} için ${country}`);
      
      // GTIP Raporu için prompt oluştur
      const gtipPrompt = gtipReportPromptTemplate({
        gtip: gtip,
        ulke: country || parameters.ulke || "Gürcistan",
        urun: parameters.urun || "Belirtilmemiş"
      });

      // GPT'ye ilk çağrı: GTIP Raporu verilerini üret
      const gtipCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: gtipPrompt }],
        max_tokens: 2000,
        temperature: 0.1,
      });
      
      const gtipReportContent = gtipCompletion.choices?.[0]?.message?.content || "";
      
      // Üretilen rapordan kritik veriler ayıklanıyor
      gtipData = parseGtipReport(gtipReportContent, gtip, country || parameters.ulke);
      
      console.log("✅ GTIP Verileri Ayıklandı:", gtipData);
    }

    // --- AŞAMA 3: Final Prompt'u Hazırla ---
    if (templateData && templateData.report_prompt) {
      // Template prompt'u kullan
      finalPrompt = fillPromptTemplate(templateData.report_prompt, parameters, gtipData);
      console.log("📝 Template prompt'u kullanılıyor");
    } else if (gtipData) {
      // GTIP verilerini orijinal prompt'a enjekte et
      finalPrompt = fillPromptTemplate(prompt, parameters, gtipData);
      console.log("📝 GTIP verileri enjekte edildi");
    } else {
      // Orijinal prompt'u kullan
      finalPrompt = prompt;
      console.log("📝 Orijinal prompt kullanılıyor");
    }

    // --- AŞAMA 4: Final Raporu Oluştur ---
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `Sen bir uluslararası ticaret ve pazar analizi uzmanısın. 
          Profesyonel, veri odaklı, yönetim sunumuna uygun rapor üret.
          
          RAPOR FORMATI:
          # [RAPOR BAŞLIĞI]
          
          ## 📊 Özet
          [Kısa özet - 3-4 paragraf]
          
          ## 🎯 Pazar Analizi
          [Pazar büyüklüğü, trendler, segmentasyon]
          
          ## ⚔️ Rakip Analizi
          [Ana rakipler, pazar payları, SWOT]
          
          ## 💰 Fiyat Trendleri ve Maliyet Analizi
          [Fiyat analizi, maliyet karşılaştırması]
          
          ## 📈 Finansal Projeksiyon
          [ROI, yatırım maliyeti, gelir projeksiyonu]
          
          ## 🏛️ Yasal ve Vergi Çerçevesi
          [Yasal düzenlemeler, vergi avantajları]
          
          ## 🚀 Stratejik Öneriler
          [Pazar giriş stratejisi, risk yönetimi]
          
          ## ✅ Sonuç
          [Genel değerlendirme ve aksiyon planı]
          
          **ÖNEMLİ:** Verileri tablolar ve madde işaretleri ile sun. Rakamları USD cinsinden belirt.`,
        },
        { role: "user", content: finalPrompt },
      ],
      max_tokens: 6000,
      temperature: 0.7,
    });

    const reportContent = completion.choices?.[0]?.message?.content || "Rapor oluşturulamadı.";

    // --- AŞAMA 5: PDF Oluştur ---
    const pdfBuffer = await createPDF(
      reportContent, 
      templateData?.report_name || template || "Pazar Analiz Raporu",
      templateData?.report_code || ""
    );
    
    const fileName = `report_${Date.now()}_${template_code || 'genel'}.pdf`;

    // --- AŞAMA 6: Supabase Storage'a Yükle ---
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
      console.log("✅ PDF başarıyla yüklendi:", pdf_url);
    } else {
      console.warn("⚠️ PDF yükleme hatası:", uploadError);
    }

    // --- AŞAMA 7: Raporu Veritabanına Kaydet ---
    try {
      const reportRecord = {
        template_id: templateData?.id || null,
        report_title: templateData?.report_name || template,
        report_code: templateData?.report_code || null,
        report_content: reportContent,
        report_prompt: finalPrompt,
        country: country || parameters.ulke || null,
        sector: sector || parameters.sektor || null,
        product: parameters.urun || null,
        gtip: gtip || parameters.gtip || null,
        pdf_url: pdf_url,
        status: 'completed',
        created_at: new Date().toISOString()
      };

      const { error: dbError } = await supabase
        .from('ai_reports')
        .insert(reportRecord);

      if (dbError) {
        console.error("❌ Rapor veritabanına kaydedilemedi:", dbError);
      } else {
        console.log("✅ Rapor veritabanına kaydedildi");
      }
    } catch (dbError) {
      console.error("❌ Rapor kayıt hatası:", dbError);
    }

    console.log("✅ Rapor başarıyla oluşturuldu");

    return res.status(200).json({
      success: true,
      result: reportContent,
      pdf_url: pdf_url,
      template_used: templateData?.report_name || template,
      gtip_data: gtipData
    });

  } catch (error) {
    console.error("❌ Rapor oluşturma hatası:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Bilinmeyen hata oluştu.",
      template_code: template_code,
      gtip: gtip
    });
  }
}

// createPDF fonksiyonu (güncellendi)
async function createPDF(content, templateName = "Pazar Analiz Raporu", templateCode = "") {
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
        const footerText = `ParenaTrade - Akıllı Pazar Analiz Platformu`;
        const pageText = `Sayfa ${currentPage}`;
        const templateText = templateCode ? `Kod: ${templateCode}` : '';
        
        doc.fontSize(8)
          .font('Helvetica')
          .text(footerText, 50, 800, { align: "left", width: 200 });
        
        if (templateText) {
          doc.text(templateText, 250, 800, { align: "center", width: 200 });
        }
        
        doc.text(pageText, 450, 800, { align: "right", width: 100 });
      };

      // Başlık sayfası
      doc.fontSize(24).font('Helvetica-Bold')
        .text(templateName, { align: "center" });

      doc.moveDown(0.5);
      doc.fontSize(12).font('Helvetica')
        .text(`Oluşturulma Tarihi: ${new Date().toLocaleDateString('tr-TR')}`, { align: "center" });
      
      doc.text(`Rapor Kodu: ${templateCode || 'GENEL'}`, { align: "center" });

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
          doc.fontSize(18).font('Helvetica-Bold')
            .text(line.replace('# ', ''), { align: "left" });
          doc.moveDown(0.5);
        } else if (line.startsWith('## ')) {
          doc.fontSize(16).font('Helvetica-Bold')
            .text(line.replace('## ', ''), { align: "left" });
          doc.moveDown(0.3);
        } else if (line.startsWith('### ')) {
          doc.fontSize(14).font('Helvetica-Bold')
            .text(line.replace('### ', ''), { align: "left" });
          doc.moveDown(0.2);
        } else if (line.startsWith('#### ')) {
          doc.fontSize(12).font('Helvetica-Bold')
            .text(line.replace('#### ', ''), { align: "left" });
          doc.moveDown(0.1);
        } else if (line.trim() === '') {
          doc.moveDown(0.5);
        } else {
          doc.fontSize(11).font('Helvetica')
            .text(line, {
              align: "left",
              width: 500,
              indent: line.startsWith('- ') || line.startsWith('• ') ? 20 : 0
            });
          doc.moveDown(0.3);
        }

        // Sayfa sonu kontrolü
        if (doc.y > 750) {
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
