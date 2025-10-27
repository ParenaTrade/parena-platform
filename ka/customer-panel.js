class CustomerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.customerData = null;
        this.allOrders = [];
        this.init();
    }

    async init() {
        await this.loadCustomerData();
    }

    async loadCustomerData() {
        // Mevcut customers tablosundan verileri yükle
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', this.userProfile.id)
            .single();

        if (data) {
            this.customerData = data;
        } else {
            // Fallback: userProfile'ı kullan
            this.customerData = this.userProfile;
        }
    }

    async loadSectionData(sectionName) {
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
            case 'customerPayments':
                await this.loadCustomerPayments();
                break;
            case 'referral':
                await this.loadReferralSection();
                break;
        }
    }

    async loadCustomerDashboard() {
        const section = document.getElementById('customerDashboardSection');
        section.innerHTML = `
            <h1>Hoş Geldiniz, ${this.customerData?.name || this.customerData?.full_name || ''}!</h1>
            <p class="subtitle">Sipariş geçmişiniz ve bonus durumunuz</p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-coins"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="bonusBalance">${this.customerData?.bonus_balance || 0}</h3>
                        <p>Bonus Puanım</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="totalOrders">0</h3>
                        <p>Toplam Sipariş</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="totalSpent">0 ₺</h3>
                        <p>Toplam Harcama</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-users"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="referralCount">0</h3>
                        <p>Davet Edilen</p>
                    </div>
                </div>
            </div>

            ${this.customerData?.group_code ? `
                <div class="referral-section">
                    <h3><i class="fas fa-user-plus"></i> Arkadaşını Davet Et, Bonus Kazan!</h3>
                    <p>Arkadaşlarını davet ederek her biri için <strong>50 bonus puan</strong> kazan!</p>
                    <div class="referral-code">
                        <span id="referralLink">Grup Kodu: ${this.customerData.group_code}</span>
                        <button class="btn btn-primary" onclick="customerPanel.copyReferralLink()">
                            <i class="fas fa-copy"></i> Kopyala
                        </button>
                    </div>
                </div>
            ` : ''}

            <div class="content-row">
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>Son Siparişlerim</h3>
                            <a href="#" class="view-all" onclick="window.panelSystem.showSection('customerOrders')">Tümünü Gör</a>
                        </div>
                        <div class="card-body">
                            <div id="recentOrdersList">
                                <div class="loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Siparişler yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>Adres Bilgilerim</h3>
                        </div>
                        <div class="card-body">
                            <div id="customerAddress">
                                ${this.customerData?.address ? `
                                    <p><strong>Adres:</strong> ${this.customerData.address}</p>
                                    <p><strong>İlçe:</strong> ${this.customerData.district || ''}</p>
                                    <p><strong>Şehir:</strong> ${this.customerData.city || ''}</p>
                                    ${this.customerData.location ? `<p><strong>Konum:</strong> ${this.customerData.location}</p>` : ''}
                                ` : '<p class="text-muted">Henüz adres bilginiz bulunmuyor.</p>'}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadDashboardStats();
        await this.loadRecentOrders();
    }

    async loadDashboardStats() {
        // Sipariş istatistikleri - mevcut orders tablosuna göre
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, total_amount, status')
            .eq('customer_id', this.userProfile.id);

        if (!error && orders) {
            document.getElementById('totalOrders').textContent = orders.length;
            
            const totalSpent = orders
                .filter(order => order.status !== 'cancelled')
                .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
            document.getElementById('totalSpent').textContent = 
                totalSpent.toFixed(2) + ' ₺';
        }

        // Referans sayısı - mevcut referral_tracking tablosuna göre
        if (this.customerData?.group_code) {
            const { data: referrals, error: refError } = await supabase
                .from('referral_tracking')
                .select('id')
                .eq('group_code', this.customerData.group_code);

            if (!refError) {
                document.getElementById('referralCount').textContent = referrals.length;
            }
        }
    }

    async loadRecentOrders() {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                id,
                total_amount,
                status,
                created_at,
                delivery_address,
                seller:seller_profiles(business_name)
            `)
            .eq('customer_id', this.userProfile.id)
            .order('created_at', { ascending: false })
            .limit(5);

        const container = document.getElementById('recentOrdersList');
        
        if (error || !orders.length) {
            container.innerHTML = '<p class="text-muted">Henüz siparişiniz bulunmuyor.</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-item" style="border-bottom: 1px solid #eee; padding: 15px 0;">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <strong>Sipariş #${order.id.slice(-8)}</strong>
                    <span class="status-badge status-${order.status}">${this.getStatusText(order.status)}</span>
                </div>
                <div class="order-details" style="display: flex; justify-content: space-between; color: #666; font-size: 14px;">
                    <span>${order.seller?.business_name || 'Satıcı'}</span>
                    <span>${parseFloat(order.total_amount).toFixed(2)} ₺</span>
                </div>
                <div class="order-date" style="color: #999; font-size: 12px; margin-top: 5px;">
                    ${new Date(order.created_at).toLocaleDateString('tr-TR')} - ${order.delivery_address || 'Adres belirtilmemiş'}
                </div>
            </div>
        `).join('');
    }

    async loadCustomerOrders() {
        const section = document.getElementById('customerOrdersSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>Siparişlerim</h2>
                <div class="header-actions">
                    <select id="orderStatusFilter" class="form-control">
                        <option value="">Tüm Siparişler</option>
                        <option value="pending">Bekleyen</option>
                        <option value="confirmed">Onaylanan</option>
                        <option value="preparing">Hazırlanan</option>
                        <option value="ready">Hazır</option>
                        <option value="on_the_way">Yolda</option>
                        <option value="delivered">Teslim Edilen</option>
                        <option value="cancelled">İptal Edilen</option>
                    </select>
                </div>
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
        
        // Setup filter
        document.getElementById('orderStatusFilter').addEventListener('change', (e) => {
            this.filterCustomerOrders(e.target.value);
        });
    }

    async loadAllCustomerOrders() {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                seller:seller_profiles(business_name, phone),
                order_details(*),
                courier:couriers(full_name, phone)
            `)
            .eq('customer_id', this.userProfile.id)
            .order('created_at', { ascending: false });

        this.allOrders = orders || [];
        this.renderCustomerOrders(this.allOrders);
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
                            ${order.seller?.business_name} • ${order.customer_phone || this.customerData?.phone}
                        </div>
                    </div>
                    <span class="status-badge status-${order.status}" style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                        ${this.getStatusText(order.status)}
                    </span>
                </div>
                
                <div class="order-details" style="margin-bottom: 15px;">
                    ${order.order_details.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #f8f9fa;">
                            <span>${item.product_name} x ${item.quantity}</span>
                            <span>${parseFloat(item.total_price).toFixed(2)} ₺</span>
                        </div>
                    `).join('')}
                </div>
                
                <div class="order-footer" style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #e1e5e9;">
                    <div style="color: #666; font-size: 14px;">
                        <div>${new Date(order.created_at).toLocaleDateString('tr-TR')}</div>
                        ${order.courier ? `<div>Kurye: ${order.courier.full_name}</div>` : ''}
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 18px; font-weight: bold; color: var(--primary);">
                            ${parseFloat(order.total_amount).toFixed(2)} ₺
                        </div>
                        <div style="font-size: 12px; color: #666;">
                            ${order.payment_method || 'Ödeme yöntemi belirtilmemiş'}
                        </div>
                    </div>
                </div>
                
                ${order.customer_notes ? `
                    <div style="margin-top: 10px; padding: 10px; background: #f8f9fa; border-radius: 5px; font-size: 14px;">
                        <strong>Notunuz:</strong> ${order.customer_notes}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    filterCustomerOrders(status) {
        if (!status) {
            this.renderCustomerOrders(this.allOrders);
            return;
        }
        
        const filteredOrders = this.allOrders.filter(order => order.status === status);
        this.renderCustomerOrders(filteredOrders);
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

    async copyReferralLink() {
        const link = document.getElementById('referralLink').textContent;
        try {
            await navigator.clipboard.writeText(link);
            window.panelSystem.showAlert('Grup kodu panoya kopyalandı!', 'success');
        } catch (err) {
            console.error('Kopyalama hatası:', err);
            window.panelSystem.showAlert('Kopyalama başarısız!', 'error');
        }
    }
}

// Global instance
if (typeof window.customerPanel === 'undefined') {
    window.customerPanel = null;
}