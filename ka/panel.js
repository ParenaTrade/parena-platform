class PanelSystem {
    constructor() {
        this.currentSection = 'dashboard';
        this.currentPanel = null;
        this.userProfile = null;
    }

    initializePanel(userProfile) {
        this.userProfile = userProfile;
        this.updateUI();
        this.setupEventListeners();
        this.initializeRoleSpecificPanel();
    }

    updateUI() {
        // Null check ekleyelim
        if (!this.userProfile) {
            console.error('User profile is null');
            return;
        }

        // Kullanıcı bilgilerini UI'da göster
        const userName = this.userProfile.full_name || 
                        this.userProfile.name || 
                        this.userProfile.email || 
                        'Kullanıcı';
        
        document.getElementById('userName').textContent = userName;
        
        // Rol bilgisini düzgün göster
        const roleText = this.getRoleText(this.userProfile.role);
        document.getElementById('userRole').textContent = roleText;
        
        document.getElementById('userAvatar').textContent = userName.charAt(0).toUpperCase();

        // Update role badge
        const roleBadge = document.getElementById('userRole');
        roleBadge.className = `role-badge role-${this.userProfile.role || 'customer'}`;
    }

    getRoleText(role) {
        const roleMap = {
            'seller': 'Satıcı',
            'courier': 'Kurye',
            'admin': 'Admin',
            'üye': 'Müşteri',
            'customer': 'Müşteri'
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