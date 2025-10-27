class CustomerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.customerData = null;
        this.orders = [];
        this.currentSection = '';
        
        // Supabase client'ını config'den al
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('👤 CustomerPanel başlatılıyor...');
        console.log('Supabase:', this.supabase ? '✅ Var' : '❌ Yok');
        console.log('Config:', this.config ? '✅ Var' : '❌ Yok');
        
        if (!this.supabase) {
            console.error('❌ Supabase client bulunamadı!');
            // Fallback: global supabase kullan
            this.supabase = window.supabase;
        }
        
        this.init();
    }

    async init() {
        await this.loadCustomerData();
    }

    async loadCustomerData() {
        try {
            console.log('📥 Müşteri verisi yükleniyor...');
            
            if (!this.supabase) {
                console.error('❌ Supabase client yok!');
                this.customerData = this.userProfile;
                return;
            }

            // Customers tablosundan müşteri bilgilerini yükle
            const { data, error } = await this.supabase
                .from('customers')
                .select('*')
                .eq('id', this.userProfile.id)
                .single();

            if (error) {
                console.warn('⚠️ Müşteri profili yüklenemedi:', error);
                // Fallback: userProfile'ı kullan
                this.customerData = this.userProfile;
            } else {
                this.customerData = data;
                console.log('✅ Müşteri verisi yüklendi:', data.name);
            }
        } catch (error) {
            console.error('❌ Müşteri verisi yükleme hatası:', error);
            this.customerData = this.userProfile;
        }
    }

    async loadSectionData(sectionName) {
        this.currentSection = sectionName;
        
        console.log(`📂 Section yükleniyor: ${sectionName}`);
        
        // Supabase kontrolü
        if (!this.supabase) {
            console.error('❌ Supabase client yok, section yüklenemiyor');
            return;
        }
        
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

    async loadCustomerDashboard() {
        const section = document.getElementById('customerDashboardSection');
        if (!section) {
            console.error('❌ customerDashboardSection bulunamadı!');
            return;
        }

        section.innerHTML = `
            <h1>Hoş Geldiniz, ${this.customerData?.full_name || this.customerData?.name || 'Müşteri'}!</h1>
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
            
            if (!this.supabase) {
                console.error('❌ Supabase client yok!');
                return;
            }

            // Sipariş istatistiklerini yükle
            const { data: orders, error } = await this.supabase
                .from('orders')
                .select('id, status')
                .eq('customer_id', this.customerData.id);

            if (error) {
                console.error('❌ İstatistik sorgu hatası:', error);
                return;
            }

            if (orders) {
                document.getElementById('totalOrders').textContent = orders.length;
                
                const pendingOrders = orders.filter(order => 
                    ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'].includes(order.status)
                ).length;
                document.getElementById('pendingOrders').textContent = pendingOrders;
                
                console.log('✅ İstatistikler yüklendi:', { total: orders.length, pending: pendingOrders });
            }
        } catch (error) {
            console.error('❌ Müşteri istatistik yükleme hatası:', error);
        }
    }

    async loadRecentCustomerOrders() {
        try {
            console.log('📦 Son siparişler yükleniyor...');
            
            if (!this.supabase) {
                console.error('❌ Supabase client yok!');
                const container = document.getElementById('recentCustomerOrders');
                container.innerHTML = '<p class="text-muted">Sistem hazır değil.</p>';
                return;
            }

            const { data: orders, error } = await this.supabase
                .from('orders')
                .select(`
                    id,
                    total_amount,
                    status,
                    created_at,
                    delivery_address,
                    seller:seller_profiles(business_name)
                `)
                .eq('customer_id', this.customerData.id)
                .order('created_at', { ascending: false })
                .limit(5);

            const container = document.getElementById('recentCustomerOrders');
            
            if (error) {
                console.error('❌ Sipariş sorgu hatası:', error);
                container.innerHTML = '<p class="text-muted">Siparişler yüklenirken hata oluştu.</p>';
                return;
            }

            if (!orders || orders.length === 0) {
                container.innerHTML = '<p class="text-muted">Henüz siparişiniz bulunmuyor.</p>';
                return;
            }

            container.innerHTML = orders.map(order => `
                <div class="order-item" style="border-bottom: 1px solid #eee; padding: 15px 0;">
                    <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div>
                            <strong>Sipariş #${order.id.slice(-8)}</strong>
                            <div style="color: #666; font-size: 12px; margin-top: 2px;">
                                ${order.seller?.business_name || 'Satıcı'}
                            </div>
                        </div>
                        <span class="status-badge status-${order.status}">
                            ${this.getStatusText(order.status)}
                        </span>
                    </div>
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
            const container = document.getElementById('recentCustomerOrders');
            container.innerHTML = '<p class="text-muted">Siparişler yüklenirken hata oluştu.</p>';
        }
    }

    // Diğer metodları da aynı şekilde güncelleyin...
    // loadCustomerOrders, loadCustomerProfile, vb. tüm metodlarda this.supabase kullanın

    async loadCustomerOrders() {
        const section = document.getElementById('customerOrdersSection');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2>Siparişlerim</h2>
            </div>
            <div class="card">
                <div class="card-body">
                    <div id="customerOrdersList">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Siparişler yükleniyor...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadAllCustomerOrders();
    }

    async loadAllCustomerOrders() {
        try {
            console.log('📋 Tüm siparişler yükleniyor...');
            
            if (!this.supabase) {
                console.error('❌ Supabase client yok!');
                const container = document.getElementById('customerOrdersList');
                container.innerHTML = '<p class="text-muted">Sistem hazır değil.</p>';
                return;
            }

            const { data: orders, error } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    order_details(*),
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
