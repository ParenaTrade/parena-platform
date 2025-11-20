import { NextResponse } from 'next/server';

export async function POST(request) {
  const { prompt, template, parameters, max_tokens = 2000 } = await request.json();
  
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `Sen bir uluslararası ticaret ve pazar analizi uzmanısın. 
            ${template || 'pazar raporu'} hazırlıyorsun. 
            Profesyonel, veri odaklı raporlar hazırla. Türkçe ve yapılandırılmış format kullan.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: max_tokens,
        temperature: 0.7
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json({ 
      success: true, 
      result: data.choices[0].message.content 
    });
    
  } catch (error) {
    console.error('Generate report error:', error);
    return NextResponse.json({ 
      success: false, 
      error: error.message 
    }, { status: 500 });
  }
}
