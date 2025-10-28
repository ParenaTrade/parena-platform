// auth-system.js - TAMAMEN YENİLENMİŞ VERSİYON

// WhatsApp Doğrulamalı Auth System - Tüm kullanıcılar için
class PasswordManager {
    constructor() {
        this.SALT_LENGTH = 16;
    }

    // Rastgele salt oluştur
    generateSalt() {
        const array = new Uint8Array(this.SALT_LENGTH);
        crypto.getRandomValues(array);
        return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
    }

    // Şifreyi hash'le (async - tarayıcıda çalışır)
    async hashPassword(password, salt = null) {
        const actualSalt = salt || this.generateSalt();
        
        // TextEncoder ile password'u encode et
        const encoder = new TextEncoder();
        const passwordBuffer = encoder.encode(password);
        
        // Salt'ı Uint8Array'e çevir
        const saltBuffer = encoder.encode(actualSalt);
        
        // Password + salt birleştir
        const combinedBuffer = new Uint8Array(passwordBuffer.length + saltBuffer.length);
        combinedBuffer.set(passwordBuffer);
        combinedBuffer.set(saltBuffer, passwordBuffer.length);
        
        // SHA-256 hash
        const hashBuffer = await crypto.subtle.digest('SHA-256', combinedBuffer);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        
        return {
            hash: hashHex,
            salt: actualSalt
        };
    }

    // Şifreyi doğrula
    async verifyPassword(password, storedHash, storedSalt) {
        try {
            const { hash } = await this.hashPassword(password, storedSalt);
            return hash === storedHash;
        } catch (error) {
            console.error('Şifre doğrulama hatası:', error);
            return false;
        }
    }

    // Şifre güçlülüğünü kontrol et
    validatePasswordStrength(password) {
        const minLength = 6;
        const hasUpperCase = /[A-Z]/.test(password);
        const hasLowerCase = /[a-z]/.test(password);
        const hasNumbers = /\d/.test(password);
        const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

        if (password.length < minLength) {
            return { isValid: false, message: 'Şifre en az 6 karakter olmalıdır' };
        }

        // Güçlü şifre için öneriler (opsiyonel)
        const strengthScore = [hasUpperCase, hasLowerCase, hasNumbers, hasSpecialChar]
            .filter(Boolean).length;

        if (strengthScore >= 3) {
            return { isValid: true, message: 'Güçlü şifre' };
        } else {
            return { 
                isValid: true, 
                message: 'Şifrenizi güçlendirmek için büyük/küçük harf, rakam ve özel karakter kullanın' 
            };
        }
    }
}

class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.userType = 'customer';
        this.authMethod = 'password';
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        this.passwordManager = new PasswordManager();
        this.verificationData = null;
        this.countdownInterval = null;
        this.resendTimer = null;
        this.resendTimeLeft = 60;
        this.storeTypes = [];
        
        console.log('🔐 WhatsApp Auth System başlatılıyor...');
        this.init();
    }

    async init() {
        await this.loadStoreTypes();
        this.setupEventListeners();
        this.checkExistingSession();
        this.updateRoleDisplay();
    }

    async loadStoreTypes() {
        try {
            console.log('🏪 Mağaza türleri yükleniyor...');
            const { data, error } = await this.supabase
                .from('store_type')
                .select('id, name')
                .eq('status', 'Active')
                .order('name');

            if (error) throw error;
            
            this.storeTypes = data || [];
            console.log('✅ Mağaza türleri yüklendi:', this.storeTypes);
            this.populateStoreTypes();
            
        } catch (error) {
            console.error('❌ Mağaza türleri yüklenirken hata:', error);
        }
    }

    populateStoreTypes() {
        const storeTypeSelect = document.getElementById('storeType');
        if (storeTypeSelect) {
            // Mevcut seçenekleri temizle (ilk seçenek hariç)
            while (storeTypeSelect.options.length > 1) {
                storeTypeSelect.remove(1);
            }

            // Mağaza türlerini ekle
            this.storeTypes.forEach(storeType => {
                const option = document.createElement('option');
                option.value = storeType.id;
                option.textContent = storeType.name;
                storeTypeSelect.appendChild(option);
            });
            
            console.log('✅ Mağaza türleri selectbox\'a eklendi');
        }
    }

    setupEventListeners() {
        console.log('🎯 Event listener\'lar kuruluyor...');
        
        // Kullanıcı tipi butonları
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const type = e.currentTarget.dataset.type;
                if (type === 'whatsapp') {
                    this.switchToWhatsApp();
                } else {
                    this.selectUserType(type);
                    this.switchAuthMethod('password');
                }
            });
        });

        // Auth tabları
        const passwordTab = document.getElementById('passwordTab');
        const whatsappTab = document.getElementById('whatsappTab');
        if (passwordTab && whatsappTab) {
            passwordTab.addEventListener('click', () => this.switchAuthMethod('password'));
            whatsappTab.addEventListener('click', () => this.switchAuthMethod('whatsapp'));
        }

        // Password giriş formu
        const passwordLoginForm = document.getElementById('passwordLoginForm');
        if (passwordLoginForm) {
            passwordLoginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.passwordLogin();
            });
        }

        // Password kayıt formu
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.registerUser();
            });
        }

        // WhatsApp OTP gönderme butonu
        const sendOtpBtn = document.getElementById('sendOtpBtn');
        if (sendOtpBtn) {
            sendOtpBtn.addEventListener('click', () => {
                this.sendWhatsAppOTP();
            });
        }

        // WhatsApp OTP doğrulama butonu
        const verifyOtpBtn = document.getElementById('verifyOtpBtn');
        if (verifyOtpBtn) {
            verifyOtpBtn.addEventListener('click', () => {
                this.verifyWhatsAppOTP();
            });
        }

        // OTP input enter tuşu
        const otpCodeInput = document.getElementById('otpCode');
        if (otpCodeInput) {
            otpCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.verifyWhatsAppOTP();
                }
            });
        }

        // Geri dön butonu
        const backToPhone = document.getElementById('backToPhone');
        if (backToPhone) {
            backToPhone.addEventListener('click', (e) => {
                e.preventDefault();
                this.showPhoneStep();
            });
        }

        // Tekrar gönder butonu
        const resendOtp = document.getElementById('resendOtp');
        if (resendOtp) {
            resendOtp.addEventListener('click', () => {
                if (!resendOtp.classList.contains('disabled')) {
                    this.resendOTP();
                }
            });
        }

        // Giriş/Kayıt geçiş
        const showRegister = document.getElementById('showRegister');
        const showLogin = document.getElementById('showLogin');
        if (showRegister) {
            showRegister.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAuthForm('register');
            });
        }
        if (showLogin) {
            showLogin.addEventListener('click', (e) => {
                e.preventDefault();
                this.showAuthForm('login');
            });
        }

        console.log('✅ Event listener\'lar kuruldu');
    }

    selectUserType(type) {
        this.userType = type;
        
        // Buton seçimini güncelle
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector(`[data-type="${type}"]`).classList.add('selected');
        
        this.updateRoleDisplay();
        this.toggleStoreTypeField();
        console.log(`👤 Kullanıcı tipi seçildi: ${type}`);
    }

    toggleStoreTypeField() {
        const storeTypeField = document.getElementById('storeTypeField');
        const storeTypeSelect = document.getElementById('storeType');
        
        if (this.userType === 'seller') {
            storeTypeField.classList.add('visible');
            storeTypeSelect.required = true;
            console.log('🏪 Mağaza türü alanı gösterildi');
        } else {
            storeTypeField.classList.remove('visible');
            storeTypeSelect.required = false;
            console.log('🏪 Mağaza türü alanı gizlendi');
        }
    }

    switchAuthMethod(method) {
        this.authMethod = method;
        const passwordTab = document.getElementById('passwordTab');
        const whatsappTab = document.getElementById('whatsappTab');
        const passwordForm = document.getElementById('passwordAuthForm');
        const whatsappForm = document.getElementById('whatsappAuthForm');

        if (passwordTab && whatsappTab && passwordForm && whatsappForm) {
            // Tabları güncelle
            passwordTab.classList.toggle('active', method === 'password');
            whatsappTab.classList.toggle('active', method === 'whatsapp');

            // Formları güncelle
            passwordForm.style.display = method === 'password' ? 'block' : 'none';
            whatsappForm.style.display = method === 'whatsapp' ? 'block' : 'none';

            // WhatsApp seçildiğinde telefon adımını göster
            if (method === 'whatsapp') {
                this.showPhoneStep();
            }
        }

        console.log(`🔄 Auth method değiştirildi: ${method}`);
    }

    switchToWhatsApp() {
        this.authMethod = 'whatsapp';
        
        // Buton seçimini güncelle
        document.querySelectorAll('.user-type-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.querySelector('[data-type="whatsapp"]').classList.add('selected');
        
        // Formları güncelle
        const passwordTab = document.getElementById('passwordTab');
        const whatsappTab = document.getElementById('whatsappTab');
        const passwordForm = document.getElementById('passwordAuthForm');
        const whatsappForm = document.getElementById('whatsappAuthForm');

        if (passwordTab && whatsappTab) {
            passwordTab.classList.remove('active');
            whatsappTab.classList.add('active');
        }

        if (passwordForm && whatsappForm) {
            passwordForm.style.display = 'none';
            whatsappForm.style.display = 'block';
        }

        this.showPhoneStep();
        this.updateRoleDisplay();
        console.log(`📱 WhatsApp auth seçildi, rol: ${this.userType}`);
    }

    showAuthForm(type) {
        const loginForm = document.getElementById('passwordLoginForm');
        const registerForm = document.getElementById('registerForm');
        
        if (loginForm && registerForm) {
            if (type === 'register') {
                loginForm.style.display = 'none';
                registerForm.style.display = 'block';
            } else {
                loginForm.style.display = 'block';
                registerForm.style.display = 'none';
            }
        }
    }

    showPhoneStep() {
        const phoneStep = document.getElementById('phoneStep');
        const otpStep = document.getElementById('otpStep');
        
        if (phoneStep && otpStep) {
            phoneStep.classList.add('active');
            otpStep.classList.remove('active');
        }
        
        // Timers'ı temizle
        this.clearTimers();
    }

    showOtpStep() {
        const phoneStep = document.getElementById('phoneStep');
        const otpStep = document.getElementById('otpStep');
        
        if (phoneStep && otpStep) {
            phoneStep.classList.remove('active');
            otpStep.classList.add('active');
        }
        
        // OTP input'una focusla
        const otpCodeInput = document.getElementById('otpCode');
        if (otpCodeInput) {
            otpCodeInput.focus();
        }
        
        // Countdown'ı başlat
        this.startCountdown();
        
        // Tekrar gönder timer'ını başlat
        this.startResendTimer();
    }

    updateRoleDisplay() {
        const roleNames = {
            'customer': 'MÜŞTERİ',
            'seller': 'SATICI', 
            'courier': 'KURYE',
            'whatsapp': 'MÜŞTERİ'
        };
        
        const roleDescriptions = {
            'customer': 'Müşteri olarak giriş yapıyorsunuz',
            'seller': 'Satıcı olarak giriş yapıyorsunuz',
            'courier': 'Kurye olarak giriş yapıyorsunuz',
            'whatsapp': 'WhatsApp ile doğrulama yapıyorsunuz'
        };

        // Normal form için
        const currentRoleBadge = document.getElementById('currentRoleBadge');
        const roleDescription = document.getElementById('roleDescription');
        if (currentRoleBadge) currentRoleBadge.textContent = roleNames[this.userType];
        if (roleDescription) roleDescription.textContent = roleDescriptions[this.userType];

        // Kayıt formu için
        const registerRoleBadge = document.getElementById('registerRoleBadge');
        const registerRoleDescription = document.getElementById('registerRoleDescription');
        if (registerRoleBadge) registerRoleBadge.textContent = roleNames[this.userType];
        if (registerRoleDescription) registerRoleDescription.textContent = 
            `${roleDescriptions[this.userType]} olarak kayıt oluyorsunuz`;

        // WhatsApp form için  
        const whatsappRoleBadge = document.getElementById('whatsappRoleBadge');
        const whatsappRoleDescription = document.getElementById('whatsappRoleDescription');
        if (whatsappRoleBadge) whatsappRoleBadge.textContent = roleNames[this.userType];
        if (whatsappRoleDescription) whatsappRoleDescription.textContent = 
            `${roleDescriptions[this.userType]} - WhatsApp doğrulama ile`;

        // OTP step için
        const otpRoleBadge = document.getElementById('otpRoleBadge');
        if (otpRoleBadge) otpRoleBadge.textContent = roleNames[this.userType];
    }

    async passwordLogin() {
        const phone = this.cleanPhoneNumber(document.getElementById('loginPhone').value.trim());
        const password = document.getElementById('loginPassword').value;

        if (!phone || !password) {
            this.showAlert('Lütfen telefon ve şifrenizi girin.', 'error');
            return;
        }

        try {
            console.log(`🔐 ${this.userType} girişi:`, phone);
            
            let userData;
            switch(this.userType) {
                case 'customer':
                    userData = await this.verifyCustomerPassword(phone, password);
                    break;
                case 'seller':
                    userData = await this.verifySellerPassword(phone, password);
                    break;
                case 'courier':
                    userData = await this.verifyCourierPassword(phone, password);
                    break;
            }

            this.setUserSession(userData, this.userType);
            this.showAlert(`Hoş geldiniz ${userData.name || userData.business_name || userData.full_name}!`, 'success');
            this.redirectToIndex();

        } catch (error) {
            console.error('❌ Giriş hatası:', error);
            this.showAlert(error.message || 'Giriş başarısız.', 'error');
        }
    }

    async registerUser() {
        const name = document.getElementById('registerName').value.trim();
        const phone = this.cleanPhoneNumber(document.getElementById('registerPhone').value.trim());
        const password = document.getElementById('registerPassword').value;
        const confirmPassword = document.getElementById('registerConfirmPassword').value;

        if (!name || !phone || !password) {
            this.showAlert('Lütfen tüm alanları doldurun.', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showAlert('Şifreler eşleşmiyor.', 'error');
            return;
        }

        // Şifre güçlülük kontrolü
        const strengthCheck = this.passwordManager.validatePasswordStrength(password);
        if (!strengthCheck.isValid) {
            this.showAlert(strengthCheck.message, 'error');
            return;
        }

        try {
            console.log(`📝 ${this.userType} kaydı:`, { name, phone });

            // Şifreyi hash'le
            const { hash, salt } = await this.passwordManager.hashPassword(password);

            let userData;
            switch(this.userType) {
                case 'customer':
                    userData = await this.registerCustomer(name, phone, hash, salt);
                    break;
                case 'seller':
                    const storeTypeId = document.getElementById('storeType').value;
                    if (!storeTypeId) {
                        this.showAlert('Lütfen mağaza türünü seçin!', 'error');
                        return;
                    }
                    userData = await this.registerSeller(name, phone, hash, salt, storeTypeId);
                    break;
                case 'courier':
                    userData = await this.registerCourier(name, phone, hash, salt);
                    break;
            }

            this.showAuthForm('login');
            this.showAlert(`Kayıt başarılı! Giriş yapabilirsiniz.`, 'success');

        } catch (error) {
            console.error('❌ Kayıt hatası:', error);
            this.showAlert(error.message || 'Kayıt başarısız.', 'error');
        }
    }

    async sendWhatsAppOTP() {
        const phone = this.cleanPhoneNumber(document.getElementById('whatsappPhone').value.trim());

        if (!phone) {
            this.showAlert('Lütfen telefon numaranızı girin.', 'error');
            return;
        }

        if (!this.isValidPhoneNumber(phone)) {
            this.showAlert('Lütfen geçerli bir telefon numarası girin.', 'error');
            return;
        }

        try {
            console.log(`📞 ${this.userType} için WhatsApp OTP gönderiliyor:`, phone);

            // Butonu loading durumuna getir
            const sendOtpBtn = document.getElementById('sendOtpBtn');
            const originalText = sendOtpBtn.innerHTML;
            sendOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Gönderiliyor...';
            sendOtpBtn.disabled = true;

            const verificationCode = this.generateVerificationCode();
            this.saveVerificationCode(phone, verificationCode);

            // WhatsApp API entegrasyonu
            await this.sendWhatsAppVerification(phone, verificationCode);

            // OTP adımına geç
            this.showOtpStep();
            
            // Butonu eski haline getir
            sendOtpBtn.innerHTML = originalText;
            sendOtpBtn.disabled = false;

            this.showAlert(`Doğrulama kodu ${phone} numarasına gönderildi.`, 'success');

        } catch (error) {
            console.error('❌ WhatsApp OTP gönderme hatası:', error);
            
            // Butonu eski haline getir
            const sendOtpBtn = document.getElementById('sendOtpBtn');
            sendOtpBtn.innerHTML = '<i class="fab fa-whatsapp"></i> WhatsApp ile Doğrulama';
            sendOtpBtn.disabled = false;
            
            this.showAlert(error.message || 'Doğrulama kodu gönderilemedi.', 'error');
        }
    }

    async verifyWhatsAppOTP() {
        const otpCode = document.getElementById('otpCode').value.trim();
        const phone = this.verificationData?.phone;

        if (!otpCode || otpCode.length !== 6) {
            this.showAlert('Lütfen 6 haneli doğrulama kodunu girin.', 'error');
            return;
        }

        if (!phone) {
            this.showAlert('OTP doğrulama hatası. Lütfen tekrar deneyin.', 'error');
            return;
        }

        try {
            console.log(`🔐 OTP doğrulanıyor: ${phone} - ${otpCode}`);

            // Butonu loading durumuna getir
            const verifyOtpBtn = document.getElementById('verifyOtpBtn');
            const originalText = verifyOtpBtn.innerHTML;
            verifyOtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Doğrulanıyor...';
            verifyOtpBtn.disabled = true;

            // OTP'yi doğrula
            const isValid = await this.verifyOTPCode(phone, otpCode);
            
            if (isValid) {
                // Kullanıcıyı giriş yap veya kaydet
                await this.completeUserLogin(phone, '', this.userType);
                
                // Butonu başarılı duruma getir
                verifyOtpBtn.innerHTML = '<i class="fas fa-check"></i> Doğrulandı!';
                verifyOtpBtn.style.background = '#28a745';
                
                // 1 saniye bekle ve yönlendir
                setTimeout(() => {
                    this.redirectToIndex();
                }, 1000);
                
            } else {
                throw new Error('Geçersiz doğrulama kodu');
            }

        } catch (error) {
            console.error('❌ OTP doğrulama hatası:', error);
            
            // Butonu eski haline getir
            const verifyOtpBtn = document.getElementById('verifyOtpBtn');
            verifyOtpBtn.innerHTML = '<i class="fas fa-check-circle"></i> OTP Kodunu Doğrula';
            verifyOtpBtn.disabled = false;
            
            this.showAlert(error.message || 'Doğrulama başarısız.', 'error');
        }
    }

    async resendOTP() {
        const phone = this.verificationData?.phone;
        
        if (!phone) {
            this.showAlert('Telefon numarası bulunamadı.', 'error');
            return;
        }

        try {
            const verificationCode = this.generateVerificationCode();
            this.saveVerificationCode(phone, verificationCode);
            await this.sendWhatsAppVerification(phone, verificationCode);
            
            this.showAlert('Yeni doğrulama kodu gönderildi.', 'success');
            this.startResendTimer();
            
        } catch (error) {
            console.error('❌ OTP tekrar gönderme hatası:', error);
            this.showAlert(error.message || 'Kod gönderilemedi.', 'error');
        }
    }

    startCountdown() {
        let timeLeft = 300; // 5 dakika
        
        this.clearTimers();
        
        this.countdownInterval = setInterval(() => {
            const minutes = Math.floor(timeLeft / 60);
            const seconds = timeLeft % 60;
            
            const countdownElement = document.getElementById('countdown');
            if (countdownElement) {
                countdownElement.textContent = `Kod ${minutes}:${seconds.toString().padStart(2, '0')} dakika geçerlidir`;
            }
            
            if (timeLeft <= 0) {
                this.clearTimers();
                this.showAlert('Doğrulama kodunun süresi doldu.', 'error');
                this.showPhoneStep();
            }
            
            timeLeft--;
        }, 1000);
    }

    startResendTimer() {
        this.resendTimeLeft = 60;
        const resendOtp = document.getElementById('resendOtp');
        
        if (resendOtp) {
            resendOtp.classList.add('disabled');
            resendOtp.textContent = `Kodu tekrar gönder (${this.resendTimeLeft})`;
        }
        
        this.resendTimer = setInterval(() => {
            this.resendTimeLeft--;
            
            if (resendOtp) {
                resendOtp.textContent = `Kodu tekrar gönder (${this.resendTimeLeft})`;
            }
            
            if (this.resendTimeLeft <= 0) {
                clearInterval(this.resendTimer);
                if (resendOtp) {
                    resendOtp.classList.remove('disabled');
                    resendOtp.textContent = 'Kodu tekrar gönder';
                }
            }
        }, 1000);
    }

    clearTimers() {
        if (this.countdownInterval) {
            clearInterval(this.countdownInterval);
            this.countdownInterval = null;
        }
        if (this.resendTimer) {
            clearInterval(this.resendTimer);
            this.resendTimer = null;
        }
    }

    // OTP Doğrulama Fonksiyonları
    generateVerificationCode() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    saveVerificationCode(phone, code) {
        this.verificationData = {
            code: code,
            phone: phone,
            timestamp: Date.now(),
            expires: Date.now() + (5 * 60 * 1000) // 5 dakika
        };
        
        localStorage.setItem(`verification_${phone}`, JSON.stringify(this.verificationData));
    }

    async verifyOTPCode(phone, enteredCode) {
        const storedData = localStorage.getItem(`verification_${phone}`);
        
        if (!storedData) {
            throw new Error('Doğrulama kodu bulunamadı');
        }
        
        const verificationData = JSON.parse(storedData);
        
        // Süre kontrolü
        if (Date.now() > verificationData.expires) {
            localStorage.removeItem(`verification_${phone}`);
            throw new Error('Doğrulama kodunun süresi dolmuş');
        }
        
        // Kod kontrolü
        if (verificationData.code !== enteredCode) {
            throw new Error('Geçersiz doğrulama kodu');
        }
        
        // Doğrulama başarılı, kodu temizle
        localStorage.removeItem(`verification_${phone}`);
        return true;
    }

    async sendWhatsAppVerification(phone, code) {
        // GERÇEK WhatsApp API ENTEGRASYONU BURADA YAPILACAK
        // Şimdilik simüle ediyoruz
        
        console.log(`📱 WhatsApp API: ${phone} numarasına OTP gönderiliyor: ${code}`);
        
        // Simüle edilmiş API çağrısı
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Geliştirme modunda kodu konsola yazdır
        if (this.config.environment === 'development') {
            console.log(`🔐 GELİŞTİRME MODU - OTP Kodu: ${code}`);
            console.log(`📞 ${phone} numarasına gönderilecek (WhatsApp entegrasyonu pasif)`);
        }
    }

    // Veritabanı İşlemleri - Hash + Salt ile
    async verifyCustomerPassword(phone, password) {
        const { data: customer, error } = await this.supabase
            .from('customers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error) {
            throw new Error('Müşteri bulunamadı');
        }

        // Demo kayıt kontrolü - demo şifresiyle girişe izin ver
        if (customer.password_hash === 'demo_hash_123' && password === 'demo123') {
            console.log('✅ Demo kayıt ile giriş yapıldı');
            return customer;
        }

        // Normal şifre doğrulama
        const isValid = await this.passwordManager.verifyPassword(
            password, 
            customer.password_hash, 
            customer.password_salt
        );

        if (!isValid) {
            throw new Error('Şifre hatalı');
        }

        return customer;
    }

    async verifySellerPassword(phone, password) {
        const { data: seller, error } = await this.supabase
            .from('seller_profiles')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error) throw new Error('Satıcı bulunamadı');

        // Demo kayıt kontrolü
        if (seller.password_hash === 'demo_hash_123' && password === 'demo123') {
            console.log('✅ Demo satıcı ile giriş yapıldı');
            return seller;
        }

        const isValid = await this.passwordManager.verifyPassword(
            password, 
            seller.password_hash, 
            seller.password_salt
        );

        if (!isValid) throw new Error('Şifre hatalı');
        return seller;
    }

    async verifyCourierPassword(phone, password) {
        const { data: courier, error } = await this.supabase
            .from('couriers')
            .select('*')
            .eq('phone', phone)
            .single();

        if (error) throw new Error('Kurye bulunamadı');

        // Demo kayıt kontrolü
        if (courier.password_hash === 'demo_hash_123' && password === 'demo123') {
            console.log('✅ Demo kurye ile giriş yapıldı');
            return courier;
        }

        const isValid = await this.passwordManager.verifyPassword(
            password, 
            courier.password_hash, 
            courier.password_salt
        );

        if (!isValid) throw new Error('Şifre hatalı');
        return courier;
    }

    // Kayıt fonksiyonlarını güncelle - HASH + SALT ile kayıt yapacak
    async registerCustomer(name, phone, passwordHash, passwordSalt) {
        const { data: existingCustomer } = await this.supabase
            .from('customers')
            .select('id')
            .eq('phone', phone)
            .single();

        if (existingCustomer) {
            throw new Error('Bu telefon numarası zaten kayıtlı');
        }

        const newCustomer = {
            name: name,
            phone: phone,
            password_hash: passwordHash,  // Hash'lenmiş şifre
            password_salt: passwordSalt,  // Salt değeri
            role: 'üye',
            customer_type: 'Market Müşterisi',
            status: 'active',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: customer, error } = await this.supabase
            .from('customers')
            .insert([newCustomer])
            .select()
            .single();

        if (error) throw error;
        return customer;
    }

    async registerSeller(name, phone, passwordHash, passwordSalt, storeTypeId) {
        console.log('📝 Satıcı kaydı başlatılıyor:', { name, phone, storeTypeId });

        const { data: existingSeller } = await this.supabase
            .from('seller_profiles')
            .select('id')
            .eq('phone', phone)
            .single();

        if (existingSeller) {
            throw new Error('Bu telefon numarası zaten kayıtlı');
        }

        const newSeller = {
            business_name: name,
            phone: phone,
            password_hash: passwordHash,
            password_salt: passwordSalt,
            store_type_id: storeTypeId,
            status: false,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        const { data: seller, error } = await this.supabase
            .from('seller_profiles')
            .insert([newSeller])
            .select()
            .single();

        if (error) {
            console.error('❌ Satıcı kayıt hatası:', error);
            throw error;
        }

        console.log('✅ Satıcı kaydı başarılı:', seller);
        return seller;
    }

    async registerCourier(name, phone, passwordHash, passwordSalt) {
        const { data: existingCourier } = await this.supabase
            .from('couriers')
            .select('id')
            .eq('phone', phone)
            .single();

        if (existingCourier) {
            throw new Error('Bu telefon numarası zaten kayıtlı');
        }

        const newCourier = {
            full_name: name,
            phone: phone,
            password_hash: passwordHash,  // Hash'lenmiş şifre
            password_salt: passwordSalt,  // Salt değeri
            status: 'inactive',
            vehicle_type: 'motorcycle',
            created_at: new Date().toISOString()
        };

        const { data: courier, error } = await this.supabase
            .from('couriers')
            .insert([newCourier])
            .select()
            .single();

        if (error) throw error;
        return courier;
    }

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
            this.showAlert(`Hoş geldiniz!`, 'success');

        } catch (error) {
            console.error('Kullanıcı kaydı hatası:', error);
            throw error;
        }
    }

    // WhatsApp login için handle fonksiyonlarını da güncelle
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
            // WhatsApp ile girişte rastgele hash/salt oluştur
            const tempPassword = Math.random().toString(36).slice(-8);
            const { hash, salt } = await this.passwordManager.hashPassword(tempPassword);
            
            const newCustomer = {
                name: name || 'Müşteri',
                phone: phone,
                password_hash: hash,  // Rastgele hash
                password_salt: salt,  // Rastgele salt
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
            const tempPassword = Math.random().toString(36).slice(-8);
            const { hash, salt } = await this.passwordManager.hashPassword(tempPassword);
            
            const newSeller = {
                business_name: name ? `${name} İşletmesi` : 'Yeni İşletme',
                phone: phone,
                password_hash: hash,  // Rastgele hash
                password_salt: salt,  // Rastgele salt
                status: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
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
            const tempPassword = Math.random().toString(36).slice(-8);
            const { hash, salt } = await this.passwordManager.hashPassword(tempPassword);
            
            const newCourier = {
                full_name: name || 'Kurye',
                phone: phone,
                password_hash: hash,  // Rastgele hash
                password_salt: salt,  // Rastgele salt
                status: 'inactive',
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

    // Yardımcı Fonksiyonlar
    cleanPhoneNumber(phone) {
        return phone.replace(/\D/g, '');
    }

    isValidPhoneNumber(phone) {
        const cleanPhone = this.cleanPhoneNumber(phone);
        return cleanPhone.length >= 10 && cleanPhone.startsWith('5');
    }

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
    }

    redirectToIndex() {
        // Mevcut sayfanın zaten index.html olup olmadığını kontrol et
        const isAlreadyOnIndex = window.location.pathname.includes('index.html') || 
                                window.location.pathname === '/' ||
                                window.location.pathname.endsWith('/');
        
        if (isAlreadyOnIndex) {
            console.log('ℹ️ Zaten index sayfasındayız');
            return;
        }
        
        console.log('🔄 Index sayfasına yönlendiriliyor...');
        
        // Yönlendirmeden önce küçük bir gecikme
        setTimeout(() => {
            try {
                window.location.href = 'index.html';
            } catch (error) {
                console.error('❌ Yönlendirme hatası:', error);
            }
        }, 500);
    }
    
    async checkExistingSession() {
        try {
            const currentPage = window.location.pathname;
            const isIndexPage = currentPage.includes('index.html') || 
                               currentPage === '/' || 
                               currentPage.endsWith('/');
            const isLoginPage = currentPage.includes('login.html');

            console.log(`📄 Mevcut sayfa: ${currentPage}, Index: ${isIndexPage}, Login: ${isLoginPage}`);

            const userSession = localStorage.getItem('userSession');
            
            if (!userSession) {
                console.log('ℹ️ Oturum bulunamadı');
                if (isIndexPage) {
                    console.log('🚫 Index sayfasında oturum yok, login sayfasına yönlendiriliyor...');
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1000);
                }
                return;
            }

            const session = JSON.parse(userSession);
            const loginTime = new Date(session.loginTime);
            const now = new Date();
            const daysDiff = (now - loginTime) / (1000 * 60 * 60 * 24);
            
            if (daysDiff >= 7) {
                console.log('⚠️ Oturum süresi dolmuş');
                localStorage.removeItem('userSession');
                if (isIndexPage) {
                    setTimeout(() => {
                        window.location.href = 'login.html';
                    }, 1000);
                }
                return;
            }

            console.log('✅ Geçerli oturum bulundu:', session.type);
            
            this.userType = session.type;
            this.userProfile = {
                id: session.id,
                name: session.name,
                role: session.type,
                phone: session.phone
            };

            // YENİ (düzeltilmiş):
            if (isLoginPage) {
            console.log('🔐 Login sayfasındayız, oturum kontrolü atlanıyor...');
            return; // ❌ Yönlendirme YOK!
            } else if (isIndexPage) {
                console.log('✅ Index sayfasındayız ve oturum geçerli');
                
                // PanelSystem kontrolü - null ise hata verme
                if (typeof window.panelSystem !== 'undefined' && window.panelSystem !== null) {
                    window.panelSystem.initializePanel(this.userProfile);
                } else {
                    console.log('⚠️ PanelSystem henüz yüklenmedi veya mevcut değil');
                    // PanelSystem yüklenene kadar bekle
                    setTimeout(() => {
                        if (typeof window.panelSystem !== 'undefined' && window.panelSystem !== null) {
                            window.panelSystem.initializePanel(this.userProfile);
                        }
                    }, 1000);
                }
            }

        } catch (error) {
            console.error('❌ Oturum kontrol hatası:', error);
            // Hata durumunda oturumu temizle
            localStorage.removeItem('userSession');
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

    logout() {
        localStorage.removeItem('userSession');
        console.log('✅ Oturum sonlandırıldı');
        location.reload();
    }
}

// Uygulamayı başlat
document.addEventListener('DOMContentLoaded', () => {
    window.authSystem = new AuthSystem();
});
