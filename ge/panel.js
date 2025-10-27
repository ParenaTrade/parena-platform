class PanelSystem {
    constructor() {
        this.currentSection = 'dashboard';
        this.currentPanel = null;
    }

    initializePanel(userProfile) {
        this.userProfile = userProfile;
        this.updateUI();
        this.setupEventListeners();
        this.initializeRoleSpecificPanel();
    }

    updateUI() {
        // Update user info
        document.getElementById('userName').textContent = 
            this.userProfile.full_name || this.userProfile.email;
        document.getElementById('userRole').textContent = this.userProfile.role;
        document.getElementById('userAvatar').textContent = 
            (this.userProfile.full_name || 'U').charAt(0).toUpperCase();

        // Update role badge
        const roleBadge = document.getElementById('userRole');
        roleBadge.className = `role-badge role-${this.userProfile.role}`;
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
            await window.authSystem.logout();
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
            document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
            
            this.currentSection = sectionName;
            this.updatePageTitle(sectionName);
            
            // Load section data
            this.loadSectionData(sectionName);
        }
    }

    updatePageTitle(sectionName) {
        const titles = {
            'dashboard': 'Dashboard',
            'sellerInfo': 'İşletme Bilgileri',
            'products': 'Ürün Yönetimi',
            'orders': 'Siparişler',
            'customerProfile': 'Profilim',
            'customerOrders': 'Siparişlerim',
            'courierInfo': 'Profilim',
            'courierDeliveries': 'Teslimatlarım',
            'sellerManagement': 'Satıcı Yönetimi',
            'courierManagement': 'Kurye Yönetimi',
            'allOrders': 'Tüm Siparişler',
            'reports': 'Raporlar',
            'systemSettings': 'Sistem Ayarları'
        };
        
        document.getElementById('pageTitle').textContent = titles[sectionName] || 'Panel';
    }

    initializeRoleSpecificPanel() {
        // Hide all role menus
        document.querySelectorAll('.role-menu').forEach(menu => {
            menu.style.display = 'none';
        });

        // Show appropriate role menu
        const roleMenu = document.getElementById(this.userProfile.role + 'Menu');
        if (roleMenu) {
            roleMenu.style.display = 'block';
        }

        // Initialize specific panel class
        switch (this.userProfile.role) {
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
        }

        // Show initial section
        const initialSection = this.getInitialSection();
        this.showSection(initialSection);
    }

    getInitialSection() {
        const roleSections = {
            'customer': 'customerDashboard',
            'seller': 'sellerDashboard',
            'courier': 'courierDashboard',
            'admin': 'dashboard'
        };
        
        return roleSections[this.userProfile.role] || 'dashboard';
    }

    loadSectionData(sectionName) {
        if (this.currentPanel && typeof this.currentPanel.loadSectionData === 'function') {
            this.currentPanel.loadSectionData(sectionName);
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
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}