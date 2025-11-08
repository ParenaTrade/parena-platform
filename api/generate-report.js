// pages/api/generate-report.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, template, parameters } = req.body;

  try {
    console.log('🔍 OpenAI API çağrısı yapılıyor...');
    console.log('📝 Prompt:', prompt.substring(0, 200) + '...');

    const completion = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        {
          role: 'system',
          content: `Sen bir uluslararası ticaret ve pazar analizi uzmanısın. 
          ${template || 'pazar raporu'} hazırlıyorsun. 
          Profesyonel, veri odaklı, yönetim sunumuna uygun ve iş odaklı raporlar hazırla.
          Raporu Türkçe olarak hazırla ve net, anlaşılır bir dil kullan.`
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 4000,
      temperature: 0.7,
    });

    const reportContent = completion.choices[0].message.content;

    console.log('✅ OpenAI başarılı, token kullanımı:', completion.usage?.total_tokens);

    res.json({ 
      success: true, 
      result: reportContent,
      token_usage: completion.usage?.total_tokens
    });

  } catch (error) {
    console.error('❌ OpenAI API hatası:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message,
      details: 'OpenAI API anahtarı veya bağlantı hatası'
    });
  }
}
