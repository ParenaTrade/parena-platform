// pseudo-code
export default async function handler(req, res) {
  const { leaderUserId } = req.body;

  // 1. Grup kodunu al
  const { data: group } = await supabase
    .from('groups')
    .select('group_code')
    .eq('leader_user_id', leaderUserId)
    .single();

  // 2. Tek seferlik referral code üret
  const referralCode = crypto.randomUUID().slice(0,8);

  // 3. Supabase'e kaydet
  await supabase
    .from('referral_links')
    .insert({
      group_code: group.group_code,
      owner_user_id: leaderUserId,
      referral_code: referralCode
    });

  res.status(200).json({
    group_code: group.group_code,
    referral_code: referralCode,
    referral_link: `https://site.com?group_code=${group.group_code}&referral_code=${referralCode}`
  });
}
