class SellerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.sellerData = null;
        this.products = [];
        this.orders = [];
        this.allSellerOrders = [];
        this.currentSection = '';
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
        // Real-time order listeners
        if (this.sellerData?.id) {
            const ordersSubscription = supabase
                .channel('orders')
                .on('postgres_changes', 
                    { 
                        event: 'INSERT', 
                        schema: 'public', 
                        table: 'orders',
                        filter: `seller_id=eq.${this.sellerData.id}`
                    }, 
                    (payload) => {
                        this.handleNewOrder(payload.new);
                    }
                )
                .subscribe();
        }
    }

    async handleNewOrder(order) {
        // Show notification for new order
        window.panelSystem.showAlert(`Yeni sipariş geldi! #${order.id.slice(-8)}`, 'success');
        
        // Play sound notification
        this.playOrderSound();
        
        // Update orders list if we're on orders page
        if (this.currentSection === 'orders') {
            await this.loadSellerOrders();
        }
    }

    playOrderSound() {
        // Simple beep sound for notification
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            setTimeout(() => oscillator.stop(), 200);
        } catch (e) {
            console.log('Ses çalınamadı:', e);
        }
    }

    async loadSectionData(sectionName) {
        this.currentSection = sectionName;
        
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
            case 'sellerReports':
                await this.loadSellerReports();
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

        // Calculate average rating from orders
        const { data: ratedOrders } = await supabase
            .from('orders')
            .select('performance_rating')
            .eq('seller_id', this.sellerData?.id)
            .not('performance_rating', 'is', null);

        if (ratedOrders && ratedOrders.length > 0) {
            const avgRating = ratedOrders.reduce((sum, order) => 
                sum + parseFloat(order.performance_rating || 0), 0) / ratedOrders.length;
            document.getElementById('sellerRating').textContent = avgRating.toFixed(1);
        }
    }

    async loadRecentSellerOrders() {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                id,
                total_amount,
                status,
                created_at,
                customer_name,
                customer_phone,
                delivery_address,
                order_details!inner(quantity, product_name)
            `)
            .eq('seller_id', this.sellerData?.id)
            .order('created_at', { ascending: false })
            .limit(5);

        const container = document.getElementById('recentSellerOrders');
        
        if (error || !orders.length) {
            container.innerHTML = '<p class="text-muted">Henüz siparişiniz bulunmuyor.</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-item" style="border-bottom: 1px solid #eee; padding: 15px 0;">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                    <div>
                        <strong>Sipariş #${order.id.slice(-8)}</strong>
                        <div style="color: #666; font-size: 12px; margin-top: 2px;">
                            ${order.customer_name} • ${order.customer_phone}
                        </div>
                    </div>
                    <span class="status-badge status-${order.status}">${this.getStatusText(order.status)}</span>
                </div>
                <div class="order-details" style="color: #666; font-size: 14px;">
                    ${order.order_details[0]?.product_name} 
                    ${order.order_details.length > 1 ? `ve ${order.order_details.length - 1} ürün daha` : ''}
                </div>
                <div class="order-footer" style="display: flex; justify-content: space-between; margin-top: 8px;">
                    <span style="font-weight: bold; color: var(--primary);">
                        ${parseFloat(order.total_amount).toFixed(2)} ₺
                    </span>
                    <small style="color: #999;">
                        ${new Date(order.created_at).toLocaleDateString('tr-TR')}
                    </small>
                </div>
            </div>
        `).join('');
    }

    async loadStockAlerts() {
        const { data: products, error } = await supabase
            .from('products')
            .select('name, stock')
            .eq('seller_id', this.sellerData?.id)
            .lt('stock', 10); // Products with stock less than 10

        const container = document.getElementById('stockAlerts');
        
        if (error || !products.length) {
            container.innerHTML = '<p class="text-muted">Stok uyarısı bulunmuyor.</p>';
            return;
        }

        container.innerHTML = products.map(product => `
            <div class="stock-alert" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 500;">${product.name}</span>
                    <span style="color: var(--danger); font-weight: bold;">
                        ${product.stock} adet
                    </span>
                </div>
            </div>
        `).join('');
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
                                    <th>Barkod</th>
                                    <th>Kategori</th>
                                    <th>Fiyat</th>
                                    <th>Stok</th>
                                    <th>Durum</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="7" class="text-center">
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

        await this.loadProductsData();
        
        // Setup event listeners
        document.getElementById('addProductBtn').addEventListener('click', () => {
            this.showAddProductModal();
        });

        document.getElementById('productSearch').addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });
    }

    async loadProductsData() {
        const { data: products, error } = await supabase
            .from('products')
            .select('*')
            .eq('seller_id', this.sellerData?.id)
            .order('created_at', { ascending: false });

        this.products = products || [];
        this.renderProductsTable(this.products);
    }

    renderProductsTable(products) {
        const tbody = document.querySelector('#productsTable tbody');
        
        if (!products.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <p class="text-muted">Henüz ürün eklenmemiş.</p>
                        <button class="btn btn-primary mt-2" onclick="sellerPanel.showAddProductModal()">
                            <i class="fas fa-plus"></i> İlk Ürünü Ekle
                        </button>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = products.map(product => `
            <tr>
                <td>
                    <div style="display: flex; align-items: center; gap: 10px;">
                        ${product.imgurl ? `<img src="${product.imgurl}" alt="${product.name}" style="width: 40px; height: 40px; object-fit: cover; border-radius: 4px;">` : ''}
                        <div>
                            <div style="font-weight: 500;">${product.name}</div>
                            ${product.description ? `<div style="font-size: 12px; color: #666;">${product.description.substring(0, 50)}...</div>` : ''}
                        </div>
                    </div>
                </td>
                <td>${product.barcode || '-'}</td>
                <td>${product.category_id || '-'}</td>
                <td>
                    <div style="font-weight: bold;">${parseFloat(product.price).toFixed(2)} ₺</div>
                    ${product.tax_rate ? `<div style="font-size: 12px; color: #666;">KDV: %${product.tax_rate}</div>` : ''}
                </td>
                <td>
                    <span class="${product.stock < 10 ? 'text-danger' : 'text-success'}" style="font-weight: 500;">
                        ${product.stock} ${product.unit_type || 'adet'}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${product.is_active ? 'active' : 'inactive'}">
                        ${product.is_active ? 'Aktif' : 'Pasif'}
                    </span>
                </td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-primary" onclick="sellerPanel.editProduct('${product.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="sellerPanel.deleteProduct('${product.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    }

    showAddProductModal() {
        const modalHtml = `
            <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div class="modal" style="background: white; border-radius: 12px; padding: 30px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Yeni Ürün Ekle</h3>
                        <button class="btn btn-sm btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <form id="addProductForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productName">Ürün Adı *</label>
                                <input type="text" id="productName" class="form-control" required>
                            </div>
                            <div class="form-group">
                                <label for="productBarcode">Barkod</label>
                                <input type="text" id="productBarcode" class="form-control">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="productPrice">Fiyat (₺) *</label>
                                <input type="number" id="productPrice" class="form-control" step="0.01" min="0" required>
                            </div>
                            <div class="form-group">
                                <label for="productStock">Stok *</label>
                                <input type="number" id="productStock" class="form-control" min="0" required>
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="productDescription">Açıklama</label>
                            <textarea id="productDescription" class="form-control" rows="3"></textarea>
                        </div>
                        <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                            <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                            <button type="submit" class="btn btn-primary">Ürünü Ekle</button>
                        </div>
                    </form>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('addProductForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.addNewProduct();
        });
    }

    async addNewProduct() {
        const productData = {
            name: document.getElementById('productName').value,
            barcode: document.getElementById('productBarcode').value,
            price: parseFloat(document.getElementById('productPrice').value),
            stock: parseInt(document.getElementById('productStock').value),
            description: document.getElementById('productDescription').value,
            seller_id: this.sellerData.id,
            currency: 'TRY',
            is_active: true,
            created_at: new Date().toISOString()
        };

        try {
            const { data, error } = await supabase
                .from('products')
                .insert([productData])
                .select()
                .single();

            if (error) throw error;

            // Also add to product_prices table
            await supabase
                .from('product_prices')
                .insert([{
                    product_id: data.id,
                    seller_id: this.sellerData.id,
                    price: productData.price,
                    stock: productData.stock,
                    currency: 'TRY',
                    created: new Date().toISOString()
                }]);

            window.panelSystem.showAlert('Ürün başarıyla eklendi!', 'success');
            document.querySelector('.modal-overlay').remove();
            await this.loadProductsData();

        } catch (error) {
            console.error('Ürün ekleme hatası:', error);
            window.panelSystem.showAlert('Ürün eklenemedi!', 'error');
        }
    }

    searchProducts(searchTerm) {
        if (!searchTerm) {
            this.renderProductsTable(this.products);
            return;
        }
        
        const filteredProducts = this.products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (product.barcode && product.barcode.includes(searchTerm)) ||
            (product.description && product.description.toLowerCase().includes(searchTerm.toLowerCase()))
        );
        this.renderProductsTable(filteredProducts);
    }

    async editProduct(productId) {
        window.panelSystem.showAlert('Ürün düzenleme özelliği yakında eklenecek!', 'info');
    }

    async deleteProduct(productId) {
        if (confirm('Bu ürünü silmek istediğinizden emin misiniz?')) {
            try {
                const { error } = await supabase
                    .from('products')
                    .delete()
                    .eq('id', productId);

                if (error) throw error;

                window.panelSystem.showAlert('Ürün başarıyla silindi!', 'success');
                await this.loadProductsData();

            } catch (error) {
                console.error('Ürün silme hatası:', error);
                window.panelSystem.showAlert('Ürün silinemedi!', 'error');
            }
        }
    }

    // Seller Panel'e yeni metodlar ekle:

async loadSellerOrders() {
    const section = document.getElementById('ordersSection');
    section.innerHTML = `
        <div class="section-header">
            <h2>Siparişler</h2>
            <div class="header-actions">
                <select id="sellerOrderStatusFilter" class="form-control">
                    <option value="">Tüm Siparişler</option>
                    <option value="pending">Bekleyen</option>
                    <option value="confirmed">Onaylanan</option>
                    <option value="preparing">Hazırlanan</option>
                    <option value="ready">Hazır</option>
                    <option value="on_the_way">Yolda</option>
                    <option value="delivered">Teslim Edilen</option>
                    <option value="cancelled">İptal Edilen</option>
                </select>
                <input type="date" id="sellerOrderDate" class="form-control">
            </div>
        </div>
        <div class="card">
            <div class="card-body">
                <div id="sellerOrdersList">
                    <div class="loading-spinner">
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Siparişler yükleniyor...</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    await this.loadAllSellerOrders();
    
    // Setup filters
    document.getElementById('sellerOrderStatusFilter').addEventListener('change', (e) => {
        this.filterSellerOrders(e.target.value);
    });

    document.getElementById('sellerOrderDate').addEventListener('change', (e) => {
        this.filterSellerOrdersByDate(e.target.value);
    });
}
    async loadAllSellerOrders() {
        const { data: orders, error } = await supabase
            .from('orders')
            .select(`
                *,
                order_details(*),
                customer:customers(name, phone),
                courier:couriers(full_name, phone)
            `)
            .eq('seller_id', this.sellerData?.id)
            .order('created_at', { ascending: false });

        this.allSellerOrders = orders || [];
        this.renderSellerOrders(this.allSellerOrders);
    }

    renderSellerOrders(orders) {
        const container = document.getElementById('sellerOrdersList');
        
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
                            ${order.customer?.name || order.customer_name} • ${order.customer?.phone || order.customer_phone}
                        </div>
                        <div style="color: #999; font-size: 12px; margin-top: 2px;">
                            ${order.delivery_address || 'Adres belirtilmemiş'}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="status-badge status-${order.status}" style="padding: 6px 12px; border-radius: 20px; font-size: 12px; font-weight: 600;">
                            ${this.getStatusText(order.status)}
                        </span>
                        <div style="margin-top: 5px; font-size: 14px; font-weight: bold; color: var(--primary);">
                            ${parseFloat(order.total_amount).toFixed(2)} ₺
                        </div>
                    </div>
                </div>
                
                <div class="order-items" style="margin-bottom: 15px;">
                    ${order.order_details.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">
                            <div>
                                <span style="font-weight: 500;">${item.product_name}</span>
                                <div style="font-size: 12px; color: #666;">
                                    ${item.quantity} ${item.unit_type} × ${parseFloat(item.unit_price).toFixed(2)} ₺
                                    ${item.discount > 0 ? `(-${parseFloat(item.discount).toFixed(2)} ₺ indirim)` : ''}
                                </div>
                            </div>
                            <div style="font-weight: bold;">
                                ${parseFloat(item.total_price).toFixed(2)} ₺
                            </div>
                        </div>
                    `).join('')}
                </div>
                
                <div class="order-footer" style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #e1e5e9;">
                    <div style="color: #666; font-size: 14px;">
                        <div>${new Date(order.created_at).toLocaleString('tr-TR')}</div>
                        ${order.courier ? `<div>Kurye: ${order.courier.full_name} (${order.courier.phone})</div>` : ''}
                        ${order.payment_method ? `<div>Ödeme: ${order.payment_method}</div>` : ''}
                    </div>
                    <div class="order-actions" style="display: flex; gap: 10px;">
                        ${this.getOrderActions(order)}
                    </div>
                </div>
                
                ${order.customer_notes ? `
                    <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px; font-size: 14px;">
                        <strong>Müşteri Notu:</strong> ${order.customer_notes}
                    </div>
                ` : ''}
                
                ${order.seller_notes ? `
                    <div style="margin-top: 10px; padding: 10px; background: #d1ecf1; border-radius: 5px; font-size: 14px;">
                        <strong>Notunuz:</strong> ${order.seller_notes}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

   getOrderActions(order) {
    const actions = [];
    
    if (order.status === 'pending') {
        actions.push(`
            <button class="btn btn-success btn-sm" onclick="window.sellerPanel.updateOrderStatus('${order.id}', 'confirmed')">
                <i class="fas fa-check"></i> Onayla
            </button>
            <button class="btn btn-danger btn-sm" onclick="window.sellerPanel.cancelOrder('${order.id}')">
                <i class="fas fa-times"></i> Reddet
            </button>
        `);
    }
    
    if (order.status === 'confirmed') {
        actions.push(`
            <button class="btn btn-warning btn-sm" onclick="sellerPanel.updateOrderStatus('${order.id}', 'preparing')">
                <i class="fas fa-utensils"></i> Hazırlanıyor
            </button>
        `);
    }
    
    if (order.status === 'preparing') {
        actions.push(`
            <button class="btn btn-info btn-sm" onclick="sellerPanel.updateOrderStatus('${order.id}', 'ready')">
                <i class="fas fa-check-double"></i> Hazır
            </button>
        `);
    }

    // YENİ: Kurye atama butonları eklendi
if (order.status === 'ready' && !order.courier_id) {
        actions.push(`
            <button class="btn btn-primary btn-sm" onclick="window.sellerPanel.showCourierAssignmentModal('${order.id}')">
                <i class="fas fa-motorcycle"></i> Kurye Ata
            </button>
        `);
    }

    if (order.courier_id) {
        actions.push(`
            <button class="btn btn-secondary btn-sm" onclick="sellerPanel.showCourierInfo('${order.id}')">
                <i class="fas fa-user"></i> Kurye: ${order.courier?.full_name || 'Atandı'}
            </button>
        `);
    }

    // Add note button for all orders
    actions.push(`
        <button class="btn btn-secondary btn-sm" onclick="sellerPanel.addOrderNote('${order.id}')">
            <i class="fas fa-sticky-note"></i> Not Ekle
        </button>
    `);

    return actions.join('');
}
    async updateOrderStatus(orderId, newStatus) {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert(`Sipariş durumu güncellendi: ${this.getStatusText(newStatus)}`, 'success');
            
            // Reload orders
            await this.loadAllSellerOrders();

        } catch (error) {
            console.error('Sipariş durumu güncelleme hatası:', error);
            window.panelSystem.showAlert('Sipariş durumu güncellenemedi!', 'error');
        }
    }

    async cancelOrder(orderId) {
        const reason = prompt('İptal nedeni:');
        if (!reason) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({ 
                    status: 'cancelled',
                    cancellation_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert('Sipariş iptal edildi', 'success');
            await this.loadAllSellerOrders();

        } catch (error) {
            console.error('Sipariş iptal hatası:', error);
            window.panelSystem.showAlert('Sipariş iptal edilemedi!', 'error');
        }
    }

    async addOrderNote(orderId) {
        const note = prompt('Sipariş notu:');
        if (!note) return;

        try {
            const { error } = await supabase
                .from('orders')
                .update({ 
                    seller_notes: note,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert('Not eklendi', 'success');
            await this.loadAllSellerOrders();

        } catch (error) {
            console.error('Not ekleme hatası:', error);
            window.panelSystem.showAlert('Not eklenemedi!', 'error');
        }
    }

    filterSellerOrders(status) {
        if (!status) {
            this.renderSellerOrders(this.allSellerOrders);
            return;
        }
        
        const filteredOrders = this.allSellerOrders.filter(order => order.status === status);
        this.renderSellerOrders(filteredOrders);
    }

    filterSellerOrdersByDate(date) {
        if (!date) {
            this.renderSellerOrders(this.allSellerOrders);
            return;
        }
        
        const filteredOrders = this.allSellerOrders.filter(order => 
            order.created_at.startsWith(date)
        );
        this.renderSellerOrders(filteredOrders);
    }

    async loadSellerInfo() {
        const section = document.getElementById('sellerInfoSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>İşletme Bilgileri</h2>
            </div>
            <div class="card">
                <div class="card-body">
                    <form id="sellerInfoForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="businessName">İşletme Adı</label>
                                <input type="text" id="businessName" class="form-control" value="${this.sellerData?.business_name || ''}">
                            </div>
                            <div class="form-group">
                                <label for="sellerPhone">Telefon</label>
                                <input type="text" id="sellerPhone" class="form-control" value="${this.sellerData?.phone || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="sellerEmail">E-posta</label>
                                <input type="email" id="sellerEmail" class="form-control" value="${this.sellerData?.email || ''}">
                            </div>
                            <div class="form-group">
                                <label for="sellerCity">Şehir</label>
                                <input type="text" id="sellerCity" class="form-control" value="${this.sellerData?.city || ''}">
                            </div>
                        </div>
                        <div class="form-group">
                            <label for="sellerAddress">Adres</label>
                            <textarea id="sellerAddress" class="form-control" rows="3">${this.sellerData?.address || ''}</textarea>
                        </div>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Bilgileri Güncelle
                        </button>
                    </form>
                </div>
            </div>
        `;
    }

    async loadDeliveryAreas() {
        const section = document.getElementById('deliveryAreasSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>Teslimat Bölgeleri</h2>
                <button class="btn btn-primary" id="addDeliveryAreaBtn">
                    <i class="fas fa-plus"></i> Yeni Bölge Ekle
                </button>
            </div>
            <div class="card">
                <div class="card-body">
                    <p class="text-muted">Teslimat bölgeleri yönetimi yakında eklenecek.</p>
                </div>
            </div>
        `;
    }

    async loadSellerReports() {
        const section = document.getElementById('sellerReportsSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>Satış Raporları</h2>
            </div>
            <div class="card">
                <div class="card-body">
                    <p class="text-muted">Detaylı satış raporları yakında eklenecek.</p>
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
   

// YENİ METODLAR - seller-panel.js sonuna ekle

async showCourierAssignmentModal(orderId) {
    // Müsait kuryeleri getir
    const availableCouriers = await this.getAvailableCouriers();
    
    const modalHtml = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal" style="background: white; border-radius: 12px; padding: 30px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Kurye Atama</h3>
                    <button class="btn btn-sm btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="assignment-options" style="margin-bottom: 20px;">
                    <div class="form-group">
                        <label>Atama Türü</label>
                        <div style="display: flex; gap: 10px; margin-bottom: 15px;">
                            <button class="btn btn-primary" id="autoAssignBtn">
                                <i class="fas fa-robot"></i> Otomatik Ata
                            </button>
                            <button class="btn btn-secondary" id="manualAssignBtn">
                                <i class="fas fa-user"></i> Manuel Ata
                            </button>
                        </div>
                    </div>
                </div>

                <div id="manualAssignmentSection" style="display: none;">
                    <div class="form-group">
                        <label for="courierSelect">Kurye Seçin</label>
                        <select id="courierSelect" class="form-control">
                            <option value="">Kurye seçin...</option>
                            ${availableCouriers.map(courier => `
                                <option value="${courier.id}">
                                    ${courier.full_name} - ${courier.vehicle_type} 
                                    (${courier.current_deliveries || 0}/5 teslimat)
                                    ${courier.distance ? `- ${courier.distance.toFixed(1)}km` : ''}
                                </option>
                            `).join('')}
                        </select>
                    </div>
                    <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="sellerPanel.assignCourierManually('${orderId}')">
                            Kurye Ata
                        </button>
                    </div>
                </div>

                <div id="autoAssignmentResult" style="display: none;">
                    <!-- Otomatik atama sonucu burada gösterilecek -->
                </div>
            </div>
        </div>
        `;
    
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    
        // Event listeners
        document.getElementById('autoAssignBtn').addEventListener('click', async () => {
            await this.assignCourierAutomatically(orderId);
        });
    
        document.getElementById('manualAssignBtn').addEventListener('click', () => {
            document.getElementById('manualAssignmentSection').style.display = 'block';
            document.getElementById('autoAssignmentResult').style.display = 'none';
        });
    }
    
    async getAvailableCouriers() {
        const { data: couriers, error } = await supabase
            .from('couriers')
            .select('*')
            .eq('is_online', true)
            .eq('status', 'active')
            .lt('current_deliveries', 5)
            .order('current_deliveries', { ascending: true });
    
        return couriers || [];
    }
    
    async assignCourierAutomatically(orderId) {
        try {
            // Satıcı konumunu al
            const sellerLocation = await this.getSellerLocation();
            
            // Otomatik kurye ata
            const assignedCourier = await window.courierAssignmentSystem.assignBestCourier(orderId, sellerLocation);
            
            if (assignedCourier) {
                window.panelSystem.showAlert(`Otomatik kurye atandı: ${assignedCourier.full_name}`, 'success');
                document.querySelector('.modal-overlay').remove();
                await this.loadAllSellerOrders();
            } else {
                window.panelSystem.showAlert('Müsait kurye bulunamadı!', 'error');
            }
    
        } catch (error) {
            console.error('Otomatik kurye atama hatası:', error);
            window.panelSystem.showAlert('Kurye atanamadı!', 'error');
        }
    }
    
    async assignCourierManually(orderId) {
        const courierSelect = document.getElementById('courierSelect');
        const courierId = courierSelect.value;
    
        if (!courierId) {
            window.panelSystem.showAlert('Lütfen bir kurye seçin!', 'error');
            return;
        }
    
        try {
            const success = await window.courierAssignmentSystem.assignCourierManually(orderId, courierId);
            
            if (success) {
                window.panelSystem.showAlert('Kurye başarıyla atandı!', 'success');
                document.querySelector('.modal-overlay').remove();
                await this.loadAllSellerOrders();
            } else {
                window.panelSystem.showAlert('Kurye atanamadı!', 'error');
            }
    
        } catch (error) {
            console.error('Manuel kurye atama hatası:', error);
            window.panelSystem.showAlert('Kurye atanamadı!', 'error');
        }
    }
    
    async getSellerLocation() {
        // Satıcı konumunu getir (seller_profiles tablosundan)
        if (this.sellerData?.latitude && this.sellerData?.longitude) {
            return {
                latitude: this.sellerData.latitude,
                longitude: this.sellerData.longitude
            };
        }
        return null;
    }
    
    async showCourierInfo(orderId) {
        const { data: order } = await supabase
            .from('orders')
            .select(`
                courier:couriers(full_name, phone, vehicle_type, rating)
            `)
            .eq('id', orderId)
            .single();
    
        if (order && order.courier) {
            const courier = order.courier;
            alert(`
                Kurye Bilgileri:
                Ad: ${courier.full_name}
                Telefon: ${courier.phone}
                Araç: ${courier.vehicle_type}
                Puan: ${courier.rating}/5
            `);
        }
    }
    
    // Mevcut updateOrderStatus fonksiyonunu güncelle (opsiyonel - otomatik atama için)
    async updateOrderStatus(orderId, newStatus) {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);
    
            if (error) throw error;
    
            // YENİ: Eğer sipariş hazır durumuna geçiyorsa ve otomatik atama aktifse
            if (newStatus === 'ready') {
                const autoAssignEnabled = await this.isAutoAssignmentEnabled();
                if (autoAssignEnabled) {
                    setTimeout(() => {
                        this.assignCourierAutomatically(orderId);
                    }, 2000); // 2 saniye sonra otomatik ata
                }
            }
    
            window.panelSystem.showAlert(`Sipariş durumu güncellendi: ${this.getStatusText(newStatus)}`, 'success');
            
            // Reload orders
            await this.loadAllSellerOrders();
    
        } catch (error) {
            console.error('Sipariş durumu güncelleme hatası:', error);
            window.panelSystem.showAlert('Sipariş durumu güncellenemedi!', 'error');
        }
    }


    async isAutoAssignmentEnabled() {
        // Sistem ayarlarından otomatik atama durumunu kontrol et
        // Varsayılan olarak true döndür
        return true;
    }
 }
   
    // Global instance - CLASS DIŞINDA
    if (typeof window.sellerPanel === 'undefined') {
        window.sellerPanel = null;
    }
