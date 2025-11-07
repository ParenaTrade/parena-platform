// pages/api/analyze-company.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { service, profile } = req.body;

    try {
        // OpenAI API çağrısı için prompt hazırla
        const analysisPrompt = createAnalysisPrompt(service, profile);
        
        // OpenAI API çağrısı
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: analysisPrompt }],
                max_tokens: 2000,
                temperature: 0.7,
            }),
        });

        const data = await openaiResponse.json();

        if (!openaiResponse.ok) {
            throw new Error(data.error?.message || 'OpenAI API hatası');
        }

        const analysisResult = data.choices[0].message.content;

        res.json({ 
            success: true, 
            result: analysisResult
        });

    } catch (error) {
        console.error('Analiz API hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}

function createAnalysisPrompt(service, profile) {
    const serviceTitles = {
        hedef_ulke_rapor: 'Hedef Ülke Kapsamlı Rapor',
        firma_kurulus: 'Firma Kuruluşu',
        banka_hesap: 'Banka Hesabı Açılışı',
        muhasebe: 'Muhasebe İşlemleri',
        ihracat_kredileri: 'İhracat Kredileri'
    };

    let prompt = `Sen bir uluslararası ticaret ve iş danışmanısın. Aşağıdaki bilgilere dayanarak "${serviceTitles[service]}" hizmeti için analiz yap ve öneriler sun.

KULLANICI BİLGİLERİ:
`;

    // Profil bilgilerini prompt'a ekle
    Object.entries(profile).forEach(([question, answer]) => {
        prompt += `- ${question}: ${answer}\n`;
    });

    prompt += `\nLütfen aşağıdaki başlıklarda analiz yap:

1. MEVCUT DURUM DEĞERLENDİRMESİ
2. ÖNERİLER VE ÇÖZÜMLER
3. SONRAKİ ADIMLAR
4. BEKLENEN FAYDALAR

Analizini profesyonel, anlaşılır ve uygulanabilir önerilerle sun.`;

    return prompt;
}