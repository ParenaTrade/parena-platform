const supabaseUrl = "https://xliutvspwodhoaxvysks.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXV0dnNwd29kaG9heHZ5c2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTgyOTksImV4cCI6MjA3MjkzNDI5OX0.Zodisa_ifP8t2Q4X0ecnB56RiR_Bg4QS5gvPn5ZLK_w";
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// Register
const registerBtn = document.getElementById("registerBtn");
if(registerBtn){
  registerBtn.addEventListener("click", async ()=>{
    const full_name = document.getElementById("fullname").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signUp({ email, password });

    if(error){ alert(error.message); return; }

    // Profile tablosuna ekle
    await supabase.from('profiles').insert({id: data.user.id, full_name: full_name});

    alert("Kayıt başarılı! Email doğrulaması yapın.");
    window.location.href = "login.html";
  });
}

// Login
const loginBtn = document.getElementById("loginBtn");
if(loginBtn){
  loginBtn.addEventListener("click", async ()=>{
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if(error){ alert(error.message); return; }

    // Panel sayfasına yönlendir
    window.location.href = "panel.html";
  });
}
