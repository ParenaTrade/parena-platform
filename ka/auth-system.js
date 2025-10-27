// Auth System - Login ve Kayıt Yönetimi (WhatsApp Doğrulamalı)
class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.loginType = 'staff';
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('🔐 Auth System başlatılıyor...');
        
        if (!this.supabase) {
            console.error('❌ Supabase client bulunamadı!');
            return;
        }
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        const elements = {
            staffLoginForm: document.getElementById('staffLoginForm'),
            customerLoginForm: document.getElementById('customerLoginForm'),
            showStaffRegister: document.getElementById('showStaffRegister'),
            staffRegisterForm: document.getElementById('staffRegisterForm'),
            loginTypeBtns: document.querySelectorAll('.login-type-btn'),
            roleOptions: document.querySelectorAll('.role-option')
        };

        // Giriş türü seçimi
        if (elements.loginTypeBtns.length > 0) {
            elements.loginTypeBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    this.selectLoginType(btn.dataset.type);
                });
            });
        }

        // Form submissions
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

        // Personel kayıt modalı
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

        // Role selection
        if (elements.roleOptions.length > 0) {
            elements.roleOptions.forEach(option => {
                option.addEventListener('click', () => {
                    this.selectRole(option.dataset.role);
                });
            });
        }

        console.log('✅ Auth event listeners başarıyla kuruldu');
    }

    async checkExistingAuth() {
        try {
            console.log('🔍 Mevcut oturum kontrol ediliyor...');
            
            // 1. Önce auth oturumu kontrol et (personel için)
            if (this.supabase && this.supabase.auth) {
                const { data: { user }, error } = await this.supabase.auth.getUser();
                
                if (!error && user) {
                    console.log('✅ Auth kullanıcısı bulundu:', user.email);
                    await this.loadUserProfile(user);
                    this.showPanel();
                    return;
                }
            }

            // 2. Müşteri oturumu kontrol et
            const customerSession = localStorage.getItem('customerSession');
            if (customerSession) {
                const session = JSON.parse(customerSession);
                
                // Oturum süresi kontrolü (24 saat)
                const loginTime = new Date(session.loginTime);
                const now = new Date();
                const hoursDiff = (now - loginTime) / (1000 * 60 * 60);
                
                if (hoursDiff < 24) {
                    console.log('✅ Müşteri oturumu bulundu:', session.name);
                    
                    this.currentUser = {
                        id: session.id,
                        user_metadata: {
                            name: session.name,
                            role: session.role,
                            phone: session.phone
                        }
                    };

                    this.userProfile = {
                        id: session.id,
                        name: session.name,
                        role: session.role,
                        phone: session.phone,
                        bonus_balance: session.bonus_balance || 0
                    };

                    this.showPanel();
                    return;
                } else {
                    console.log('⚠️ Müşteri oturumu süresi dolmuş');
                    localStorage.removeItem('customerSession');
                }
            }

            console.log('ℹ️ Mevcut oturum bulunamadı');

        } catch (error) {
            console.error('❌ Mevcut auth kontrol hatası:', error);
        }
    }

    selectLoginType(type) {
        this.loginType = type;
        
        document.querySelectorAll('.login-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        
        const selectedBtn = document.querySelector(`[data-type="${type}"]`);
        if (selectedBtn) {
            selectedBtn.classList.add('selected');
        }
        
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

    // Personel Girişi
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
            const { data, error } = await this.supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            if (error) throw error;

            if (data.user) {
                await this.loadUserProfile(data.user);
                
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

    // WhatsApp Doğrulamalı Müşteri Girişi
    async customerLogin() {
        const phoneInput = document.getElementById('customerPhone');
        const nameInput = document.getElementById('customerName');
        
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
            console.log('📞 WhatsApp doğrulama başlatılıyor:', cleanPhone);

            const verificationCode = this.generateVerificationCode();
            this.saveVerificationCode(cleanPhone, verificationCode);

            await this.sendWhatsAppVerification(cleanPhone, verificationCode);

            this.showVerificationModal(cleanPhone, name);

        } catch (error) {
            console.error('❌ WhatsApp doğrulama hatası:', error);
            this.showAlert(error.message || 'Doğrulama kodu gönderilemedi.', 'error');
        }
    }

    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    saveVerificationCode(phone, code) {
        const expiry = Date.now() + (10 * 60 * 1000);
        sessionStorage.setItem(`verification_${phone}`, JSON.stringify({
            code: code,
            expiry: expiry
        }));
        return code;
    }

    verifyCode(phone, enteredCode) {
        const stored = sessionStorage.getItem(`verification_${phone}`);
        
        if (!stored) {
            return { success: false, error: 'Doğrulama kodu bulunamadı veya süresi dolmuş' };
        }

        const verification = JSON.parse(stored);
        
        if (Date.now() > verification.expiry) {
            sessionStorage.removeItem(`verification_${phone}`);
            return { success: false, error: 'Doğrulama kodu süresi dolmuş' };
        }

        if (verification.code !== enteredCode) {
            return { success: false, error: 'Doğrulama kodu hatalı' };
        }

        sessionStorage.removeItem(`verification_${phone}`);
        return { success: true };
    }

    async sendWhatsAppVerification(phone, code) {
        try {
            // Backend API'ye gönder
            const response = await fetch('/api/send-whatsapp-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: `+90${phone}`,
                    code: code
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'WhatsApp gönderilemedi');
            }

            console.log('✅ WhatsApp doğrulama kodu gönderildi');
            
            // Development modunda kodu göster
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.log('🔐 Development Doğrulama Kodu:', code);
                this.showAlert(`Development: Doğrulama kodunuz: ${code}`, 'info');
            }

        } catch (error) {
            console.error('WhatsApp gönderme hatası:', error);
            
            if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
                console.warn('⚠️ API hatası, development kodu gösteriliyor:', code);
                this.showAlert(`Development: Doğrulama kodunuz: ${code}`, 'info');
            } else {
                throw new Error('Doğrulama kodu gönderilemedi. Lütfen daha sonra tekrar deneyin.');
            }
        }
    }

    showVerificationModal(phone, name) {
        const modalHtml = `
            <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div class="modal" style="background: white; border-radius: 12px; padding: 30px; width: 90%; max-width: 400px;">
                    <div class="modal-header" style="text-align: center; margin-bottom: 20px;">
                        <div style="font-size: 48px; color: #25D366; margin-bottom: 10px;">
                            <i class="fab fa-whatsapp"></i>
                        </div>
                        <h3 style="margin: 0 0 10px 0;">WhatsApp Doğrulama</h3>
                        <p style="color: #666; margin: 0;">
                            ${phone} numarasına doğrulama kodu gönderildi
                        </p>
                    </div>
                    
                    <form id="verificationForm">
                        <div class="form-group">
                            <label for="verificationCode">Doğrulama Kodu</label>
                            <input type="text" id="verificationCode" class="form-control" 
                                   placeholder="6 haneli kodu girin" maxlength="6" 
                                   style="text-align: center; font-size: 18px; letter-spacing: 5px;"
                                   oninput="this.value = this.value.replace(/[^0-9]/g, '')">
                            <div id="codeTimer" style="text-align: center; margin-top: 10px; color: #666; font-size: 14px;">
                                Kodu 10:00 içinde girin
                            </div>
                        </div>
                        
                        <div class="form-actions" style="display: flex; gap: 10px; margin-top: 20px;">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                                İptal
                            </button>
                            <button type="submit" class="btn btn-primary">
                                <i class="fas fa-check"></i> Doğrula
                            </button>
                        </div>
                    </form>
                    
                    <div style="text-align: center; margin-top: 15px;">
                        <button type="button" class="btn btn-link" id="resendCodeBtn" style="color: #666;">
                            <i class="fas fa-redo"></i> Kodu Tekrar Gönder
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        this.startVerificationTimer(phone);

        document.getElementById('verificationForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.verifyCustomerCode(phone, name);
        });

        document.getElementById('resendCodeBtn').addEventListener('click', () => {
            this.resendVerificationCode(phone);
        });
    }

    startVerificationTimer(phone) {
        const timerElement = document.getElementById('codeTimer');
        let timeLeft = 10 * 60;

        const timer = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            timerElement.textContent = `Kodu ${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')} içinde girin`;
            
            if (timeLeft <= 0) {
                clearInterval(timer);
                timerElement.innerHTML = '<span style="color: red;">Kod süresi doldu</span>';
                document.getElementById('verificationCode').disabled = true;
                document.querySelector('button[type="submit"]').disabled = true;
            }
            
            timeLeft--;
        }, 1000);
    }

    async verifyCustomerCode(phone, name) {
        const codeInput = document.getElementById('verificationCode');
        const enteredCode = codeInput.value.trim();

        if (!enteredCode || enteredCode.length !== 6) {
            this.showAlert('Lütfen 6 haneli doğrulama kodunu girin.', 'error');
            return;
        }

        try {
            const verification = this.verifyCode(phone, enteredCode);
            
            if (!verification.success) {
                this.showAlert(verification.error, 'error');
                return;
            }

            await this.completeCustomerLogin(phone, name);
            document.querySelector('.modal-overlay').remove();

        } catch (error) {
            console.error('Doğrulama hatası:', error);
            this.showAlert('Doğrulama sırasında hata oluştu.', 'error');
        }
    }

    async completeCustomerLogin(phone, name) {
        try {
            let { data: customer, error } = await this.supabase
                .from('customers')
                .select('*')
                .eq('phone', phone)
                .single();

            let customerData;

            if (error && error.code !== 'PGRST116') {
                throw new Error('Müşteri kontrolü sırasında hata oluştu');
            }

            if (!customer) {
                const newCustomerData = {
                    name: name || 'Müşteri',
                    phone: phone,
                    role: 'üye',
                    customer_type: 'Market Müşterisi',
                    status: 'active',
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                };

                const { data: newCustomer, error: createError } = await this.supabase
                    .from('customers')
                    .insert([newCustomerData])
                    .select()
                    .single();

                if (createError) throw createError;
                customerData = newCustomer;
                this.showAlert('Hoş geldiniz! Yeni kaydınız oluşturuldu.', 'success');
            } else {
                customerData = customer;
                this.showAlert(`Hoş geldiniz ${customer.name}!`, 'success');
            }

            this.setCustomerSession(customerData);

        } catch (error) {
            console.error('Müşteri kaydı hatası:', error);
            throw error;
        }
    }

    async resendVerificationCode(phone) {
        try {
            const newCode = this.generateVerificationCode();
            this.saveVerificationCode(phone, newCode);
            
            await this.sendWhatsAppVerification(phone, newCode);
            this.showAlert('Yeni doğrulama kodu gönderildi.', 'success');
            
        } catch (error) {
            console.error('Kod tekrar gönderme hatası:', error);
            this.showAlert('Kod tekrar gönderilemedi.', 'error');
        }
    }

    setCustomerSession(customerData) {
        const sessionData = {
            id: customerData.id,
            type: 'customer',
            name: customerData.name,
            phone: customerData.phone,
            role: customerData.role,
            customer_type: customerData.customer_type,
            bonus_balance: customerData.bonus_balance || 0,
            loginTime: new Date().toISOString()
        };

        localStorage.setItem('customerSession', JSON.stringify(sessionData));
        
        this.currentUser = {
            id: customerData.id,
            user_metadata: {
                name: customerData.name,
                role: customerData.role,
                phone: customerData.phone
            }
        };

        this.userProfile = {
            id: customerData.id,
            name: customerData.name,
            role: customerData.role,
            phone: customerData.phone,
            bonus_balance: customerData.bonus_balance || 0,
            address: customerData.address,
            city: customerData.city,
            district: customerData.district,
            group_code: customerData.group_code
        };

        console.log('✅ Müşteri oturumu oluşturuldu:', sessionData);
        this.showPanel();
    }

    cleanPhoneNumber(phone) {
        return phone.replace(/\D/g, '');
    }

    isValidPhoneNumber(phone) {
        const phoneRegex = /^5[0-9]{9}$/;
        return phoneRegex.test(phone);
    }

    // Personel Kaydı
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

            const { data: authData, error: authError } = await this.supabase.auth.signUp({
                email: email,
                password: password,
                options: {
                    data: {
                        name: fullName,
                        role: role,
                        phone: phone
                    }
                }
            });

            if (authError) throw authError;

            if (authData.user) {
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

        await this.createUserProfile(user.id, userData, role);
    }

    async createSellerProfile(userId, userData) {
        try {
            const { data, error } = await this.supabase
                .from('seller_profiles')
                .insert([{
                    seller_id: userId,
                    business_name: `${userData.fullName} İşletmesi`,
                    phone: userData.phone,
                    email: userData.email,
                    status: false,
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
            const { data, error } = await this.supabase
                .from('couriers')
                .insert([{
                    user_id: userId,
                    full_name: userData.fullName,
                    phone: userData.phone,
                    email: userData.email,
                    status: 'inactive',
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
            const { data, error } = await this.supabase
                .from('profiles')
                .insert([{
                    id: userId,
                    name: userData.fullName,
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

    async loadUserProfile(user) {
        this.currentUser = user;
        
        try {
            const { data: profile, error } = await this.supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (profile && !error) {
                this.userProfile = profile;
            } else {
                this.userProfile = {
                    id: user.id,
                    name: user.user_metadata?.name || user.email?.split('@')[0] || 'Kullanıcı',
                    role: user.user_metadata?.role || 'customer',
                    phone: user.user_metadata?.phone,
                    created_at: new Date().toISOString()
                };
            }
        } catch (error) {
            console.error('Profil yükleme hatası:', error);
            this.userProfile = {
                id: user.id,
                name: user.user_metadata?.name || user.email?.split('@')[0] || 'Kullanıcı',
                role: user.user_metadata?.role || 'customer',
                phone: user.user_metadata?.phone,
                created_at: new Date().toISOString()
            };
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

    showPanel() {
        document.querySelector('.auth-container').style.display = 'none';
        
        const panelContainer = document.getElementById('panelContainer');
        if (panelContainer) {
            panelContainer.style.display = 'grid';
        }
        
        if (typeof window.panelSystem !== 'undefined') {
            window.panelSystem.initializePanel(this.userProfile);
        } else {
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
