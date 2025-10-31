const supabaseUrl = "https://xliutvspwodhoaxvysks.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXV0dnNwd29kaG9heHZ5c2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTgyOTksImV4cCI6MjA3MjkzNDI5OX0.Zodisa_ifP8t2Q4X0ecnB56RiR_Bg4QS5gvPn5ZLK_w";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Paketleri yükle
async function loadPackages(){
  const { data } = await supabase.from('packages').select('*');
  const sel = document.getElementById('packageSelect');
  sel.innerHTML = '';
  data.forEach(p=>{
    const opt = document.createElement('option');
    opt.value = p.id;
    opt.textContent = `${p.name} - ${p.firm_count} firma - $${p.price}`;
    sel.appendChild(opt);
  });
}
loadPackages();

// Paket satın alma (simülasyon)
document.getElementById('buyPackageBtn').addEventListener('click', async ()=>{
  const package_id = document.getElementById('packageSelect').value;
  const user = supabase.auth.getUser().then(u=>u.data.user);

  if(!user){ alert("Giriş yapmalısınız"); return; }

  // Dummy ödeme işlemi
  const { data, error } = await supabase.from('payments').insert({
    user_id: (await user).id,
    package_id: package_id,
    amount: 100,
    status: 'Paid'
  });

  alert("Ödeme başarılı! Paket aktive edildi.");
});

// Demo / Tam Veri Sorgu (basit örnek)
document.getElementById('newSearchBtn').addEventListener('click', async ()=>{
  const { data } = await supabase.from('tarama_data').select('*').limit(5);
  const resultDiv = document.getElementById("result");
  let html = '<table border="1"><tr><th>Firma</th><th>Ülke</th><th>Email</th></tr>';
  data.forEach(d=>{
    html += `<tr><td>${d.company_name}</td><td>${d.country}</td><td>${d.email}</td></tr>`;
  });
  html += '</table>';
  resultDiv.innerHTML = html;
});
