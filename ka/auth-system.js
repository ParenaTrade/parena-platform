class AuthSystem {
    constructor() {
        // Config'den değerleri al ve kontrol et
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('🔐 Auth System başlatılıyor...');
        console.log('Supabase Client:', this.supabase ? '✅ Var' : '❌ Yok');
        
        if (!this.supabase) {
            console.error('❌ Supabase client bulunamadı! Config.js düzgün yüklendi mi?');
            // 2 saniye bekle ve tekrar dene
            setTimeout(() => {
                this.supabase = window.SUPABASE_CLIENT;
                if (this.supabase) {
                    console.log('✅ Supabase client gecikmeli yüklendi');
                    this.init();
                }
            }, 2000);
            return;
        }
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        // Mevcut kodunuz aynı kalacak, sadece null kontrolleri eklenecek
        const elements = {
            staffLoginForm: document.getElementById('staffLoginForm'),
            customerLoginForm: document.getElementById('customerLoginForm'),
            showStaffRegister: document.getElementById('showStaffRegister'),
            staffRegisterForm: document.getElementById('staffRegisterForm'),
            loginTypeBtns: document.querySelectorAll('.login-type-btn'),
            roleOptions: document.querySelectorAll('.role-option')
        };

        console.log('🔍 Auth elementleri aranıyor...');

        // Giriş türü seçimi - sadece varsa
        if (elements.loginTypeBtns.length > 0) {
            elements.loginTypeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.selectLoginType(btn.dataset.type);
                });
            });
            console.log('✅ Login type buttons bağlandı');
        }

        // Form submissions - sadece varsa
        if (elements.staffLoginForm) {
            elements.staffLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.staffLogin();
            });
            console.log('✅ Staff login form bağlandı');
        }

        if (elements.customerLoginForm) {
            elements.customerLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.customerLogin();
            });
            console.log('✅ Customer login form bağlandı');
        }

        // Personel kayıt modalı - sadece varsa
        if (elements.showStaffRegister) {
            elements.showStaffRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showStaffRegister();
            });
            console.log('✅ Staff register bağlandı');
        }

        if (elements.staffRegisterForm) {
            elements.staffRegisterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.staffRegister();
            });
            console.log('✅ Staff register form bağlandı');
        }

        // Role selection - sadece varsa
        if (elements.roleOptions.length > 0) {
            elements.roleOptions.forEach(option => {
                option.addEventListener('click', () => {
                    this.selectRole(option.dataset.role);
                });
            });
            console.log('✅ Role options bağlandı');
        }

        console.log('✅ Auth event listeners başarıyla kuruldu');
    }

    async checkExistingAuth() {
        try {
            console.log('🔍 Mevcut oturum kontrol ediliyor...');
            
            // Supabase client kontrolü
            if (!this.supabase || !this.supabase.auth) {
                console.error('❌ Supabase auth bulunamadı!');
                return;
            }

            const { data: { user }, error } = await this.supabase.auth.getUser();
            
            if (error) {
                console.warn('⚠️ Oturum kontrol hatası:', error.message);
                return;
            }

            if (user) {
                console.log('✅ Mevcut kullanıcı bulundu:', user.email);
                await this.loadUserProfile(user);
                this.showPanel();
            } else {
                console.log('ℹ️ Mevcut oturum bulunamadı');
            }

        } catch (error) {
            console.error('❌ Mevcut auth kontrol hatası:', error);
        }
    }

    // Diğer metodlar aynı kalacak, sadece this.supabase kullanacak şekilde güncelleyin
    async staffLogin() {
        if (!this.supabase) {
            this.showAlert('Sistem hazır değil, lütfen bekleyin.', 'error');
            return;
        }

        const emailInput = document.getElementById('staffEmail');
        const passwordInput = document.getElementById('staffPassword');
        
        if (!emailInput || !passwordInput) {
            this.showAlert('Form elementleri bulunamadı.', 'error');
            return;
        }

        const email = emailInput.value;
        const password = passwordInput.value;

        if (!email || !password) {
            this.showAlert('Lütfen tüm alanları doldurun.', 'error');
            return;
        }

        try {
            console.log('🔐 Staff login deneniyor:', email);
            
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (data.user) {
                console.log('✅ Staff login başarılı:', data.user.email);
                await this.loadUserProfile(data.user);
                
                // Kullanıcı rolünü kontrol et
                if (!['seller', 'courier', 'admin'].includes(this.userProfile.role)) {
                    await this.supabase.auth.signOut();
                    throw new Error('Bu giriş personel paneline özeldir');
                }

                this.showPanel();
                this.showAlert('Giriş başarılı!', 'success');
            }

        } catch (error) {
            console.error('❌ Personel giriş hatası:', error);
            this.showAlert(error.message || 'Giriş sırasında bir hata oluştu.', 'error');
        }
    }

    // Diğer metodları da benzer şekilde güncelleyin...
    // customerLogin, staffRegister, vb. tüm metodlarda this.supabase kullanın

    async loadUserProfile(user) {
        this.currentUser = user;
        
        try {
            console.log('👤 Kullanıcı profili yükleniyor:', user.id);
            
            // Profiles tablosundan kullanıcı bilgilerini yükle
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile && !error) {
                this.userProfile = profile;
                console.log('✅ Profil yüklendi:', profile.role);
            } else {
                // Fallback: user metadata'dan oluştur
                this.userProfile = {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı',
                    role: user.user_metadata?.role || 'customer',
                    phone: user.user_metadata?.phone,
                    created_at: new Date().toISOString()
                };
                console.log('⚠️ Fallback profil oluşturuldu:', this.userProfile.role);
            }
        } catch (error) {
            console.error('❌ Profil yükleme hatası:', error);
            // Fallback kullan
            this.userProfile = {
                id: user.id,
                full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı',
                role: user.user_metadata?.role || 'customer',
                phone: user.user_metadata?.phone,
                created_at: new Date().toISOString()
            };
        }
    }

    // ... diğer metodlar
	showPanel() {
        const authContainer = document.querySelector('.auth-container');
        if (authContainer) {
            authContainer.style.display = 'none';
        }
        
        // Panel container'ı göster (eğer mevcutsa)
        const panelContainer = document.getElementById('panelContainer');
        if (panelContainer) {
            panelContainer.style.display = 'grid';
        }
        
        // Initialize appropriate panel
        if (typeof window.panelSystem !== 'undefined') {
            window.panelSystem.initializePanel(this.userProfile);
        } else {
            console.log('Panel sistemi bulunamadı, ana sayfaya yönlendiriliyor...');
            // Panel sistemi yoksa ana sayfaya yönlendir
            window.location.href = 'index.html';
        }
    }

    showAlert(message, type) {
        const alert = document.getElementById('authAlert');
        if (!alert) {
            console.log(`${type}: ${message}`);
            return;
        }
        
        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.style.display = 'block';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 5000);
    }

    async logout() {
        if (this.userProfile && (this.userProfile.role === 'üye' || this.userProfile.role === 'customer')) {
            // Müşteri oturumu - sadece sayfayı yenile
            location.reload();
        } else {
            // Personel oturumu - Supabase auth'tan çıkış
            await this.supabase.auth.signOut();
            location.reload();
        }
    }
}

// Modal kapatma fonksiyonları
function closeStaffRegister() {
    if (window.authSystem) {
        window.authSystem.closeStaffRegister();
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});
