import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

// 🔑 Supabase bağlantısı
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY // SERVICE_ROLE kullan, insert için yetki lazım
);

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  try {
    const { leaderUserId } = req.body;

    if (!leaderUserId) {
      return res.status(400).json({ error: 'leaderUserId gerekli' });
    }

    // 1️⃣ Grup kodunu çek
    const { data: group, error: groupErr } = await supabase
      .from('groups')
      .select('group_code')
      .eq('leader_user_id', leaderUserId)
      .single();

    if (groupErr || !group) {
      console.error(groupErr);
      return res.status(404).json({ error: 'Grup bulunamadı' });
    }

    // 2️⃣ Tek kullanımlık referral code üret
    const referralCode = crypto.randomUUID().slice(0, 8);

    // 3️⃣ Supabase'e kaydet
    const { error: insertErr } = await supabase
      .from('referral_links')
      .insert({
        group_code: group.group_code,
        owner_user_id: leaderUserId,
        referral_code: referralCode
      });

    if (insertErr) {
      console.error(insertErr);
      return res.status(500).json({ error: 'Kayıt hatası' });
    }

    // 4️⃣ JSON döndür
    return res.status(200).json({
      group_code: group.group_code,
      referral_code: referralCode,
      referral_link: `https://yourdomain.com?group_code=${group.group_code}&referral_code=${referralCode}`
    });
  } catch (err) {
    console.error('Beklenmeyen hata:', err);
    return res.status(500).json({ error: err.message });
  }
}
