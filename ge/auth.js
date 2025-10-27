class AuthSystem {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkExistingAuth();
    }

    setupEventListeners() {
        // Login/Register toggle
        document.getElementById('showRegister').addEventListener('click', (e) => {
            e.preventDefault();
            this.showRegister();
        });

        document.getElementById('showLogin').addEventListener('click', (e) => {
            e.preventDefault();
            this.showLogin();
        });

        // Form submissions
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.login();
        });

        document.getElementById('registerForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.register();
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

    showLogin() {
        document.getElementById('loginContainer').classList.add('active');
        document.getElementById('registerContainer').classList.remove('active');
    }

    showRegister() {
        document.getElementById('registerContainer').classList.add('active');
        document.getElementById('loginContainer').classList.remove('active');
    }

    selectRole(role) {
        document.querySelectorAll('.role-option').forEach(opt => {
            opt.classList.remove('selected');
        });
        document.querySelector(`[data-role="${role}"]`).classList.add('selected');
        document.getElementById('selectedRole').value = role;
    }

    async login() {
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;

        if (!email || !password) {
            this.showAlert('login', 'Lütfen tüm alanları doldurun.', 'error');
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
                this.showPanel();
                this.showAlert('login', 'Giriş başarılı!', 'success');
            }

        } catch (error) {
            console.error('Giriş hatası:', error);
            this.showAlert('login', error.message || 'Giriş sırasında bir hata oluştu.', 'error');
        }
    }

    async register() {
        const fullName = document.getElementById('regFullName').value;
        const email = document.getElementById('regEmail').value;
        const phone = document.getElementById('regPhone').value;
        const password = document.getElementById('regPassword').value;
        const role = document.getElementById('selectedRole').value;

        if (!fullName || !email || !phone || !password || !role) {
            this.showAlert('register', 'Lütfen tüm alanları doldurun.', 'error');
            return;
        }

        if (password.length < 6) {
            this.showAlert('register', 'Şifre en az 6 karakter olmalıdır.', 'error');
            return;
        }

        try {
            this.showAlert('register', 'Hesap oluşturuluyor...', 'success');

            const { data, error } = await supabase.auth.signUp({
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

            if (error) throw error;

            if (data.user) {
                await this.handleRoleSpecificSetup(data.user, role, { fullName, email, phone });
                this.showAlert('register', 'Kayıt başarılı! Yönlendiriliyorsunuz...', 'success');
                
                setTimeout(() => {
                    this.showLogin();
                    document.getElementById('loginEmail').value = email;
                }, 2000);
            }

        } catch (error) {
            console.error('Kayıt hatası:', error);
            this.showAlert('register', error.message || 'Kayıt sırasında bir hata oluştu.', 'error');
        }
    }

    async handleRoleSpecificSetup(user, role, userData) {
        switch (role) {
            case 'seller':
                await this.createSellerProfile(user.id, userData);
                break;
            case 'courier':
                await this.createCourierProfile(user.id, userData);
                break;
            case 'customer':
                await this.createCustomerProfile(user.id, userData);
                break;
        }
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
                    status: false,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            // Update profile with seller_id
            await supabase
                .from('profiles')
                .update({ seller_id: data.id })
                .eq('id', userId);

        } catch (error) {
            console.error('Satıcı profili oluşturma hatası:', error);
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
                    status: 'inactive',
                    vehicle_type: 'motorcycle',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

            // Update profile with courier_id
            await supabase
                .from('profiles')
                .update({ courier_id: data.id })
                .eq('id', userId);

        } catch (error) {
            console.error('Kurye profili oluşturma hatası:', error);
        }
    }

    async createCustomerProfile(userId, userData) {
        try {
            const { data, error } = await supabase
                .from('customers')
                .insert([{
                    id: userId,
                    name: userData.fullName,
                    phone: userData.phone,
                    role: 'customer',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;

        } catch (error) {
            console.error('Müşteri profili oluşturma hatası:', error);
        }
    }

    async loadUserProfile(user) {
        this.currentUser = user;
        
        const { data: profile, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

        if (profile) {
            this.userProfile = profile;
        } else {
            // Create profile if doesn't exist
            const { data: newProfile } = await supabase
                .from('profiles')
                .insert([{
                    id: user.id,
                    full_name: user.user_metadata?.full_name,
                    role: user.user_metadata?.role || 'customer',
                    phone: user.user_metadata?.phone,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            this.userProfile = newProfile;
        }
    }

    showPanel() {
        document.getElementById('loginContainer').classList.remove('active');
        document.getElementById('registerContainer').classList.remove('active');
        document.getElementById('panelContainer').style.display = 'grid';
        
        // Initialize appropriate panel
        window.panelSystem.initializePanel(this.userProfile);
    }

    showAlert(formType, message, type) {
        const alert = document.getElementById(formType === 'login' ? 'authAlert' : 'registerAlert');
        alert.textContent = message;
        alert.className = `alert alert-${type}`;
        alert.style.display = 'block';
        
        setTimeout(() => {
            alert.style.display = 'none';
        }, 5000);
    }

    async logout() {
        await supabase.auth.signOut();
        location.reload();
    }
}