
import { supabase } from "../../api/supabase.js";

function showMessage(message, type="error") {
    const msg = document.getElementById("msg");
    if (!msg) return;
    msg.textContent = message;
    msg.className = `message ${type}`;
    msg.style.display = "block";
    setTimeout(()=>{ msg.style.display = "none"; }, 5000);
}

document.getElementById("form-login")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const btn = e.target.querySelector("button[type=submit]");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş Yapılıyor...';

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) showMessage("Giriş başarısız: "+error.message);
    else {
        showMessage("Giriş başarılı! Yönlendiriliyorsunuz...", "success");
        setTimeout(()=>window.location.href="/admin/admin.html", 1500);
    }

    btn.disabled = false;
    btn.innerHTML = orig;
});

document.getElementById("form-register")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    const btn = e.target.querySelector("button[type=submit]");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kayıt Oluşturuluyor...';

    const { data, error } = await supabase.auth.signUp({ email, password });

    if (error) showMessage("Kayıt başarısız: "+error.message);
    else {
        showMessage("Kayıt başarılı! Giriş yapabilirsiniz.", "success");
        e.target.reset();
    }

    btn.disabled = false;
    btn.innerHTML = orig;
});

document.getElementById("form-forgot")?.addEventListener("submit", async e=>{
    e.preventDefault();
    const email = document.getElementById("forgot-email").value;

    const btn = e.target.querySelector("button[type=submit]");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';

    const { data, error } = await supabase.auth.resetPasswordForEmail(email);

    if (error) showMessage("Şifre sıfırlama başarısız: "+error.message);
    else {
        showMessage("Şifre sıfırlama bağlantısı gönderildi.", "success");
        e.target.reset();
    }

    btn.disabled = false;
    btn.innerHTML = orig;
});

if (window.location.pathname.includes("/admin/admin.html")) {
    supabase.auth.getSession().then(({ data })=>{
        if (!data.session) window.location.href="/login.html";
    });
}

const style = document.createElement("style");
style.textContent = `
.message { padding: 12px; margin:10px 0; border-radius:4px; display:none; }
.message.error { background:#ffebee; color:#c62828; border:1px solid #ef9a9a; }
.message.success { background:#e8f5e9; color:#2e7d32; border:1px solid #a5d6a7; }
button:disabled { opacity:0.7; cursor:not-allowed; }
.fa-spinner { margin-right:8px; }
`;
document.head.appendChild(style);
