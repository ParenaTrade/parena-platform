
// WhatsApp Doğrulamalı Auth System - Tüm kullanıcılar için
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.userType = 'customer'; // customer, seller, courier
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('🔐 WhatsApp Auth System başlatılıyor...');
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingSession();
    }

    setupEventListeners() {
        // Tüm giriş formları için
        const loginForm = document.getElementById('universalLoginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.universalLogin();
            });
        }

        // Kullanıcı tipi seçimi
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.selectUserType(btn.dataset.type);
            });
        });
    }

    selectUserType(type) {
        this.userType = type;
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('selected');
        
        console.log(`👤 Kullanıcı tipi seçildi: ${type}`);
    }

    // Tüm kullanıcılar için evrensel WhatsApp girişi
    async universalLogin() {
        const phoneInput = document.getElementById('universalPhone');
        const nameInput = document.getElementById('universalName');
        
        if (!phoneInput) {
            this.showAlert('Telefon alanı bulunamadı.', 'error');
            return;
        }

        const phone = phoneInput.value.trim();
        const name = nameInput ? nameInput.value.trim() : '';

        if (!phone) {
            this.showAlert('Lütfen telefon numaranızı girin.', 'error');
            return;
        }

        const cleanPhone = this.cleanPhoneNumber(phone);
        if (!this.isValidPhoneNumber(cleanPhone)) {
            this.showAlert('Lütfen geçerli bir telefon numarası girin. (5XX XXX XX XX)', 'error');
            return;
        }

        try {
            console.log(`📞 ${this.userType} için WhatsApp doğrulama başlatılıyor:`, cleanPhone);

            const verificationCode = this.generateVerificationCode();
            this.saveVerificationCode(cleanPhone, verificationCode);

            await this.sendWhatsAppVerification(cleanPhone, verificationCode);

            this.showVerificationModal(cleanPhone, name, this.userType);

        } catch (error) {
            console.error('❌ WhatsApp doğrulama hatası:', error);
            this.showAlert(error.message || 'Doğrulama kodu gönderilemedi.', 'error');
        }
    }

    // Kullanıcı tipine göre kayıt/kontrol işlemi
    async completeUserLogin(phone, name, userType) {
        try {
            let userData;
            
            switch(userType) {
                case 'customer':
                    userData = await this.handleCustomerLogin(phone, name);
                    break;
                case 'seller':
                    userData = await this.handleSellerLogin(phone, name);
                    break;
                case 'courier':
                    userData = await this.handleCourierLogin(phone, name);
                    break;
                default:
                    throw new Error('Geçersiz kullanıcı tipi');
            }

            this.setUserSession(userData, userType);
            this.showAlert(`Hoş geldiniz ${userData.name}!`, 'success');

        } catch (error) {
            console.error('Kullanıcı kaydı hatası:', error);
            throw error;
        }
    }

    // Müşteri giriş/kayıt
    async handleCustomerLogin(phone, name) {
        let { data: customer, error } = await this.supabase
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error('Müşteri kontrolü sırasında hata oluştu');
        }

        if (!customer) {
            // Yeni müşteri oluştur
            const newCustomer = {
                name: name || 'Müşteri',
                phone: phone,
                role: 'üye',
                customer_type: 'Market Müşterisi',
                status: 'active',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: createdCustomer, error: createError } = await this.supabase
                .from('customers')
                .insert([newCustomer])
                .select()
                .single();

            if (createError) throw createError;
            return createdCustomer;
        }

        return customer;
    }

    // Satıcı giriş/kayıt
    async handleSellerLogin(phone, name) {
        let { data: seller, error } = await this.supabase
            .from('seller_profiles')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error('Satıcı kontrolü sırasında hata oluştu');
        }

        if (!seller) {
            // Yeni satıcı oluştur
            const newSeller = {
                business_name: name ? `${name} İşletmesi` : 'Yeni İşletme',
                phone: phone,
                status: false, // Admin onayı bekliyor
                created_at: new Date().toISOString()
            };

            const { data: createdSeller, error: createError } = await this.supabase
                .from('seller_profiles')
                .insert([newSeller])
                .select()
                .single();

            if (createError) throw createError;
            return createdSeller;
        }

        return seller;
    }

    // Kurye giriş/kayıt
    async handleCourierLogin(phone, name) {
        let { data: courier, error } = await this.supabase
            .from('couriers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error && error.code !== 'PGRST116') {
            throw new Error('Kurye kontrolü sırasında hata oluştu');
        }

        if (!courier) {
            // Yeni kurye oluştur
            const newCourier = {
                full_name: name || 'Kurye',
                phone: phone,
                status: 'inactive', // Admin onayı bekliyor
                vehicle_type: 'motorcycle',
                created_at: new Date().toISOString()
            };

            const { data: createdCourier, error: createError } = await this.supabase
                .from('couriers')
                .insert([newCourier])
                .select()
                .single();

            if (createError) throw createError;
            return createdCourier;
        }

        return courier;
    }

    // Oturum oluştur
    setUserSession(userData, userType) {
        const sessionData = {
            id: userData.id,
            type: userType,
            name: userData.name || userData.business_name || userData.full_name,
            phone: userData.phone,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('userSession', JSON.stringify(sessionData));
        
        this.userProfile = {
            id: userData.id,
            name: userData.name || userData.business_name || userData.full_name,
            role: userType,
            phone: userData.phone
        };

        console.log(`✅ ${userType} oturumu oluşturuldu:`, sessionData);
        this.showPanel();
    }

    // Mevcut oturumu kontrol et
    async checkExistingSession() {
        try {
            const userSession = localStorage.getItem('userSession');
            if (userSession) {
                const session = JSON.parse(userSession);
                
                // Oturum süresi kontrolü (7 gün)
                const loginTime = new Date(session.loginTime);
                const now = new Date();
                const daysDiff = (now - loginTime) / (1000 * 60 * 60 * 24);
                
                if (daysDiff < 7) {
                    console.log('✅ Mevcut oturum bulundu:', session.type);
                    
                    this.userType = session.type;
                    this.userProfile = {
                        id: session.id,
                        name: session.name,
                        role: session.type,
                        phone: session.phone
                    };

                    this.showPanel();
                    return;
                } else {
                    console.log('⚠️ Oturum süresi dolmuş');
                    localStorage.removeItem('userSession');
                }
            }

            console.log('ℹ️ Mevcut oturum bulunamadı');

        } catch (error) {
            console.error('❌ Oturum kontrol hatası:', error);
        }
    }

    // Panel göster
    showPanel() {
        document.querySelector('.auth-container').style.display = 'none';
        
        const panelContainer = document.getElementById('panelContainer');
        if (panelContainer) {
            panelContainer.style.display = 'grid';
        }
        
        if (typeof window.panelSystem !== 'undefined') {
            window.panelSystem.initializePanel(this.userProfile);
        }
    }

    // Çıkış yap
    logout() {
        localStorage.removeItem('userSession');
        console.log('✅ Oturum sonlandırıldı');
        location.reload();
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
            localStorage.removeItem('customerSession');
            console.log('✅ Müşteri oturumu sonlandırıldı');
            location.reload();
        } else {
            if (this.supabase && this.supabase.auth) {
                await this.supabase.auth.signOut();
            }
            console.log('✅ Personel oturumu sonlandırıldı');
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
