import { NextResponse } from 'next/server';

export async function POST(request) {
  const { service, profile } = await request.json();
  
  try {
    // OpenAI API çağrısı
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [{ role: 'user', content: 'Prompt buraya' }],
        max_tokens: 2000,
      }),
    });

    const data = await response.json();
    return NextResponse.json({ success: true, result: data.choices[0].message.content });
    
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}