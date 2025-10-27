// Auth System - Login ve Kayıt Yönetimi
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.loginType = 'staff'; // staff veya customer
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        // Tüm elementleri null kontrolü ile seç
        const elements = {
            staffLoginForm: document.getElementById('staffLoginForm'),
            customerLoginForm: document.getElementById('customerLoginForm'),
            showStaffRegister: document.getElementById('showStaffRegister'),
            staffRegisterForm: document.getElementById('staffRegisterForm'),
            loginTypeBtns: document.querySelectorAll('.login-type-btn'),
            roleOptions: document.querySelectorAll('.role-option')
        };

        // Giriş türü seçimi - sadece varsa
        if (elements.loginTypeBtns.length > 0) {
            elements.loginTypeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.selectLoginType(btn.dataset.type);
                });
            });
        }

        // Form submissions - sadece varsa
        if (elements.staffLoginForm) {
            elements.staffLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.staffLogin();
            });
        }

        if (elements.customerLoginForm) {
            elements.customerLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.customerLogin();
            });
        }

        // Personel kayıt modalı - sadece varsa
        if (elements.showStaffRegister) {
            elements.showStaffRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showStaffRegister();
            });
        }

        if (elements.staffRegisterForm) {
            elements.staffRegisterForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.staffRegister();
            });
        }

        // Role selection - sadece varsa
        if (elements.roleOptions.length > 0) {
            elements.roleOptions.forEach(option => {
                option.addEventListener('click', () => {
                    this.selectRole(option.dataset.role);
                });
            });
        }

        console.log('Auth event listeners başarıyla kuruldu');
    }

    async checkExistingAuth() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                await this.loadUserProfile(user);
                this.showPanel();
            }
        } catch (error) {
            console.error('Mevcut auth kontrol hatası:', error);
        }
    }

    selectLoginType(type) {
        this.loginType = type;
        
        // UI güncelleme
        document.querySelectorAll('.login-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const selectedBtn = document.querySelector(`[data-type="${type}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
        // Formları göster/gizle
        document.querySelectorAll('.login-form').forEach(form => {
            form.classList.remove('active');
        });
        
        const targetForm = document.getElementById(`${type}LoginForm`);
        if (targetForm) {
            targetForm.classList.add('active');
        }
    }

    selectRole(role) {
        document.querySelectorAll('.role-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        
        const selectedOption = document.querySelector(`[data-role="${role}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }
        
        const roleInput = document.getElementById('selectedRole');
        if (roleInput) {
            roleInput.value = role;
        }
    }

    // Personel Girişi (Satıcı/Kurye)
    async staffLogin() {
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
            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (data.user) {
                await this.loadUserProfile(data.user);
                
                // Kullanıcı rolünü kontrol et (sadece seller veya courier olabilir)
                if (!['seller', 'courier', 'admin'].includes(this.userProfile.role)) {
                    await supabase.auth.signOut();
                    throw new Error('Bu giriş personel paneline özeldir');
                }

                this.showPanel();
                this.showAlert('Giriş başarılı!', 'success');
            }

        } catch (error) {
            console.error('Personel giriş hatası:', error);
            this.showAlert(error.message || 'Giriş sırasında bir hata oluştu.', 'error');
        }
    }

    // Müşteri Girişi (Telefon ile)
    async customerLogin() {
        const phoneInput = document.getElementById('customerPhone');
        const nameInput = document.getElementById('customerName');
        
        if (!phoneInput) {
            this.showAlert('Telefon alanı bulunamadı.', 'error');
            return;
        }

        const phone = phoneInput.value;
        const name = nameInput ? nameInput.value : '';

        if (!phone) {
            this.showAlert('Lütfen telefon numaranızı girin.', 'error');
            return;
        }

        try {
            // Telefon numarasını temizle (sadece rakamlar)
            const cleanPhone = phone.replace(/\D/g, '');
            
            // Customers tablosunda müşteriyi ara
            let { data: customer, error } = await supabase
                .from('customers')
                .select('*')
                .eq('phone', cleanPhone)
                .single();

            if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
                throw error;
            }

            if (!customer) {
                // Yeni müşteri oluştur
                const { data: newCustomer, error: createError } = await supabase
                    .from('customers')
                    .insert([{
                        name: name || 'Müşteri',
                        phone: cleanPhone,
                        role: 'üye',
                        customer_type: 'Market Müşterisi',
                        status: 'active',
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString()
                    }])
                    .select()
                    .single();

                if (createError) throw createError;
                customer = newCustomer;
                
                this.showAlert('Yeni müşteri kaydı oluşturuldu!', 'success');
            } else {
                this.showAlert('Hoş geldiniz!', 'success');
            }

            // Müşteri oturumu oluştur
            this.currentUser = {
                id: customer.id,
                user_metadata: {
                    full_name: customer.name,
                    role: customer.role,
                    phone: customer.phone
                }
            };

            this.userProfile = {
                id: customer.id,
                full_name: customer.name,
                role: customer.role,
                phone: customer.phone,
                bonus_balance: customer.bonus_balance || 0,
                address: customer.address,
                city: customer.city,
                district: customer.district,
                group_code: customer.group_code
            };

            this.showPanel();

        } catch (error) {
            console.error('Müşteri giriş hatası:', error);
            this.showAlert(error.message || 'Giriş sırasında bir hata oluştu.', 'error');
        }
    }

    // Personel Kaydı (Satıcı/Kurye)
    async staffRegister() {
        const fullNameInput = document.getElementById('regFullName');
        const emailInput = document.getElementById('regEmail');
        const phoneInput = document.getElementById('regPhone');
        const passwordInput = document.getElementById('regPassword');
        const roleInput = document.getElementById('selectedRole');

        if (!fullNameInput || !emailInput || !phoneInput || !passwordInput || !roleInput) {
            this.showAlert('Form elementleri bulunamadı.', 'error');
            return;
        }

        const fullName = fullNameInput.value;
        const email = emailInput.value;
        const phone = phoneInput.value;
        const password = passwordInput.value;
        const role = roleInput.value;

        if (!fullName || !email || !phone || !password || !role) {
            this.showAlert('Lütfen tüm alanları doldurun.', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAlert('Şifre en az 6 karakter olmalıdır.', 'error');
            return;
        }

        try {
            this.showAlert('Personel kaydı oluşturuluyor...', 'info');

            // 1. Auth kaydı
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        full_name: fullName,
                        role: role,
                        phone: phone
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
                // 2. Role-specific kayıt
                await this.handleStaffRegistration(authData.user, role, {
                    fullName,
                    email,
                    phone
                });

                this.showAlert('Kayıt başarılı! E-posta doğrulama linki gönderildi. Admin onayından sonra giriş yapabilirsiniz.', 'success');
                
                this.closeStaffRegister();
            }

        } catch (error) {
            console.error('Personel kayıt hatası:', error);
            this.showAlert(error.message || 'Kayıt sırasında bir hata oluştu.', 'error');
        }
    }

    async handleStaffRegistration(user, role, userData) {
        switch (role) {
            case 'seller':
                await this.createSellerProfile(user.id, userData);
                break;
            case 'courier':
                await this.createCourierProfile(user.id, userData);
                break;
        }

        // Profiles tablosuna da ekle
        await this.createUserProfile(user.id, userData, role);
    }

    async createSellerProfile(userId, userData) {
        try {
            const { data, error } = await supabase
                .from('seller_profiles')
                .insert([{
                    seller_id: userId,
                    business_name: `${userData.fullName} İşletmesi`,
                    phone: userData.phone,
                    email: userData.email,
                    status: false, // Admin onayı bekliyor
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Satıcı profili oluşturma hatası:', error);
            throw error;
        }
    }

    async createCourierProfile(userId, userData) {
        try {
            const { data, error } = await supabase
                .from('couriers')
                .insert([{
                    user_id: userId,
                    full_name: userData.fullName,
                    phone: userData.phone,
                    email: userData.email,
                    status: 'inactive', // Admin onayı bekliyor
                    vehicle_type: 'motorcycle',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Kurye profili oluşturma hatası:', error);
            throw error;
        }
    }

    async createUserProfile(userId, userData, role) {
        try {
            const { data, error } = await supabase
                .from('profiles')
                .insert([{
                    id: userId,
                    full_name: userData.fullName,
                    role: role,
                    phone: userData.phone,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return data;

        } catch (error) {
            console.error('Profil oluşturma hatası:', error);
            throw error;
        }
    }

    showStaffRegister() {
        const modal = document.getElementById('staffRegisterModal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeStaffRegister() {
        const modal = document.getElementById('staffRegisterModal');
        if (modal) {
            modal.style.display = 'none';
        }
        
        const form = document.getElementById('staffRegisterForm');
        if (form) {
            form.reset();
        }
    }

    async loadUserProfile(user) {
        this.currentUser = user;
        
        try {
            // Profiles tablosundan kullanıcı bilgilerini yükle
            const { data: profile, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile && !error) {
                this.userProfile = profile;
            } else {
                // Fallback: user metadata'dan oluştur
                this.userProfile = {
                    id: user.id,
                    full_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Kullanıcı',
                    role: user.user_metadata?.role || 'customer',
                    phone: user.user_metadata?.phone,
                    created_at: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('Profil yükleme hatası:', error);
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
            await supabase.auth.signOut();
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
