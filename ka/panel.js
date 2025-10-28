class PanelSystem {
    constructor() {
        this.currentPanel = null;
        this.userProfile = null; // userProfile'ı burada tanımla
    }

initializePanel(userProfile) {
    console.log('🎯 Panel başlatılıyor:', userProfile);
    
    // ⚡ HIZLI FIX: Container'ları ayarla
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('panelContainer').style.display = 'grid';
    
    // userProfile'ı set et
    this.userProfile = userProfile;
        
        // Auth kontrolünü kaldır - sadece session'a güven
        if (!this.userProfile || !this.userProfile.role) {
            console.error('❌ Geçersiz kullanıcı profili');
            return;
        }

        this.initializeRoleSpecificPanel(this.userProfile);
        this.setupNavigation();
        this.updateUserInfo(this.userProfile); // Bunu da ekle
    }

    initializeRoleSpecificPanel(userProfile) {
        // Mevcut paneli temizle
        this.currentPanel = null;

        switch(userProfile.role) {
            case 'customer':
                if (typeof CustomerPanel !== 'undefined') {
                    this.currentPanel = new CustomerPanel(userProfile);
                    this.showSection('customerDashboard');
                }
                break;
            case 'seller':
                if (typeof SellerPanel !== 'undefined') {
                    this.currentPanel = new SellerPanel(userProfile);
                    this.showSection('sellerDashboard');
                }
                break;
            case 'courier':
                if (typeof CourierPanel !== 'undefined') {
                    this.currentPanel = new CourierPanel(userProfile);
                    this.showSection('courierDashboard');
                }
                break;
            default:
                console.error('❌ Tanımlanmamış kullanıcı rolü:', userProfile.role);
        }

        // Kullanıcı bilgilerini göster
        this.updateUserInfo(userProfile);
    }

    updateUserInfo(userProfile) {
        const userInfoElement = document.getElementById('userInfo');
        if (userInfoElement) {
            userInfoElement.innerHTML = `
                <div style="display: flex; align-items: center; gap: 10px;">
                    <div class="user-avatar">
                        <i class="fas fa-user"></i>
                    </div>
                    <div>
                        <div style="font-weight: 500;">${userProfile.name}</div>
                        <div style="font-size: 12px; color: #666;">
                            ${this.getRoleText(userProfile.role)} • ${userProfile.phone}
                        </div>
                    </div>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="window.authSystem.logout()">
                    <i class="fas fa-sign-out-alt"></i> Çıkış
                </button>
            `;
        }
    }

    getRoleText(role) {
        const roleMap = {
            'customer': 'Müşteri',
            'seller': 'Satıcı', 
            'courier': 'Kurye'
        };
        return roleMap[role] || role;
    }

    setupNavigation() {
        // Navigation event listeners
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-section]')) {
                const sectionId = e.target.getAttribute('data-section');
                this.showSection(sectionId);
            }
        });

        // Logout butonu
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (window.authSystem) {
                    window.authSystem.logout();
                }
            });
        }
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionName + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
            targetSection.style.display = 'block';
            
            const navItem = document.querySelector(`[data-section="${sectionName}"]`);
            if (navItem) {
                navItem.classList.add('active');
            }
            
            this.updatePageTitle(sectionName);
            
            // Load section data
            this.loadSectionData(sectionName);
        }
    }

    updatePageTitle(sectionName) {
        const titles = {
            'dashboard': 'Dashboard',
            'sellerDashboard': 'Satıcı Paneli',
            'courierDashboard': 'Kurye Paneli',
            'customerDashboard': 'Müşteri Paneli',
            'sellerInfo': 'İşletme Bilgileri',
            'products': 'Ürün Yönetimi',
            'orders': 'Siparişler',
            'customerProfile': 'Profilim',
            'customerOrders': 'Siparişlerim',
            'customerPayments': 'Ödemelerim',
            'courierInfo': 'Profilim',
            'courierDeliveries': 'Teslimatlarım',
            'courierEarnings': 'Kazançlarım',
            'sellerManagement': 'Satıcı Yönetimi',
            'courierManagement': 'Kurye Yönetimi',
            'allOrders': 'Tüm Siparişler',
            'reports': 'Raporlar',
            'systemSettings': 'Sistem Ayarları',
            'deliveryAreas': 'Teslimat Bölgeleri',
            'sellerReports': 'Satış Raporları',
            'referral': 'Arkadaşını Davet Et'
        };
        
        const pageTitleElement = document.getElementById('pageTitle');
        if (pageTitleElement) {
            pageTitleElement.textContent = titles[sectionName] || 'Panel';
        }
    }

    // BU FONKSİYONU SİLİN - ÇAKIŞMA YARATIYOR
    // initializeRoleSpecificPanel() {
    //     // Bu fonksiyon zaten yukarıda var ve parametre alıyor
    // }

    getInitialSection() {
        const roleSections = {
            'üye': 'customerDashboard',
            'customer': 'customerDashboard',
            'seller': 'sellerDashboard', 
            'courier': 'courierDashboard',
            'admin': 'dashboard'
        };
        
        return roleSections[this.userProfile.role] || 'customerDashboard';
    }

    loadSectionData(sectionName) {
        if (this.currentPanel && typeof this.currentPanel.loadSectionData === 'function') {
            this.currentPanel.loadSectionData(sectionName);
        } else {
            console.warn('Current panel not initialized or loadSectionData method not found');
        }
    }

    showAlert(message, type = 'success') {
        // Create temporary alert
        const alert = document.createElement('div');
        alert.className = `alert alert-${type}`;
        alert.textContent = message;
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}
