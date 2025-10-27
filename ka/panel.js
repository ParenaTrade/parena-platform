class PanelSystem {
    constructor() {
        this.currentPanel = null;
    }

    initializePanel(userProfile) {
        console.log('🎯 Panel başlatılıyor:', userProfile);
        
        // Auth kontrolünü kaldır - sadece session'a güven
        if (!userProfile || !userProfile.role) {
            console.error('❌ Geçersiz kullanıcı profili');
            return;
        }

        this.initializeRoleSpecificPanel(userProfile);
        this.setupNavigation();
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

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            if (item.id !== 'logoutBtn') {
                item.addEventListener('click', (e) => {
                    e.preventDefault();
                    const section = item.getAttribute('data-section');
                    this.showSection(section);
                });
            }
        });

        // Logout
        document.getElementById('logoutBtn').addEventListener('click', async () => {
            if (window.authSystem) {
                await window.authSystem.logout();
            } else {
                location.reload();
            }
        });

        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            document.getElementById('sidebar').classList.toggle('active');
        });
    }

    showSection(sectionName) {
        // Hide all sections
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
        });

        // Update navigation
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });

        // Show target section
        const targetSection = document.getElementById(sectionName + 'Section');
        if (targetSection) {
            targetSection.classList.add('active');
            const navItem = document.querySelector(`[data-section="${sectionName}"]`);
            if (navItem) {
                navItem.classList.add('active');
            }
            
            this.currentSection = sectionName;
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
        
        document.getElementById('pageTitle').textContent = titles[sectionName] || 'Panel';
    }

    initializeRoleSpecificPanel() {
        // Hide all role menus
        document.querySelectorAll('.role-menu').forEach(menu => {
            menu.style.display = 'none';
        });

        // Show appropriate role menu
        let roleMenuId;
        const userRole = this.userProfile.role;
        
        if (userRole === 'üye' || userRole === 'customer') {
            roleMenuId = 'customerMenu';
        } else {
            roleMenuId = userRole + 'Menu';
        }
        
        const roleMenu = document.getElementById(roleMenuId);
        if (roleMenu) {
            roleMenu.style.display = 'block';
        } else {
            // Fallback: customer menu göster
            document.getElementById('customerMenu').style.display = 'block';
        }

        // Initialize specific panel class
        switch (userRole) {
            case 'üye':
            case 'customer':
                this.currentPanel = new CustomerPanel(this.userProfile);
                break;
            case 'seller':
                this.currentPanel = new SellerPanel(this.userProfile);
                break;
            case 'courier':
                this.currentPanel = new CourierPanel(this.userProfile);
                break;
            case 'admin':
                this.currentPanel = new AdminPanel(this.userProfile);
                break;
            default:
                // Varsayılan olarak customer panel
                this.currentPanel = new CustomerPanel(this.userProfile);
        }

        // Show initial section
        const initialSection = this.getInitialSection();
        this.showSection(initialSection);
    }

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
