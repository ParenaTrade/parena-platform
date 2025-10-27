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
    }

    async loadDashboardStats() {
        // Load order statistics
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, total_amount')
            .eq('customer_id', this.userProfile.id);

        if (!error && orders) {
            document.getElementById('totalOrders').textContent = orders.length;
            
            const totalSpent = orders.reduce((sum, order) => 
                sum + parseFloat(order.total_amount || 0), 0);
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
            .select('*')
            .eq('customer_id', this.userProfile.id)
            .order('created_at', { ascending: false })
            .limit(5);

        const container = document.getElementById('recentOrdersList');
        
        if (error || !orders.length) {
            container.innerHTML = '<p class="text-muted">Henüz siparişiniz bulunmuyor.</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-item">
                <div class="order-header">
                    <strong>Sipariş #${order.id.slice(-8)}</strong>
                    <span class="status-badge status-${order.status}">${this.getStatusText(order.status)}</span>
                </div>
                <div class="order-details">
                    <span>${parseFloat(order.total_amount).toFixed(2)} ₺</span>
                    <small>${new Date(order.created_at).toLocaleDateString('tr-TR')}</small>
                </div>
            </div>
        `).join('');
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