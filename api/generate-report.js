// pages/api/generate-report.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { prompt, template } = req.body;

    try {
        // OpenAI API çağrısı
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                model: 'gpt-4',
                messages: [{ role: 'user', content: prompt }],
                max_tokens: 4000,
                temperature: 0.7,
            }),
        });

        const data = await openaiResponse.json();

        if (!openaiResponse.ok) {
            throw new Error(data.error?.message || 'OpenAI API hatası');
        }

        const reportContent = data.choices[0].message.content;

        // Başarılı yanıt
        res.json({ 
            success: true, 
            content: reportContent,
            token_usage: data.usage?.total_tokens
        });

    } catch (error) {
        console.error('OpenAI API hatası:', error);
        res.status(500).json({ 
            success: false, 
            error: error.message 
        });
    }
}