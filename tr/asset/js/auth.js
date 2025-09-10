import { createClient } from '@supabase/supabase-js';

// Supabase bağlantı bilgileri (Excel'den alınan)
const SUPABASE_URL = "https://xliutvspwodhoavysks.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...";

// Supabase istemcisini oluştur
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Mesaj gösterme fonksiyonu
function showMessage(message, type = "error") {
    const msg = document.getElementById("msg");
    if (!msg) {
        // Mesaj kutusu yoksa oluştur
        const msgDiv = document.createElement("div");
        msgDiv.id = "msg";
        msgDiv.className = `message ${type}`;
        msgDiv.textContent = message;
        msgDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            max-width: 400px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transition: all 0.3s ease;
        `;
        
        if (type === "error") {
            msgDiv.style.background = "#ef4444";
        } else {
            msgDiv.style.background = "#10b981";
        }
        
        document.body.appendChild(msgDiv);
        
        // 5 saniye sonra kaldır
        setTimeout(() => {
            msgDiv.style.opacity = "0";
            setTimeout(() => {
                if (msgDiv.parentNode) {
                    msgDiv.parentNode.removeChild(msgDiv);
                }
            }, 300);
        }, 5000);
        
        return;
    }
    
    msg.textContent = message;
    msg.className = `message ${type}`;
    
    if (type === "error") {
        msg.style.background = "#ef4444";
    } else {
        msg.style.background = "#10b981";
    }
    
    msg.style.display = "block";
    
    setTimeout(() => {
        msg.style.opacity = "0";
        setTimeout(() => {
            msg.style.display = "none";
            msg.style.opacity = "1";
        }, 300);
    }, 5000);
}

// Giriş formu işleme
document.getElementById("form-login")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("login-email").value;
    const password = document.getElementById("login-password").value;

    const btn = e.target.querySelector("button[type=submit]");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Giriş Yapılıyor...';

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showMessage("Giriş başarısız: " + error.message, "error");
        } else {
            showMessage("Giriş başarılı! Yönlendiriliyorsunuz...", "success");
            setTimeout(() => window.location.href = "/admin/admin.html", 1500);
        }
    } catch (error) {
        showMessage("Beklenmeyen bir hata oluştu: " + error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
});

// Kayıt formu işleme
document.getElementById("form-register")?.addEventListener("submit", async e => {
    e.preventDefault();
    const name = document.getElementById("register-name").value;
    const email = document.getElementById("register-email").value;
    const password = document.getElementById("register-password").value;

    const btn = e.target.querySelector("button[type=submit]");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Kayıt Oluşturuluyor...';

    try {
        const { data, error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: name
                }
            }
        });

        if (error) {
            showMessage("Kayıt başarısız: " + error.message, "error");
        } else {
            showMessage("Kayıt başarılı! Giriş yapabilirsiniz.", "success");
            e.target.reset();
        }
    } catch (error) {
        showMessage("Beklenmeyen bir hata oluştu: " + error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
});

// Şifre sıfırlama formu işleme
document.getElementById("form-forgot")?.addEventListener("submit", async e => {
    e.preventDefault();
    const email = document.getElementById("forgot-email").value;

    const btn = e.target.querySelector("button[type=submit]");
    const orig = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';

    try {
        const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: window.location.origin + "/auth/update-password.html"
        });

        if (error) {
            showMessage("Şifre sıfırlama başarısız: " + error.message, "error");
        } else {
            showMessage("Şifre sıfırlama bağlantısı gönderildi.", "success");
            e.target.reset();
        }
    } catch (error) {
        showMessage("Beklenmeyen bir hata oluştu: " + error.message, "error");
    } finally {
        btn.disabled = false;
        btn.innerHTML = orig;
    }
});

// Admin sayfası için oturum kontrolü
if (window.location.pathname.includes("/admin/admin.html")) {
    supabase.auth.getSession().then(({ data }) => {
        if (!data.session) {
            window.location.href = "/login.html";
        }
    });
    
    // Gerçek zamanlı oturum değişikliklerini dinle
    supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_OUT' || !session) {
            window.location.href = "/login.html";
        }
    });
}

// Şifre sıfırlama sayfası için özel işlev
if (window.location.pathname.includes("/auth/update-password.html")) {
    document.addEventListener("DOMContentLoaded", async () => {
        // URL'den erişim token'ını al
        const hash = window.location.hash;
        const params = new URLSearchParams(hash.substring(1));
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');
        const type = params.get('type');
        
        if (type === 'recovery' && accessToken) {
            // Token'ı kullanarak oturumu yenile
            const { error } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            
            if (error) {
                showMessage("Geçersiz veya süresi dolmuş bağlantı.", "error");
                return;
            }
            
            // Şifre güncelleme formunu göster
            document.getElementById("password-update-form").style.display = "block";
            
            // Şifre güncelleme formu işleme
            document.getElementById("form-update-password").addEventListener("submit", async e => {
                e.preventDefault();
                const newPassword = document.getElementById("new-password").value;
                const confirmPassword = document.getElementById("confirm-password").value;
                
                if (newPassword !== confirmPassword) {
                    showMessage("Şifreler eşleşmiyor.", "error");
                    return;
                }
                
                const btn = e.target.querySelector("button[type=submit]");
                const orig = btn.innerHTML;
                btn.disabled = true;
                btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Güncelleniyor...';
                
                try {
                    const { error } = await supabase.auth.updateUser({
                        password: newPassword
                    });
                    
                    if (error) {
                        showMessage("Şifre güncelleme başarısız: " + error.message, "error");
                    } else {
                        showMessage("Şifreniz başarıyla güncellendi. Yönlendiriliyorsunuz...", "success");
                        setTimeout(() => {
                            window.location.href = "/login.html";
                        }, 2000);
                    }
                } catch (error) {
                    showMessage("Beklenmeyen bir hata oluştu: " + error.message, "error");
                } finally {
                    btn.disabled = false;
                    btn.innerHTML = orig;
                }
            });
        }
    });
}

// Stil ekleme
const style = document.createElement("style");
style.textContent = `
.message { 
    padding: 12px 20px; 
    margin: 10px 0; 
    border-radius: 8px; 
    display: none; 
    position: fixed;
    top: 20px;
    right: 20px;
    z-index: 10000;
    max-width: 400px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transition: all 0.3s ease;
}
.message.error { 
    background: #ef4444; 
    color: white; 
}
.message.success { 
    background: #10b981; 
    color: white; 
}
button:disabled { 
    opacity: 0.7; 
    cursor: not-allowed; 
}
.fa-spinner { 
    margin-right: 8px; 
    animation: spin 1s linear infinite;
}
@keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);

// Kullanıcı oturum bilgilerini yönetmek için yardımcı fonksiyonlar
export const authHelper = {
    // Mevcut kullanıcıyı al
    getCurrentUser: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        return user;
    },
    
    // Kullanıcı oturumunu al
    getSession: async () => {
        const { data: { session } } = await supabase.auth.getSession();
        return session;
    },
    
    // Çıkış yap
    signOut: async () => {
        const { error } = await supabase.auth.signOut();
        if (!error) {
            window.location.href = "/login.html";
        }
        return error;
    },
    
    // Kullanıcı profil bilgilerini al
    getUserProfile: async (userId) => {
        if (!userId) {
            const user = await authHelper.getCurrentUser();
            userId = user?.id;
        }
        
        if (!userId) return null;
        
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .single();
            
        return data;
    }
};

export default supabase;