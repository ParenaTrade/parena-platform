// pages/api/test-openai.js
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export default async function handler(req, res) {
  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Merhaba, test mesajı. Cevap verir misin?' }],
      max_tokens: 100,
    });

    res.json({ 
      success: true, 
      message: 'OpenAI bağlantısı başarılı',
      response: completion.choices[0].message.content 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      error: error.message,
      hint: 'OPENAI_API_KEY kontrol edin' 
    });
  }
}