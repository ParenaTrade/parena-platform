// pages/api/send-whatsapp-verification.js
export default async function handler(req, res) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    const { phone, code } = req.body;

    try {
        // WhatsApp Business API veya Twilio WhatsApp kullanabiliriz
        const result = await sendWhatsAppMessage(phone, code);
        
        res.status(200).json({ 
            success: true, 
            message: 'Doğrulama kodu WhatsApp ile gönderildi' 
        });
    } catch (error) {
        console.error('WhatsApp gönderme hatası:', error);
        res.status(500).json({ error: 'WhatsApp gönderilemedi' });
    }
}

async function sendWhatsAppMessage(phone, code) {
    // 1. Twilio WhatsApp entegrasyonu (Önerilen)
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const client = require('twilio')(accountSid, authToken);

    return await client.messages.create({
        body: `Doğrulama kodunuz: ${code}\nBu kodu 10 dakika içinde girin.`,
        from: 'whatsapp:+14155238886', // Twilio WhatsApp numarası
        to: `whatsapp:${phone}`
    });

    // 2. Alternatif: WhatsApp Business API
    // 3. Alternatif: Telegram Bot API (daha kolay)
}