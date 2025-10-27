class SellerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.sellerData = null;
        this.products = [];
        this.init();
    }

    async init() {
        await this.loadSellerData();
        this.setupRealTimeListeners();
    }

    async loadSellerData() {
        const { data, error } = await supabase
            .from('seller_profiles')
            .select('*')
            .eq('seller_id', this.userProfile.id)
            .single();

        if (data) {
            this.sellerData = data;
        }
    }

    setupRealTimeListeners() {
        // Real-time order listeners would be implemented here
        console.log('Real-time listeners setup for seller:', this.sellerData?.id);
    }

    async loadSectionData(sectionName) {
        switch (sectionName) {
            case 'sellerDashboard':
                await this.loadSellerDashboard();
                break;
            case 'sellerInfo':
                await this.loadSellerInfo();
                break;
            case 'products':
                await this.loadProducts();
                break;
            case 'orders':
                await this.loadSellerOrders();
                break;
            case 'deliveryAreas':
                await this.loadDeliveryAreas();
                break;
        }
    }

    async loadSellerDashboard() {
        const section = document.getElementById('sellerDashboardSection');
        section.innerHTML = `
            <h1>İşletme Paneli</h1>
            <p class="subtitle">${this.sellerData?.business_name || ''}</p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-shopping-cart"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="todayOrders">0</h3>
                        <p>Bugünkü Sipariş</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="todayRevenue">0 ₺</h3>
                        <p>Bugünkü Ciro</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="pendingOrders">0</h3>
                        <p>Bekleyen Sipariş</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="sellerRating">0.0</h3>
                        <p>Ortalama Puan</p>
                    </div>
                </div>
            </div>

            <div class="content-row">
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>Son Siparişler</h3>
                            <a href="#" class="view-all" onclick="window.panelSystem.showSection('orders')">Tümünü Gör</a>
                        </div>
                        <div class="card-body">
                            <div id="recentSellerOrders">
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
                            <h3>Stok Uyarıları</h3>
                        </div>
                        <div class="card-body">
                            <div id="stockAlerts">
                                <div class="loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Stok kontrol ediliyor...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadSellerStats();
        await this.loadRecentSellerOrders();
        await this.loadStockAlerts();
    }

    async loadSellerStats() {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, total_amount, status, created_at')
            .eq('seller_id', this.sellerData?.id)
            .gte('created_at', today);

        if (!error && orders) {
            document.getElementById('todayOrders').textContent = orders.length;
            
            const todayRevenue = orders
                .filter(order => order.status !== 'cancelled')
                .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
            document.getElementById('todayRevenue').textContent = 
                todayRevenue.toFixed(2) + ' ₺';

            const pendingOrders = orders.filter(order => 
                ['pending', 'confirmed', 'preparing'].includes(order.status)
            ).length;
            document.getElementById('pendingOrders').textContent = pendingOrders;
        }
    }

    async loadProducts() {
        const section = document.getElementById('productsSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>Ürün Yönetimi</h2>
                <button class="btn btn-primary" id="addProductBtn">
                    <i class="fas fa-plus"></i> Yeni Ürün
                </button>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="filters">
                        <select id="categoryFilter" class="form-control">
                            <option value="">Tüm Kategoriler</option>
                        </select>
                        <select id="productStatusFilter" class="form-control">
                            <option value="">Tüm Durumlar</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Pasif</option>
                        </select>
                        <input type="text" id="productSearch" placeholder="Ürün ara..." class="form-control">
                    </div>
                    <div class="table-responsive">
                        <table class="data-table" id="productsTable">
                            <thead>
                                <tr>
                                    <th>Ürün Adı</th>
                                    <th>Kategori</th>
                                    <th>Fiyat</th>
                                    <th>Stok</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="6" class="text-center">
                                        <div class="loading-spinner">
                                            <i class="fas fa-spinner fa-spin"></i>
                                            <p>Ürünler yükleniyor...</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        // Load products data
        await this.loadProductsData();
        
        // Setup event listeners
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.showAddProductModal();
        });
    }

    async loadProductsData() {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('seller_id', this.sellerData?.id)
            .order('created_at', { ascending: false });

        const tbody = document.querySelector('#productsTable tbody');
        
        if (error || !products.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <p class="text-muted">Henüz ürün eklenmemiş.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>${product.name}</td>
                <td>${product.category_id || '-'}</td>
                <td>${parseFloat(product.price).toFixed(2)} ₺</td>
                <td>${product.stock}</td>
                <td>
                    <span class="status-badge status-${product.is_active ? 'active' : 'inactive'}">
                        ${product.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                </td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="sellerPanel.editProduct('${product.id}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="sellerPanel.deleteProduct('${product.id}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    }

    showAddProductModal() {
        // Product modal implementation
        window.panelSystem.showAlert('Ürün ekleme modalı açılacak', 'success');
    }
}