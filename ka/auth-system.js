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
        // Giriş türü seçimi
        document.querySelectorAll('.login-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectLoginType(btn.dataset.type);
            });
        });

        // Form submissions
        document.getElementById('staffLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.staffLogin();
        });

        document.getElementById('customerLoginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.customerLogin();
        });

        // Personel kayıt modalı
        document.getElementById('showStaffRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showStaffRegister();
        });

        document.getElementById('staffRegisterForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.staffRegister();
        });

        // Role selection
        document.querySelectorAll('.role-option').forEach(option => {
            option.addEventListener('click', () => {
                this.selectRole(option.dataset.role);
            });
        });
    }

    async checkExistingAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            await this.loadUserProfile(user);
            this.showPanel();
        }
    }

    selectLoginType(type) {
        this.loginType = type;
        
        // UI güncelleme
        document.querySelectorAll('.login-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('selected');
        
        // Formları göster/gizle
        document.querySelectorAll('.login-form').forEach(form => {
            form.classList.remove('active');
        });
        document.getElementById(`${type}LoginForm`).classList.add('active');
    }

    selectRole(role) {
        document.querySelectorAll('.role-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.querySelector(`[data-role="${role}"]`).classList.add('selected');
        document.getElementById('selectedRole').value = role;
    }

    // Personel Girişi (Satıcı/Kurye)
    async staffLogin() {
        const email = document.getElementById('staffEmail').value;
        const password = document.getElementById('staffPassword').value;

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
        const phone = document.getElementById('customerPhone').value;
        const name = document.getElementById('customerName').value;

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
                // Yeni müşteri oluştur - MEVCUT TABLO YAPISINA GÖRE
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
                bonus_balance: customer.bonus_balance,
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
        const fullName = document.getElementById('regFullName').value;
        const email = document.getElementById('regEmail').value;
        const phone = document.getElementById('regPhone').value;
        const password = document.getElementById('regPassword').value;
        const role = document.getElementById('selectedRole').value;

        if (!fullName || !email || !phone || !password || !role) {
            this.showAlert('Lütfen tüm alanları doldurun.', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAlert('Şifre en az 6 karakter olmalıdır.', 'error');
            return;
        }

        try {
            this.showAlert('Personel kaydı oluşturuluyor...', 'success');

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
                // 2. Role-specific kayıt (mevcut tablolara göre)
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
        document.getElementById('staffRegisterModal').style.display = 'flex';
    }

    closeStaffRegister() {
        document.getElementById('staffRegisterModal').style.display = 'none';
        document.getElementById('staffRegisterForm').reset();
    }

    async loadUserProfile(user) {
        this.currentUser = user;
        
        // Profiles tablosundan kullanıcı bilgilerini yükle
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
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
    }

    showPanel() {
        document.querySelector('.auth-container').style.display = 'none';
        
        // Panel container'ı göster (eğer mevcutsa)
        const panelContainer = document.getElementById('panelContainer');
        if (panelContainer) {
            panelContainer.style.display = 'grid';
        }
        
        // Initialize appropriate panel
        if (typeof window.panelSystem !== 'undefined') {
            window.panelSystem.initializePanel(this.userProfile);
        } else {
            // Panel sistemi yoksa ana sayfaya yönlendir
            window.location.href = 'index.html';
        }
    }

    showAlert(message, type) {
        const alert = document.getElementById('authAlert');
        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.style.display = 'block';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 5000);
    }

    async logout() {
        if (this.userProfile.role === 'üye' || this.userProfile.role === 'customer') {
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
    window.authSystem.closeStaffRegister();
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});