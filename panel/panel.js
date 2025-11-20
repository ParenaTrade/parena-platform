// Tüm paneller için base class
class BasePanel {
    constructor() {
        this.currentUser = null;
        this.userProfile = null;
        this.initializePanel();
    }

    async initializePanel() {
        await this.checkAuth();
        await this.loadUserData();
        this.setupEventListeners();
        this.initializeRoleSpecificFeatures();
    }

    async checkAuth() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            window.location.href = 'login.html';
            return;
        }
        this.currentUser = user;
    }

    async loadUserData() {
        const { data: profile, error } = await supabase
            .from('profiles')
            .select(`
                *,
                seller_profiles (*),
                couriers (*)
            `)
            .eq('id', this.currentUser.id)
            .single();

        if (error) {
            console.error('Profil yükleme hatası:', error);
            await supabase.auth.signOut();
            window.location.href = 'login.html';
            return;
        }

        this.userProfile = profile;
        this.updateUI();
    }

    updateUI() {
        // Kullanıcı bilgilerini UI'da göster
        document.getElementById('userName').textContent = 
            this.userProfile.full_name || this.currentUser.email;
        document.getElementById('userRole').textContent = this.userProfile.role;
        document.getElementById('userAvatar').textContent = 
            (this.userProfile.full_name || 'U').charAt(0).toUpperCase();

        // Rol badge'ini güncelle
        const roleBadge = document.getElementById('userRole');
        roleBadge.className = `role role-${this.userProfile.role}`;
    }

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.addEventListener('click', (e) => {
                e.preventDefault();
                const section = item.getAttribute('data-section');
                this.showSection(section);
            });
        });

        // Çıkış butonu
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            await supabase.auth.signOut();
            window.location.href = 'login.html';
        });
    }

    showSection(sectionName) {
        // Tüm section'ları gizle
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Aktif section'ı göster
        document.getElementById(sectionName + 'Section').classList.add('active');

        // Navigation'ı güncelle
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');

        // Sayfa başlığını güncelle
        this.updatePageTitle(sectionName);
    }

    updatePageTitle(sectionName) {
        const titles = {
            'sellerInfo': 'Satıcı Bilgileri',
            'deliveryAreas': 'Teslimat Bölgeleri',
            'orders': 'Siparişler',
            'courierInfo': 'Kurye Bilgileri',
            'courierDeliveries': 'Teslimatlarım',
            'courierEarnings': 'Hakediş Listesi'
        };
        document.getElementById('pageTitle').textContent = titles[sectionName] || 'Panel';
    }

    initializeRoleSpecificFeatures() {
        // Rol'e özel menüleri göster/gizle
        document.getElementById('adminMenu').style.display = 
            this.userProfile.role === 'admin' ? 'block' : 'none';
        
        document.getElementById('adminSellerMenu').style.display = 
            ['admin', 'seller'].includes(this.userProfile.role) ? 'block' : 'none';
        
        document.getElementById('courierMenu').style.display = 
            this.userProfile.role === 'courier' ? 'block' : 'none';

        // İlk section'ı göster
        const initialSection = this.getInitialSection();
        this.showSection(initialSection);
    }

    getInitialSection() {
        switch (this.userProfile.role) {
            case 'seller': return 'sellerInfo';
            case 'courier': return 'courierInfo';
            case 'admin': return 'sellerManagement';
            default: return 'sellerInfo';
        }
    }
}

// Satıcı Paneli
class SellerPanel extends BasePanel {
    constructor() {
        super();
    }

    initializeRoleSpecificFeatures() {
        super.initializeRoleSpecificFeatures();
        this.loadSellerData();
    }

    async loadSellerData() {
        if (this.userProfile.seller_id) {
            // Satıcı verilerini yükle
            const { data: seller } = await supabase
                .from('seller_profiles')
                .select('*')
                .eq('id', this.userProfile.seller_id)
                .single();

            if (seller) {
                this.populateSellerForm(seller);
            }
        }
    }

    populateSellerForm(sellerData) {
        // Satıcı bilgilerini forma doldur
        document.getElementById('businessName').value = sellerData.business_name || '';
        document.getElementById('sellerPhone').value = sellerData.phone || '';
        document.getElementById('sellerAddress').value = sellerData.address || '';
        // ... diğer alanlar
    }
}

// Kurye Paneli
class CourierPanel extends BasePanel {
    constructor() {
        super();
    }

    initializeRoleSpecificFeatures() {
        super.initializeRoleSpecificFeatures();
        this.loadCourierData();
        this.initializeLocationTracking();
    }

    async loadCourierData() {
        if (this.userProfile.courier_id) {
            const { data: courier } = await supabase
                .from('couriers')
                .select('*')
                .eq('id', this.userProfile.courier_id)
                .single();

            if (courier) {
                this.populateCourierForm(courier);
            }
        }
    }

    initializeLocationTracking() {
        // Kurye konum takibi
        if (navigator.geolocation) {
            navigator.geolocation.watchPosition(
                (position) => {
                    this.updateCourierLocation(position);
                },
                (error) => {
                    console.error('Konum takip hatası:', error);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 60000
                }
            );
        }
    }

    async updateCourierLocation(position) {
        const { latitude, longitude } = position.coords;
        
        await supabase
            .from('couriers')
            .update({
                current_location: `POINT(${longitude} ${latitude})`,
                updated_at: new Date().toISOString()
            })
            .eq('id', this.userProfile.courier_id);
    }
}

// Panel başlatma
document.addEventListener('DOMContentLoaded', async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        switch (profile.role) {
            case 'seller':
                new SellerPanel();
                break;
            case 'courier':
                new CourierPanel();
                break;
            case 'admin':
                new AdminPanel(); // Admin panel class'ı
                break;
            default:
                window.location.href = 'index.html';
        }
    }
});