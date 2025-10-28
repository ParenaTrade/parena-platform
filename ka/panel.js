class PanelSystem {
    constructor() {
        this.currentPanel = null;
        this.userProfile = null; // userProfile'ı burada tanımla
    }

initializePanel(userProfile) {
    console.log('🎯 PANEL BAŞLATMA - Gelen userProfile:', userProfile);
    console.log('🔍 Rol kontrolü:', userProfile.role);
    console.log('🔍 Tüm userProfile:', JSON.stringify(userProfile, null, 2));
    
    // userProfile'ı set et
    this.userProfile = userProfile;
    
    // Container'ları ayarla
    this.setupContainers();
    
    // Rol kontrolü
    if (!this.userProfile || !this.userProfile.role) {
        console.error('❌ GEÇERSİZ USER PROFILE - Rol yok:', this.userProfile);
        return;
    }

    console.log('✅ Rol bulundu:', this.userProfile.role);
    
    // Kullanıcı bilgilerini güncelle
    this.updateUserInfo(this.userProfile);
    
    // Navigation'ı kur
    this.setupNavigation();
    
    // Rol bazlı paneli başlat
    this.initializeRoleSpecificPanel(this.userProfile);
}
    initializeRoleSpecificPanel(userProfile) {
    console.log('🔄 ROL BAZLI PANEL BAŞLATILIYOR - Rol:', userProfile.role);
    
    // Mevcut paneli temizle
    this.currentPanel = null;

    // Tüm rol menülerini gizle
    document.querySelectorAll('.role-menu').forEach(menu => {
        menu.style.display = 'none';
        console.log('❌ Menü gizlendi:', menu.id);
    });

    // Doğru rol menüsünü göster
    let roleMenuId;
    
    if (userProfile.role === 'üye' || userProfile.role === 'customer') {
        roleMenuId = 'customerMenu';
    } else {
        roleMenuId = userProfile.role + 'Menu';
    }
    
    console.log('🎯 Gösterilecek menü ID:', roleMenuId);
    
    const roleMenu = document.getElementById(roleMenuId);
    if (roleMenu) {
        roleMenu.style.display = 'block';
        console.log('✅ Rol menüsü gösterildi:', roleMenuId);
    } else {
        console.error('❌ Rol menüsü bulunamadı:', roleMenuId);
        // Fallback: customer menu göster
        const fallbackMenu = document.getElementById('customerMenu');
        if (fallbackMenu) {
            fallbackMenu.style.display = 'block';
            console.log('🔄 Fallback customer menü gösterildi');
        }
    }

    // Özel panel class'ını başlat
    console.log('🚀 Özel panel başlatılıyor, rol:', userProfile.role);
    
    try {
        switch (userProfile.role) {
            case 'üye':
            case 'customer':
                console.log('🎯 Customer panel seçildi');
                if (typeof CustomerPanel !== 'undefined') {
                    this.currentPanel = new CustomerPanel(userProfile);
                    console.log('✅ CustomerPanel başlatıldı');
                    this.showSection('customerDashboard');
                } else {
                    console.error('❌ CustomerPanel tanımsız!');
                }
                break;
                
            case 'seller':
                console.log('🎯 Seller panel seçildi');
                if (typeof SellerPanel !== 'undefined') {
                    this.currentPanel = new SellerPanel(userProfile);
                    console.log('✅ SellerPanel başlatıldı');
                    this.showSection('sellerDashboard');
                }
                break;
                
            case 'courier':
                console.log('🎯 Courier panel seçildi');
                if (typeof CourierPanel !== 'undefined') {
                    this.currentPanel = new CourierPanel(userProfile);
                    console.log('✅ CourierPanel başlatıldı');
                    this.showSection('courierDashboard');
                }
                break;
                
            case 'admin':
                console.log('🎯 Admin panel seçildi');
                if (typeof AdminPanel !== 'undefined') {
                    this.currentPanel = new AdminPanel(userProfile);
                    console.log('✅ AdminPanel başlatıldı');
                    this.showSection('dashboard');
                }
                break;
                
            default:
                console.error('❌ TANIMSIZ ROL:', userProfile.role);
                // Varsayılan olarak customer panel
                if (typeof CustomerPanel !== 'undefined') {
                    this.currentPanel = new CustomerPanel(userProfile);
                    this.showSection('customerDashboard');
                }
        }
    } catch (error) {
        console.error('❌ Panel başlatma hatası:', error);
    }
    
    console.log('🎯 Panel başlatma tamamlandı. CurrentPanel:', this.currentPanel);
}
   updateUserInfo(userProfile) {
    console.log('👤 KULLANICI BİLGİLERİ GÜNCELLENİYOR:', userProfile);
    
    const userAvatar = document.getElementById('userAvatar');
    const userName = document.getElementById('userName');
    const userRole = document.getElementById('userRole');

    if (userAvatar) {
        userAvatar.textContent = userProfile.name ? userProfile.name.charAt(0).toUpperCase() : 'U';
        console.log('✅ Avatar güncellendi:', userAvatar.textContent);
    }

    if (userName) {
        userName.textContent = userProfile.name || 'Kullanıcı';
        console.log('✅ İsim güncellendi:', userName.textContent);
    }

    if (userRole) {
        const roleText = this.getRoleText(userProfile.role);
        userRole.textContent = roleText;
        console.log('✅ Rol güncellendi:', userProfile.role, '->', roleText);
    }
}

getRoleText(role) {
    const roleMap = {
        'customer': 'Müşteri',
        'seller': 'Satıcı',
        'courier': 'Kurye',
        'admin': 'Yönetici',
        'üye': 'Müşteri'
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
