class PanelSystem {
    constructor() {
        this.currentPanel = null;
        this.userProfile = null;
        this.setupMobileMenu();
        this.setupAccordionMenus();
    }

    setupAccordionMenus() {
        console.log('🎪 Akordiyon menüler ayarlanıyor...');
        
        // Akordiyon event listener'ları
        document.addEventListener('click', (e) => {
            const accordionHeader = e.target.closest('.accordion-header');
            if (accordionHeader) {
                e.preventDefault();
                e.stopPropagation();
                
                const accordionId = accordionHeader.getAttribute('data-accordion');
                const accordionContent = document.getElementById(accordionId);
                
                if (accordionContent) {
                    // Toggle active class
                    const isActive = accordionHeader.classList.contains('active');
                    accordionHeader.classList.toggle('active');
                    accordionContent.classList.toggle('active');
                    
                    console.log('🔘 Akordiyon toggled:', accordionId, !isActive);
                }
            }
        });

        console.log('✅ Akordiyon menüler ayarlandı');
    }

            // Nav item click handler - akordiyon item'ları için
            const navItems = document.querySelectorAll('.nav-item');
            navItems.forEach(item => {
                item.addEventListener('click', function(e) {
                    if (this.getAttribute('data-section')) {
                        // Remove active class from all items
                        navItems.forEach(navItem => {
                            navItem.classList.remove('active');
                        });
                        // Add active class to clicked item
                        this.classList.add('active');
                        
                        // Sayfa başlığını güncelle
                        const pageTitle = this.querySelector('span')?.textContent || 'Panel';
                        document.getElementById('pageTitle').textContent = pageTitle;
                        
                        // Mobile menüyü kapat
                        const sidebar = document.getElementById('sidebar');
                        if (sidebar && sidebar.classList.contains('mobile-open')) {
                            sidebar.classList.remove('mobile-open');
                        }
                    }
                });
            });

            console.log('✅ Akordiyon menüler ayarlandı');
        });
    }

    setupMobileMenu() {
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        const sidebar = document.getElementById('sidebar');
        
        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('mobile-open');
                console.log('📱 Mobile menu toggled:', sidebar.classList.contains('mobile-open'));
            });
            
            // Mobile menüyü kapatmak için overlay tıklama
            document.addEventListener('click', (e) => {
                if (sidebar.classList.contains('mobile-open') && 
                    !sidebar.contains(e.target) && 
                    e.target !== mobileMenuBtn) {
                    sidebar.classList.remove('mobile-open');
                    console.log('📱 Mobile menu closed by overlay');
                }
            });
        }
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
        
        // Akordiyon menüleri başlat
        this.initializeAccordionMenus();
        
        // Rol bazlı paneli başlat
        this.initializeRoleSpecificPanel(this.userProfile);
    }

    initializeAccordionMenus() {
        console.log('🎪 Akordiyon menüler başlatılıyor...');
        
        // İlk akordiyonu aç
        setTimeout(() => {
            const firstAccordion = document.querySelector('.accordion-header');
            if (firstAccordion && !document.querySelector('.accordion-header.active')) {
                firstAccordion.click();
                console.log('✅ İlk akordiyon açıldı:', firstAccordion.getAttribute('data-accordion'));
            }
        }, 100);
    }

    setupContainers() {
        console.log('🔧 Container ayarları yapılıyor...');
        
        // Login container'ı gizle, panel container'ı göster
        const loginContainer = document.getElementById('loginContainer');
        const panelContainer = document.getElementById('panelContainer');
        
        if (loginContainer) {
            loginContainer.classList.remove('active');
            console.log('✅ Login container gizlendi');
        }
        
        if (panelContainer) {
            panelContainer.style.display = 'block';
            console.log('✅ Panel container gösterildi');
        }
        
        // Tüm section'ları başlangıçta gizle
        document.querySelectorAll('.content-section').forEach(section => {
            section.classList.remove('active');
            section.style.display = 'none';
        });
        
        // Sidebar container kontrolü
        const sidebar = document.getElementById('sidebar');
        if (!sidebar) {
            console.warn('⚠️ Sidebar container bulunamadı');
        } else {
            console.log('✅ Sidebar container hazır');
        }
        
        // Main content container kontrolü
        const mainContent = document.querySelector('.main-content');
        if (!mainContent) {
            console.warn('⚠️ Main content container bulunamadı');
        } else {
            console.log('✅ Main content container hazır');
        }
        
        console.log('✅ Container ayarları tamamlandı');
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
        console.log('🧭 Navigation ayarlanıyor...');
        
        // Navigation event listeners
        document.addEventListener('click', (e) => {
            const navItem = e.target.closest('.nav-item');
            if (navItem && navItem.hasAttribute('data-section')) {
                e.preventDefault();
                const sectionId = navItem.getAttribute('data-section');
                console.log('📱 Navigation tıklandı:', sectionId);
                this.showSection(sectionId);
            }
        });

        // Mobile menu butonu
        const mobileMenuBtn = document.getElementById('mobileMenuBtn');
        if (mobileMenuBtn) {
            mobileMenuBtn.addEventListener('click', () => {
                const sidebar = document.getElementById('sidebar');
                if (sidebar) {
                    sidebar.classList.toggle('mobile-open');
                    console.log('📱 Mobile menu toggled');
                }
            });
        }

        // Logout butonu
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log('🚪 Logout butonuna tıklandı');
                if (window.authSystem) {
                    window.authSystem.logout();
                }
            });
        }
        
        console.log('✅ Navigation ayarları tamamlandı');
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

    showSection(sectionName) {
        console.log('📄 Section gösteriliyor:', sectionName);
        
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
            
            // Aktif navigation item'ını bul
            const navItem = document.querySelector(`[data-section="${sectionName}"]`);
            if (navItem) {
                navItem.classList.add('active');
                
                // Eğer bu bir akordiyon item'ı ise, parent akordiyonu aç
                const accordionItem = navItem.closest('.accordion-item');
                if (accordionItem) {
                    const accordionContent = accordionItem.closest('.accordion-content');
                    if (accordionContent) {
                        const accordionId = accordionContent.id;
                        const accordionHeader = document.querySelector(`[data-accordion="${accordionId}"]`);
                        if (accordionHeader && !accordionHeader.classList.contains('active')) {
                            accordionHeader.classList.add('active');
                            accordionContent.classList.add('active');
                            console.log('🔘 İlgili akordiyon açıldı:', accordionId);
                        }
                    }
                }
            }
            
            this.updatePageTitle(sectionName);
            
            // Load section data
            this.loadSectionData(sectionName);
            
            console.log('✅ Section gösterildi:', sectionName);
        } else {
            console.error('❌ Section bulunamadı:', sectionName + 'Section');
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
            'customerAddresses': 'Adreslerim',
            'customerSupport': 'Destek',
            'customerReferral': 'Arkadaşını Davet Et',
            'referralEarnings': 'Bonus Kazançlarım',
            'referralInvites': 'Davet Ettiklerim',
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
            // Yeni akordiyon menü başlıkları
            'customerManagement': 'Müşteri Yönetimi',
            'sellerApproval': 'Satıcı Onayı',
            'courierApproval': 'Kurye Onayı',
            'activeOrders': 'Aktif Siparişler',
            'orderTracking': 'Sipariş Takibi',
            'orderReports': 'Sipariş Analitik',
            'financialReports': 'Finansal Raporlar',
            'commissionSettings': 'Komisyon Ayarları',
            'payoutManagement': 'Ödeme Yönetimi',
            'taxSettings': 'Vergi Ayarları',
            'platformCampaigns': 'Platform Kampanyaları',
            'couponManagement': 'Kupon Yönetimi',
            'promotionManagement': 'Promosyon Yönetimi',
            'ticketManagement': 'Ticket Yönetimi',
            'liveSupport': 'Canlı Destek',
            'refundManagement': 'İade Yönetimi',
            'apiIntegrations': 'API Entegrasyonları',
            'roleManagement': 'Rol & Yetki Yönetimi'
        };
        
        const pageTitleElement = document.getElementById('pageTitle');
        if (pageTitleElement) {
            pageTitleElement.textContent = titles[sectionName] || 'Panel';
            console.log('📝 Sayfa başlığı güncellendi:', pageTitleElement.textContent);
        }
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
        console.log('📦 Section verileri yükleniyor:', sectionName);
        
        if (this.currentPanel && typeof this.currentPanel.loadSectionData === 'function') {
            this.currentPanel.loadSectionData(sectionName);
        } else {
            console.warn('⚠️ Current panel not initialized or loadSectionData method not found');
        }
    }

    showAlert(message, type = 'success') {
        console.log('🔔 Alert gösteriliyor:', message, type);
        
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
            background: ${type === 'success' ? '#d4edda' : '#f8d7da'};
            color: ${type === 'success' ? '#155724' : '#721c24'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'};
        `;
        
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.remove();
        }, 5000);
    }
}

// Customer menü öğelerini tanımla (HTML'de olmalı)
const customerMenuItems = [
    {
        id: 'customerDashboard',
        title: '🏠 Dashboard',
        icon: 'fa-home',
        section: 'customerDashboard'
    },
    {
        id: 'customerProfile',
        title: '👤 Profilim',
        icon: 'fa-user',
        section: 'customerProfile'
    },
    {
        id: 'customerOrders',
        title: '📦 Siparişlerim',
        icon: 'fa-shopping-bag',
        section: 'customerOrders'
    },
    {
        id: 'customerPayments',
        title: '💳 Ödemelerim',
        icon: 'fa-credit-card',
        section: 'customerPayments'
    },
    {
        id: 'customerAddresses',
        title: '📍 Adreslerim',
        icon: 'fa-map-marker-alt',
        section: 'customerAddresses'
    },
    {
        id: 'customerReferral',
        title: '🎁 Arkadaşını Davet Et',
        icon: 'fa-user-plus',
        section: 'customerReferral'
    },
    {
        id: 'referralEarnings',
        title: '💰 Bonus Kazançlarım',
        icon: 'fa-coins',
        section: 'referralEarnings'
    },
    {
        id: 'referralInvites',
        title: '👥 Davet Ettiklerim',
        icon: 'fa-users',
        section: 'referralInvites'
    },
    {
        id: 'customerSupport',
        title: '📞 Destek',
        icon: 'fa-headset',
        section: 'customerSupport'
    }
];
// panel.js dosyasının EN SONUNA ekle:
window.PanelSystem = PanelSystem;
console.log('✅ PanelSystem global olarak tanımlandı');
