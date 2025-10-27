class CustomerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.customerData = null;
        this.orders = [];
        this.currentSection = '';
        this.isDataLoaded = false; // Yeni: veri yüklendi mi?
        
        // Supabase client'ını config'den al
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('👤 CustomerPanel başlatılıyor...');
        console.log('User Profile:', this.userProfile);
        
        if (!this.supabase) {
            console.error('❌ Supabase client bulunamadı!');
            this.supabase = window.supabase;
        }
        
        this.init();
    }

    async init() {
        await this.loadCustomerData();
        this.isDataLoaded = true;
        console.log('✅ CustomerPanel başlatma tamamlandı');
    }

    async loadCustomerData() {
        try {
            console.log('📥 Müşteri verisi yükleniyor...');
            
            if (!this.supabase) {
                console.error('❌ Supabase client yok!');
                this.customerData = this.userProfile;
                return;
            }

            // Önce userProfile'dan temel bilgileri al
            this.customerData = {
                id: this.userProfile.id,
                name: this.userProfile.full_name || this.userProfile.name || 'Müşteri',
                phone: this.userProfile.phone,
                email: this.userProfile.email,
                bonus_balance: this.userProfile.bonus_balance || 0
            };

            console.log('🔍 Customers tablosu aranıyor...');

            // Customers tablosundan müşteri bilgilerini yükle
            const { data, error } = await this.supabase
                .from('customers')
                .select('*')
                .eq('id', this.userProfile.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn('⚠️ Müşteri kaydı bulunamadı, user profile kullanılıyor');
                } else {
                    console.warn('⚠️ Müşteri sorgu hatası:', error);
                }
                // Fallback: userProfile'ı kullan
                return;
            }

            if (data) {
                // Customers tablosundan gelen verilerle birleştir
                this.customerData = {
                    ...this.customerData,
                    ...data,
                    name: data.name || this.customerData.name,
                    bonus_balance: data.bonus_balance || this.customerData.bonus_balance
                };
                console.log('✅ Müşteri verisi yüklendi:', this.customerData.name);
            }

        } catch (error) {
            console.error('❌ Müşteri verisi yükleme hatası:', error);
            // Fallback: en azından userProfile ile devam et
            this.customerData = {
                id: this.userProfile.id,
                name: this.userProfile.full_name || this.userProfile.name || 'Müşteri',
                phone: this.userProfile.phone,
                email: this.userProfile.email,
                bonus_balance: this.userProfile.bonus_balance || 0
            };
        }
    }

    async loadSectionData(sectionName) {
        this.currentSection = sectionName;
        
        console.log(`📂 Section yükleniyor: ${sectionName}`);
        
        // Veri yüklenene kadar bekle
        if (!this.isDataLoaded) {
            console.log('⏳ Veri yükleniyor, bekleniyor...');
            await this.waitForData();
        }
        
        // Supabase kontrolü
        if (!this.supabase) {
            console.error('❌ Supabase client yok, section yüklenemiyor');
            this.showError(sectionName, 'Sistem hazır değil');
            return;
        }
        
        // customerData kontrolü
        if (!this.customerData || !this.customerData.id) {
            console.error('❌ Müşteri verisi yok, section yüklenemiyor');
            this.showError(sectionName, 'Müşteri bilgileri yüklenemedi');
            return;
        }
        
        console.log(`✅ Section yükleniyor: ${sectionName}, Müşteri ID: ${this.customerData.id}`);
        
        switch (sectionName) {
            case 'customerDashboard':
                await this.loadCustomerDashboard();
                break;
            case 'customerProfile':
                await this.loadCustomerProfile();
                break;
            case 'customerOrders':
                await this.loadCustomerOrders();
                break;
            case 'customerAddresses':
                await this.loadCustomerAddresses();
                break;
            case 'customerSupport':
                await this.loadCustomerSupport();
                break;
        }
    }

    // Veri yüklenene kadar bekleyen yardımcı metod
    async waitForData() {
        const maxWaitTime = 5000; // 5 saniye
        const startTime = Date.now();
        
        while (!this.isDataLoaded && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!this.isDataLoaded) {
            console.warn('⚠️ Veri yüklenme zaman aşımına uğradı');
        }
    }

    // Hata durumunda gösterilecek mesaj
    showError(sectionName, message) {
        const section = document.getElementById(`${sectionName}Section`);
        if (section) {
            section.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ffc107; margin-bottom: 20px;"></i>
                    <h3>${message}</h3>
                    <p>Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Sayfayı Yenile
                    </button>
                </div>
            `;
        }
    }

    async loadCustomerDashboard() {
        const section = document.getElementById('customerDashboardSection');
        if (!section) {
            console.error('❌ customerDashboardSection bulunamadı!');
            return;
        }

        // Müşteri adını güvenli şekilde al
        const customerName = this.customerData?.name || this.customerData?.full_name || 'Müşteri';

        section.innerHTML = `
            <h1>Hoş Geldiniz, ${customerName}!</h1>
            <p class="subtitle">Hesap özetiniz ve son işlemleriniz</p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-shopping-bag"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="totalOrders">0</h3>
                        <p>Toplam Sipariş</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="pendingOrders">0</h3>
                        <p>Bekleyen Sipariş</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="customerBonus">${this.customerData?.bonus_balance || 0} ₺</h3>
                        <p>Bonus Bakiyesi</p>
                    </div>
                </div>
            </div>

            <div class="content-row">
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>Son Siparişlerim</h3>
                            <a href="#" class="view-all" onclick="window.panelSystem.showSection('customerOrders')">Tümünü Gör</a>
                        </div>
                        <div class="card-body">
                            <div id="recentCustomerOrders">
                                <div class="loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Siparişler yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadCustomerStats();
        await this.loadRecentCustomerOrders();
    }

    async loadCustomerStats() {
    try {
        console.log('📊 Müşteri istatistikleri yükleniyor...');
        
        if (!this.supabase || !this.customerData || !this.customerData.id) {
            console.error('❌ Eksik veri:', {
                supabase: !!this.supabase,
                customerData: !!this.customerData,
                customerId: this.customerData?.id
            });
            this.showDemoStats();
            return;
        }

        console.log(`🔍 Siparişler aranıyor, Müşteri ID: ${this.customerData.id}`);

        // Orders tablosundan sipariş istatistiklerini yükle
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select('id, status, total_amount')
            .eq('customer_id', this.customerData.id);

        if (error) {
            console.error('❌ İstatistik sorgu hatası:', error);
            this.showDemoStats();
            return;
        }

        // UI güncelleme
        if (orders && orders.length > 0) {
            const totalOrders = orders.length;
            const pendingOrders = orders.filter(order => 
                ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'].includes(order.status)
            ).length;
            
            const totalSpent = orders.reduce((sum, order) => 
                sum + parseFloat(order.total_amount || 0), 0
            );

            document.getElementById('totalOrders').textContent = totalOrders;
            document.getElementById('pendingOrders').textContent = pendingOrders;
            
            console.log('✅ İstatistikler yüklendi:', { 
                total: totalOrders, 
                pending: pendingOrders,
                spent: totalSpent 
            });
        } else {
            console.log('ℹ️ Hiç sipariş bulunamadı');
            this.showDemoStats();
        }

    } catch (error) {
        console.error('❌ Müşteri istatistik yükleme hatası:', error);
        this.showDemoStats();
    }
}

async loadRecentCustomerOrders() {
    try {
        console.log('📦 Son siparişler yükleniyor...');
        
        if (!this.supabase || !this.customerData || !this.customerData.id) {
            this.showNoOrdersMessage('Sistem hazır değil.');
            return;
        }

        // Orders tablosundan son siparişleri getir
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select(`
                id,
                total_amount,
                status,
                created_at,
                delivery_address,
                customer_name,
                customer_phone,
                seller_id
            `)
            .eq('customer_id', this.customerData.id)
            .order('created_at', { ascending: false })
            .limit(5);

        const container = document.getElementById('recentCustomerOrders');
        
        if (error) {
            console.error('❌ Sipariş sorgu hatası:', error);
            this.showNoOrdersMessage('Siparişler yüklenirken hata oluştu.');
            return;
        }

        if (!orders || orders.length === 0) {
            this.showNoOrdersMessage('Henüz siparişiniz bulunmuyor.');
            return;
        }

        // Seller isimlerini almak için ayrı sorgu
        const sellerIds = orders.map(order => order.seller_id).filter(id => id);
        let sellers = {};
        
        if (sellerIds.length > 0) {
            const { data: sellersData } = await this.supabase
                .from('seller_profiles')
                .select('id, business_name')
                .in('id', sellerIds);
            
            if (sellersData) {
                sellersData.forEach(seller => {
                    sellers[seller.id] = seller.business_name;
                });
            }
        }

        container.innerHTML = orders.map(order => `
            <div class="order-item" style="border-bottom: 1px solid #eee; padding: 15px 0;">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <strong>Sipariş #${order.id.slice(-8)}</strong>
                        <div style="color: #666; font-size: 12px; margin-top: 2px;">
                            ${sellers[order.seller_id] || order.customer_name || 'Müşteri'}
                        </div>
                    </div>
                    <span class="status-badge status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
                ${order.delivery_address ? `
                    <div style="color: #666; font-size: 12px; margin: 5px 0;">
                        <i class="fas fa-map-marker-alt"></i> ${order.delivery_address}
                    </div>
                ` : ''}
                <div class="order-footer" style="display: flex; justify-content: space-between; margin-top: 8px;">
                    <span style="font-weight: bold; color: var(--primary);">
                        ${parseFloat(order.total_amount || 0).toFixed(2)} ₺
                    </span>
                    <small style="color: #999;">
                        ${new Date(order.created_at).toLocaleDateString('tr-TR')}
                    </small>
                </div>
            </div>
        `).join('');

        console.log('✅ Son siparişler yüklendi:', orders.length);

    } catch (error) {
        console.error('❌ Son siparişler yükleme hatası:', error);
        this.showNoOrdersMessage('Siparişler yüklenirken hata oluştu.');
    }
}

async loadAllCustomerOrders() {
    try {
        console.log('📋 Tüm siparişler yükleniyor...');
        
        if (!this.supabase || !this.customerData || !this.customerData.id) {
            const container = document.getElementById('customerOrdersList');
            container.innerHTML = '<p class="text-muted">Sistem hazır değil.</p>';
            return;
        }

        // Orders tablosundan tüm siparişleri getir
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select(`
                *,
                seller:seller_profiles(business_name, phone),
                courier:couriers(full_name, phone)
            `)
            .eq('customer_id', this.customerData.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Siparişler sorgu hatası:', error);
            throw error;
        }

        this.orders = orders || [];
        this.renderCustomerOrders(this.orders);
        console.log('✅ Tüm siparişler yüklendi:', this.orders.length);

    } catch (error) {
        console.error('❌ Siparişler yükleme hatası:', error);
        const container = document.getElementById('customerOrdersList');
        container.innerHTML = '<p class="text-muted">Siparişler yüklenirken hata oluştu.</p>';
    }
}
    renderCustomerOrders(orders) {
        const container = document.getElementById('customerOrdersList');
        
        if (!orders.length) {
            container.innerHTML = '<p class="text-muted">Henüz siparişiniz bulunmuyor.</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-card" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div>
                        <strong style="font-size: 16px;">Sipariş #${order.id.slice(-8)}</strong>
                        <div style="color: #666; font-size: 14px; margin-top: 5px;">
                            ${order.seller?.business_name || 'Satıcı'}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="status-badge status-${order.status}">
                            ${this.getStatusText(order.status)}
                        </span>
                        <div style="margin-top: 5px; font-size: 14px; font-weight: bold; color: var(--primary);">
                            ${parseFloat(order.total_amount || 0).toFixed(2)} ₺
                        </div>
                    </div>
                </div>
                
                <div class="order-items" style="margin-bottom: 15px;">
                    ${(order.order_details || []).map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">
                            <div>
                                <span style="font-weight: 500;">${item.product_name}</span>
                                <div style="font-size: 12px; color: #666;">
                                    ${item.quantity} adet × ${parseFloat(item.unit_price || 0).toFixed(2)} ₺
                                </div>
                            </div>
                            <div style="font-weight: bold;">
                                ${parseFloat(item.total_price || 0).toFixed(2)} ₺
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="order-footer" style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #e1e5e9;">
                    <div style="color: #666; font-size: 14px;">
                        <div>${new Date(order.created_at).toLocaleString('tr-TR')}</div>
                        ${order.courier ? `<div>Kurye: ${order.courier.full_name}</div>` : ''}
                    </div>
                </div>
            </div>
        `).join('');
    }

    async loadCustomerAddresses() {
        const section = document.getElementById('customerAddressesSection');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2>Adreslerim</h2>
                <button class="btn btn-primary" id="addAddressBtn">
                    <i class="fas fa-plus"></i> Yeni Adres Ekle
                </button>
            </div>
            <div class="card">
                <div class="card-body">
                    <p class="text-muted">Adres yönetimi yakında eklenecek.</p>
                </div>
            </div>
        `;
    }

    async loadCustomerSupport() {
        const section = document.getElementById('customerSupportSection');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2>Müşteri Desteği</h2>
            </div>
            <div class="card">
                <div class="card-body">
                    <p class="text-muted">Müşteri destek sistemi yakında eklenecek.</p>
                </div>
            </div>
        `;
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Bekliyor',
            'confirmed': 'Onaylandı',
            'preparing': 'Hazırlanıyor',
            'ready': 'Hazır',
            'on_the_way': 'Yolda',
            'delivered': 'Teslim Edildi',
            'cancelled': 'İptal Edildi'
        };
        return statusMap[status] || status;
    }
}

// Global instance
if (typeof window.customerPanel === 'undefined') {
    window.customerPanel = null;
}
