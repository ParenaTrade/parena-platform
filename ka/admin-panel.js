class AdminPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.init();
    }

    async init() {
        console.log('Admin panel initialized');
    }

       // ✅ YENİ: SİPARİŞ YÖNETİMİ SECTION
    async loadOrderManagement() {
        const section = document.getElementById('orderManagementSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>🚚 Sipariş & Kurye Yönetimi</h2>
                <div class="header-actions">
                    <button class="btn btn-success" onclick="adminPanel.startAutoAssignment()">
                        <i class="fas fa-robot"></i> Otomatik Kurye Atama
                    </button>
                    <button class="btn btn-info" onclick="adminPanel.refreshOrderList()">
                        <i class="fas fa-sync"></i> Yenile
                    </button>
                </div>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="pendingOrdersCount">0</h3>
                        <p>Kurye Bekleyen</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-motorcycle"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="availableCouriersCount">0</h3>
                        <p>Müsait Kurye</p>
                    </div>
                </div>
            </div>

            <div class="card">
                <div class="card-header">
                    <h3>📋 Kurye Ataması Bekleyen Siparişler</h3>
                </div>
                <div class="card-body">
                    <div id="ordersNeedingAssignment">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Siparişler yükleniyor...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadOrdersNeedingAssignment();
        await this.loadOrderManagementStats();
    }

    // ✅ KURYE ATAMA BEKLEYEN SİPARİŞLER
    async loadOrdersNeedingAssignment() {
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    customer:customers(name, phone),
                    seller:seller_profiles(business_name)
                `)
                .in('status', ['confirmed', 'preparing'])
                .is('courier_id', null)
                .order('created_at', { ascending: true });

            const container = document.getElementById('ordersNeedingAssignment');
            
            if (!orders || orders.length === 0) {
                container.innerHTML = `
                    <div class="text-center p-4">
                        <i class="fas fa-check-circle" style="font-size: 48px; color: #28a745;"></i>
                        <h4>🎉 Tüm siparişlere kurye atandı!</h4>
                    </div>
                `;
                return;
            }

            container.innerHTML = orders.map(order => `
                <div class="order-card" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <strong>Sipariş #${order.id.slice(-8)}</strong>
                            <div style="color: #666; font-size: 14px;">
                                ${order.customer?.name} • ${order.seller?.business_name}
                            </div>
                            <div style="color: #999; font-size: 12px;">
                                ${order.delivery_address}
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-weight: bold; color: var(--primary);">
                                ${parseFloat(order.total_amount || 0).toFixed(2)} ₺
                            </div>
                            <div style="color: #666; font-size: 12px;">
                                ${new Date(order.created_at).toLocaleTimeString('tr-TR')}
                            </div>
                        </div>
                    </div>
                    
                    <div style="display: flex; gap: 10px; margin-top: 10px;">
                        <button class="btn btn-success btn-sm" 
                                onclick="adminPanel.autoAssignCourier('${order.id}')">
                            <i class="fas fa-robot"></i> Otomatik Ata
                        </button>
                        
                        <select class="form-control form-control-sm" 
                                onchange="adminPanel.manualAssignCourier('${order.id}', this.value)"
                                style="min-width: 200px;">
                            <option value="">Manuel Kurye Seçin</option>
                        </select>
                    </div>
                </div>
            `).join('');

            // Kurye listelerini yükle
            for (const order of orders) {
                await this.loadAvailableCouriersForOrder(order.id);
            }

        } catch (error) {
            console.error('Sipariş yükleme hatası:', error);
        }
    }

    // ✅ OTOMATİK KURYE ATAMA
    async autoAssignCourier(orderId) {
        try {
            const suitableCouriers = await this.findSuitableCouriers(orderId);
            
            if (suitableCouriers.length === 0) {
                window.panelSystem.showAlert('Uygun kurye bulunamadı!', 'error');
                return;
            }

            const bestCourier = suitableCouriers[0];
            const success = await this.assignCourierToOrder(orderId, bestCourier.id);
            
            if (success) {
                window.panelSystem.showAlert(`Kurye atandı: ${bestCourier.full_name}`, 'success');
                await this.loadOrdersNeedingAssignment();
            }

        } catch (error) {
            console.error('Otomatik atama hatası:', error);
            window.panelSystem.showAlert('Otomatik atama başarısız!', 'error');
        }
    }

    // ✅ KURYE ATAMA İŞLEMİ
    async assignCourierToOrder(orderId, courierId) {
        try {
            const { error } = await supabase
                .from('orders')
                .update({
                    courier_id: courierId,
                    status: 'preparing',
                    assigned_at: new Date().toISOString()
                })
                .eq('id', orderId);

            return !error;
        } catch (error) {
            console.error('Kurye atama hatası:', error);
            return false;
        }
    }
    
    // ✅ loadSectionData'ya EKLE
    async loadSectionData(sectionName) {
        const section = document.getElementById(sectionName + 'Section');
        
        switch (sectionName) {
            case 'dashboard':
                await this.loadAdminDashboard();
                break;
            case 'sellerManagement':
                await this.loadSellerManagement();
                break;
            case 'courierManagement':
                await this.loadCourierManagement();
                break;
            case 'orderManagement':  // ✅ YENİ EKLENDİ
                await this.loadOrderManagement();
                break;
            case 'allOrders':
                await this.loadAllOrders();
                break;
            case 'reports':
                await this.loadReports();
                break;
            case 'systemSettings':
                await this.loadSystemSettings();
                break;
        }
    }
    async loadAdminDashboard() {
        const section = document.getElementById('dashboardSection');
        section.innerHTML = `
            <h1>Admin Dashboard</h1>
            <p class="subtitle">Sistem geneli istatistikler ve yönetim</p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-store"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="totalSellers">0</h3>
                        <p>Toplam Satıcı</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-motorcycle"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="totalCouriers">0</h3>
                        <p>Toplam Kurye</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="totalOrders">0</h3>
                        <p>Toplam Sipariş</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="totalRevenue">0 ₺</h3>
                        <p>Toplam Ciro</p>
                    </div>
                </div>
            </div>

            <div class="content-row">
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>Onay Bekleyenler</h3>
                        </div>
                        <div class="card-body">
                            <div id="pendingApprovals">
                                <div class="loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Veriler yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>Son Siparişler</h3>
                        </div>
                        <div class="card-body">
                            <div id="recentOrders">
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

        await this.loadAdminStats();
    }

    async loadAdminStats() {
        // Satıcı sayısı
        const { data: sellers, error: sellersError } = await supabase
            .from('seller_profiles')
            .select('id', { count: 'exact' });

        if (!sellersError) {
            document.getElementById('totalSellers').textContent = sellers.length;
        }

        // Kurye sayısı
        const { data: couriers, error: couriersError } = await supabase
            .from('couriers')
            .select('id', { count: 'exact' });

        if (!couriersError) {
            document.getElementById('totalCouriers').textContent = couriers.length;
        }

        // Sipariş istatistikleri
        const { data: orders, error: ordersError } = await supabase
            .from('orders')
            .select('id, total_amount');

        if (!ordersError) {
            document.getElementById('totalOrders').textContent = orders.length;
            
            const totalRevenue = orders.reduce((sum, order) => 
                sum + parseFloat(order.total_amount || 0), 0);
            document.getElementById('totalRevenue').textContent = 
                totalRevenue.toFixed(2) + ' ₺';
        }
    }

    async loadSellerManagement() {
        const section = document.getElementById('sellerManagementSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>Satıcı Yönetimi</h2>
                <button class="btn btn-primary" id="addSellerBtn">
                    <i class="fas fa-plus"></i> Yeni Satıcı
                </button>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="data-table" id="sellersTable">
                            <thead>
                                <tr>
                                    <th>İşletme Adı</th>
                                    <th>Telefon</th>
                                    <th>Şehir</th>
                                    <th>Durum</th>
                                    <th>Kayıt Tarihi</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="6" class="text-center">
                                        <div class="loading-spinner">
                                            <i class="fas fa-spinner fa-spin"></i>
                                            <p>Satıcılar yükleniyor...</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        await this.loadSellersData();
    }

    async loadSellersData() {
        const { data: sellers, error } = await supabase
            .from('seller_profiles')
            .select('*')
            .order('created_at', { ascending: false });

        const tbody = document.querySelector('#sellersTable tbody');
        
        if (error || !sellers.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <p class="text-muted">Henüz satıcı kaydı bulunmuyor.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = sellers.map(seller => `
            <tr>
                <td>
                    <div style="font-weight: 500;">${seller.business_name}</div>
                    <div style="font-size: 12px; color: #666;">${seller.email || ''}</div>
                </td>
                <td>${seller.phone || '-'}</td>
                <td>${seller.city || '-'}</td>
                <td>
                    <span class="status-badge status-${seller.status ? 'active' : 'inactive'}">
                        ${seller.status ? 'Aktif' : 'Pasif'}
                    </span>
                </td>
                <td>${new Date(seller.created_at).toLocaleDateString('tr-TR')}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-primary" onclick="adminPanel.editSeller('${seller.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-${seller.status ? 'warning' : 'success'}" 
                                onclick="adminPanel.toggleSellerStatus('${seller.id}', ${!seller.status})">
                            <i class="fas fa-${seller.status ? 'pause' : 'play'}"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async toggleSellerStatus(sellerId, newStatus) {
        try {
            const { error } = await supabase
                .from('seller_profiles')
                .update({ status: newStatus })
                .eq('id', sellerId);

            if (error) throw error;

            window.panelSystem.showAlert(`Satıcı durumu güncellendi`, 'success');
            await this.loadSellersData();

        } catch (error) {
            console.error('Satıcı durumu güncelleme hatası:', error);
            window.panelSystem.showAlert('Satıcı durumu güncellenemedi!', 'error');
        }
    }
}

// Global instance
window.adminPanel = new AdminPanel();
