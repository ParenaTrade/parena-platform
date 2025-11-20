import { createClient } from '@supabase/supabase-js';

// Environment variables'den alınması önerilir
const SUPABASE_URL = process.env.SUPABASE_URL || "https://xliutvspwodhoaxvysks.supabase.co";
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXV0dnNwd29kaG9heHZ5c2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTgyOTksImV4cCI6MjA3MjkzNDI5OX0.Zodisa_ifP8t2Q4X0ecnB56RiR_Bg4QS5gvPn5ZLK_w";

// Supabase istemcisini oluştur
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

export default async function handler(req, res) {
  // CORS headers - önemli!
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // OPTIONS isteği için ön kontrol
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // GET isteği: Tüm seller_targets kayıtlarını getir
    if (req.method === 'GET') {
      const { data, error } = await supabase
        .from('seller_targets')
        .select('*')
        .order('created_at', { ascending: false }); // Yeniden eskiye sırala

      if (error) {
        console.error('Supabase GET error:', error);
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(200).json({ data });
    }

    // POST isteği: Yeni seller_targets kaydı oluştur
    if (req.method === 'POST') {
      const payload = req.body;
      
      // Zorunlu alanları kontrol et
      if (!payload.seller_id || !payload.target_value) {
        return res.status(400).json({ error: 'Seller ID ve target value zorunludur' });
      }
      
      const { data, error } = await supabase
        .from('seller_targets')
        .insert([{ 
          ...payload,
          created_at: new Date().toISOString() 
        }])
        .select(); // Eklenen veriyi geri döndür

      if (error) {
        console.error('Supabase POST error:', error);
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(201).json({ data });
    }

    // PUT isteği: Mevcut seller_targets kaydını güncelle
    if (req.method === 'PUT') {
      const { id, ...updates } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID zorunludur' });
      }
      
      const { data, error } = await supabase
        .from('seller_targets')
        .update({ 
          ...updates,
          updated_at: new Date().toISOString() 
        })
        .eq('id', id)
        .select(); // Güncellenen veriyi geri döndür

      if (error) {
        console.error('Supabase PUT error:', error);
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(200).json({ data });
    }

    // DELETE isteği: seller_targets kaydını sil
    if (req.method === 'DELETE') {
      const { id } = req.body;
      
      if (!id) {
        return res.status(400).json({ error: 'ID zorunludur' });
      }
      
      const { error } = await supabase
        .from('seller_targets')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase DELETE error:', error);
        return res.status(400).json({ error: error.message });
      }
      
      return res.status(200).json({ message: 'Kayıt başarıyla silindi' });
    }

    // Desteklenmeyen methodlar
    return res.status(405).json({ error: 'Method not allowed' });

  } catch (err) {
    console.error('API hatası:', err);
    return res.status(500).json({ error: 'Internal server error' });
  }
}