class CustomerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.customerData = null;
        this.init();
    }

    async init() {
        await this.loadCustomerData();
    }

    async loadCustomerData() {
        const { data, error } = await supabase
            .from('customers')
            .select('*')
            .eq('id', this.userProfile.id)
            .single();

        if (data) {
            this.customerData = data;
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
            <h1>Hoş Geldiniz, ${this.customerData?.name || ''}!</h1>
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

            <div class="referral-section">
                <h3><i class="fas fa-user-plus"></i> Arkadaşını Davet Et, Bonus Kazan!</h3>
                <p>Arkadaşlarını davet ederek her biri için <strong>50 bonus puan</strong> kazan!</p>
                <div class="referral-code">
                    <span id="referralLink">Link yükleniyor...</span>
                    <button class="btn btn-primary" onclick="customerPanel.copyReferralLink()">
                        <i class="fas fa-copy"></i> Kopyala
                    </button>
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
                            <h3>Bonus Hareketleri</h3>
                        </div>
                        <div class="card-body">
                            <div id="bonusTransactionsList">
                                <div class="loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Hareketler yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadDashboardStats();
        await this.loadRecentOrders();
        await this.loadBonusTransactions();
        await this.generateReferralLink();
    }

    async loadDashboardStats() {
        // Load order statistics
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, total_amount, status')
            .eq('customer_id', this.userProfile.id);

        if (!error && orders) {
            document.getElementById('totalOrders').textContent = orders.length;
            
            const totalSpent = orders
                .filter(order => order.status !== ORDER_STATUS.CANCELLED)
                .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
            document.getElementById('totalSpent').textContent = 
                totalSpent.toFixed(2) + ' ₺';
        }

        // Load referral count
        const { data: referrals, error: refError } = await supabase
            .from('referral_tracking')
            .select('id')
            .eq('referrer_user_id', this.userProfile.id);

        if (!refError) {
            document.getElementById('referralCount').textContent = referrals.length;
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

    async loadBonusTransactions() {
        const { data: transactions, error } = await supabase
            .from('referral_bonus')
            .select(`
                bonus_amount,
                created_at,
                referral_tracking:referral_tracking(
                    new_user:customers(name)
                )
            `)
            .eq('referral_tracking.referrer_user_id', this.userProfile.id)
            .order('created_at', { ascending: false })
            .limit(5);

        const container = document.getElementById('bonusTransactionsList');
        
        if (error || !transactions.length) {
            container.innerHTML = '<p class="text-muted">Henüz bonus hareketiniz bulunmuyor.</p>';
            return;
        }

        container.innerHTML = transactions.map(transaction => `
            <div class="bonus-item" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <div style="display: flex; justify-content: between; align-items: center;">
                    <span style="font-weight: 500;">
                        ${transaction.referral_tracking?.new_user?.name || 'Yeni Kullanıcı'} daveti
                    </span>
                    <span style="color: var(--success); font-weight: bold;">
                        +${parseFloat(transaction.bonus_amount).toFixed(2)}
                    </span>
                </div>
                <div style="color: #999; font-size: 12px;">
                    ${new Date(transaction.created_at).toLocaleDateString('tr-TR')}
                </div>
            </div>
        `).join('');
    }

    async generateReferralLink() {
        try {
            // Check if user already has a referral link
            const { data: existingLink } = await supabase
                .from('referral_links')
                .select('referral_code')
                .eq('owner_user_id', this.userProfile.id)
                .eq('is_used', false)
                .single();

            let referralCode;
            
            if (existingLink) {
                referralCode = existingLink.referral_code;
            } else {
                // Create new referral link
                referralCode = await this.createReferralLink();
            }

            const referralLink = `${window.location.origin}/register?ref=${referralCode}`;
            document.getElementById('referralLink').textContent = referralLink;

        } catch (error) {
            console.error('Referans linki oluşturulamadı:', error);
            document.getElementById('referralLink').textContent = 'Hata oluştu';
        }
    }

    async createReferralLink() {
        const referralCode = Math.random().toString(36).substring(2, 10).toUpperCase();
        
        const { data, error } = await supabase
            .from('referral_links')
            .insert([{
                owner_user_id: this.userProfile.id,
                referral_code: referralCode,
                is_used: false,
                created_at: new Date().toISOString()
            }])
            .select()
            .single();

        if (error) throw error;
        return referralCode;
    }

    async copyReferralLink() {
        const link = document.getElementById('referralLink').textContent;
        try {
            await navigator.clipboard.writeText(link);
            window.panelSystem.showAlert('Referans linki panoya kopyalandı!', 'success');
        } catch (err) {
            console.error('Kopyalama hatası:', err);
            window.panelSystem.showAlert('Kopyalama başarısız!', 'error');
        }
    }

    getStatusText(status) {
        const statusMap = {
            [ORDER_STATUS.PENDING]: 'Bekliyor',
            [ORDER_STATUS.CONFIRMED]: 'Onaylandı',
            [ORDER_STATUS.PREPARING]: 'Hazırlanıyor',
            [ORDER_STATUS.READY]: 'Hazır',
            [ORDER_STATUS.ON_THE_WAY]: 'Yolda',
            [ORDER_STATUS.DELIVERED]: 'Teslim Edildi',
            [ORDER_STATUS.CANCELLED]: 'İptal Edildi'
        };
        return statusMap[status] || status;
    }

    async loadCustomerOrders() {
        const section = document.getElementById('customerOrdersSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>Siparişlerim</h2>
                <div class="header-actions">
                    <select id="orderStatusFilter" class="form-control">
                        <option value="">Tüm Siparişler</option>
                        <option value="${ORDER_STATUS.PENDING}">Bekleyen</option>
                        <option value="${ORDER_STATUS.CONFIRMED}">Onaylanan</option>
                        <option value="${ORDER_STATUS.PREPARING}">Hazırlanan</option>
                        <option value="${ORDER_STATUS.READY}">Hazır</option>
                        <option value="${ORDER_STATUS.ON_THE_WAY}">Yolda</option>
                        <option value="${ORDER_STATUS.DELIVERED}">Teslim Edilen</option>
                        <option value="${ORDER_STATUS.CANCELLED}">İptal Edilen</option>
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
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
                    <div>
                        <strong style="font-size: 16px;">Sipariş #${order.id.slice(-8)}</strong>
                        <div style="color: #666; font-size: 14px; margin-top: 5px;">
                            ${order.seller?.business_name} • ${order.customer_phone}
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
}