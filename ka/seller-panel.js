class SellerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.sellerData = null;
        this.products = [];
        this.orders = [];
        this.allSellerOrders = [];
        this.currentSection = '';
        this.realtimeSubscription = null;
        
        // Supabase client'ını config'den al
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('🏪 SellerPanel başlatılıyor...');
        console.log('Supabase:', this.supabase ? '✅ Var' : '❌ Yok');
        
        if (!this.supabase) {
            console.error('❌ Supabase client bulunamadı!');
            this.supabase = window.supabase; // Fallback
        }
        
        this.init();
    }

   async init() {
        await this.loadSellerData();
        this.setupRealTimeListeners();
        console.log('✅ SellerPanel başlatıldı');
    }

    async loadSellerData() {
        try {
            console.log('📥 Seller verisi yükleniyor...');
            
            let { data, error } = await this.supabase
                .from('seller_profiles')
                .select('*')
                .eq('id', this.userProfile.id)
                .single();

            if (error) {
                ({ data, error } = await this.supabase
                    .from('seller_profiles')
                    .select('*')
                    .eq('user_id', this.userProfile.id)
                    .single());
            }

            if (error) {
                console.error('❌ Seller profili bulunamadı:', error);
                this.sellerData = {
                    id: this.userProfile.id,
                    business_name: this.userProfile.name,
                    phone: this.userProfile.phone
                };
            } else {
                this.sellerData = data;
                console.log('✅ Seller verisi yüklendi:', data.business_name);
            }

        } catch (error) {
            console.error('❌ Seller veri hatası:', error);
            this.sellerData = {
                id: this.userProfile.id,
                business_name: this.userProfile.name,
                phone: this.userProfile.phone
            };
        }
    }

    // ✅ YENİ SİPARİŞ BİLDİRİM SİSTEMİ
    setupRealTimeListeners() {
        if (!this.sellerData?.id) {
            console.log('⚠️ Seller ID yok, real-time listener kurulamıyor');
            return;
        }

        console.log('🔔 Real-time sipariş listenerları kuruluyor...');

        // Yeni siparişleri dinle
        this.realtimeSubscription = this.supabase
            .channel('seller-orders')
            .on('postgres_changes', 
                { 
                    event: 'INSERT', 
                    schema: 'public', 
                    table: 'orders',
                    filter: `seller_id=eq.${this.sellerData.id}`
                }, 
                (payload) => {
                    console.log('🆕 Yeni sipariş geldi:', payload.new);
                    this.handleNewOrder(payload.new);
                }
            )
            .on('postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'orders',
                    filter: `seller_id=eq.${this.sellerData.id}`
                },
                (payload) => {
                    console.log('📝 Sipariş güncellendi:', payload.new);
                    this.handleOrderUpdate(payload.new);
                }
            )
            .subscribe((status) => {
                if (status === 'SUBSCRIBED') {
                    console.log('✅ Real-time bağlantısı kuruldu');
                }
            });
    }

    // ✅ YENİ SİPARİŞ BİLDİRİMİ
    async handleNewOrder(order) {
        // Push bildirimi göster
        this.showOrderNotification(order);
        
        // Sesli alarm çal
        this.playOrderSound();
        
        // Sayfayı güncelle (eğer orders sayfasındaysa)
        if (this.currentSection === 'orders') {
            await this.loadOrders();
        }
        
        // Dashboard'u güncelle
        if (this.currentSection === 'sellerDashboard') {
            await this.loadSellerDashboard();
        }
    }

    // ✅ PUSH BİLDİRİMİ
    showOrderNotification(order) {
        const notificationHtml = `
            <div class="order-notification" style="
                position: fixed;
                top: 20px;
                right: 20px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 20px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
                z-index: 10000;
                max-width: 400px;
                animation: slideIn 0.5s ease-out;
            ">
                <div style="display: flex; align-items: center; gap: 15px;">
                    <div style="font-size: 24px;">🆕</div>
                    <div style="flex: 1;">
                        <div style="font-weight: bold; font-size: 16px; margin-bottom: 5px;">
                            Yeni Sipariş!
                        </div>
                        <div style="font-size: 14px; opacity: 0.9;">
                            Sipariş #${order.id.slice(-8)} • ${parseFloat(order.total_amount).toFixed(2)} ₺
                        </div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
                            ${order.customer_name} • ${order.customer_phone}
                        </div>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">
                        ✕
                    </button>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn btn-success btn-sm" 
                            onclick="sellerPanel.acceptOrder('${order.id}')"
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 15px; border-radius: 20px; cursor: pointer;">
                        ✅ Kabul Et
                    </button>
                    <button class="btn btn-danger btn-sm" 
                            onclick="sellerPanel.rejectOrder('${order.id}')"
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 15px; border-radius: 20px; cursor: pointer;">
                        ❌ Reddet
                    </button>
                </div>
            </div>
            <style>
                @keyframes slideIn {
                    from { transform: translateX(400px); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .order-notification {
                    animation: slideIn 0.5s ease-out;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', notificationHtml);

        // 30 saniye sonra otomatik kapan
        setTimeout(() => {
            const notification = document.querySelector('.order-notification');
            if (notification) {
                notification.style.animation = 'slideOut 0.5s ease-in';
                setTimeout(() => notification.remove(), 500);
            }
        }, 30000);
    }

    // ✅ SESLİ ALARM
    playOrderSound() {
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            // Dikkat çekici bip sesi
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
            oscillator.frequency.setValueAtTime(600, audioContext.currentTime + 0.1);
            oscillator.frequency.setValueAtTime(800, audioContext.currentTime + 0.2);
            
            gainNode.gain.setValueAtTime(0, audioContext.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.1, audioContext.currentTime + 0.1);
            gainNode.gain.linearRampToValueAtTime(0, audioContext.currentTime + 0.3);
            
            oscillator.start();
            setTimeout(() => oscillator.stop(), 500);
            
        } catch (e) {
            console.log('🔇 Ses çalınamadı:', e);
            // Fallback: Tarayıcı bildirimi
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Yeni Sipariş!', {
                    body: 'Yeni bir siparişiniz var',
                    icon: '/favicon.ico'
                });
            }
        }
    }

     // ✅ SİPARİŞ KABUL/RED - SÜRE LİMİTLİ
    async acceptOrder(orderId) {
        try {
            const { error } = await this.supabase
                .from('orders')
                .update({
                    status: 'confirmed',
                    accepted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert('✅ Sipariş kabul edildi!', 'success');
            this.removeNotification();
            await this.loadOrders();

        } catch (error) {
            console.error('Sipariş kabul hatası:', error);
            window.panelSystem.showAlert('❌ Sipariş kabul edilemedi!', 'error');
        }
    }

    async rejectOrder(orderId) {
        const reason = prompt('Reddetme nedeniniz:');
        if (!reason) return;

        try {
            const { error } = await this.supabase
                .from('orders')
                .update({
                    status: 'cancelled',
                    cancellation_reason: `Satıcı tarafından reddedildi: ${reason}`,
                    cancelled_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert('❌ Sipariş reddedildi!', 'success');
            this.removeNotification();
            await this.loadOrders();

        } catch (error) {
            console.error('Sipariş reddetme hatası:', error);
            window.panelSystem.showAlert('❌ Sipariş reddedilemedi!', 'error');
        }
    }

    removeNotification() {
        const notification = document.querySelector('.order-notification');
        if (notification) {
            notification.remove();
        }
    }

    // ✅ SİPARİŞ YÖNETİMİ SAYFASI
    async loadOrders() {
        const section = document.getElementById('ordersSection');
        
        section.innerHTML = `
            <div class="section-header">
                <h2>Sipariş Yönetimi</h2>
                <div class="header-actions">
                    <select id="orderStatusFilter" class="form-control" onchange="sellerPanel.filterOrders()">
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
                    <div id="ordersList">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Siparişler yükleniyor...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadOrdersData();
    }

    async loadOrdersData() {
        if (!this.sellerData?.id) return;

        try {
            const { data: orders, error } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    order_details(*)
                `)
                .eq('seller_id', this.sellerData.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.orders = orders || [];
            this.renderOrders(this.orders);

        } catch (error) {
            console.error('❌ Siparişler yükleme hatası:', error);
            document.getElementById('ordersList').innerHTML = `
                <div class="error-message">
                    <p>Siparişler yüklenirken hata oluştu</p>
                </div>
            `;
        }
    }

    // ✅ SİPARİŞ LİSTESİ RENDER
    renderOrders(orders) {
        const container = document.getElementById('ordersList');
        
        if (!orders.length) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-shopping-bag" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>Henüz siparişiniz bulunmuyor</h3>
                    <p>Yeni siparişler burada görünecek</p>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map(order => {
            const totalItems = order.order_details?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0;
            const isExpired = this.isOrderExpired(order);
            
            return `
            <div class="order-card ${isExpired ? 'order-expired' : ''}" 
                 style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; margin-bottom: 15px; 
                        ${isExpired ? 'background: #fff3cd; border-color: #ffeaa7;' : ''}">
                <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                            <strong style="font-size: 16px;">Sipariş #${order.id.slice(-8)}</strong>
                            <span class="status-badge status-${order.status}">
                                ${this.getStatusText(order.status)}
                            </span>
                            ${isExpired ? `<span class="badge badge-warning">SÜRE DOLDU</span>` : ''}
                        </div>
                        <div style="color: #666; font-size: 14px;">
                            ${order.customer_name} • ${order.customer_phone}
                        </div>
                        <div style="color: #999; font-size: 12px; margin-top: 2px;">
                            ${order.delivery_address || 'Adres belirtilmemiş'}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 18px; font-weight: bold; color: var(--primary); margin-bottom: 5px;">
                            ${parseFloat(order.total_amount).toFixed(2)} ₺
                        </div>
                        <div style="color: #666; font-size: 12px;">
                            ${new Date(order.created_at).toLocaleString('tr-TR')}
                        </div>
                        ${order.status === 'pending' ? `
                            <div style="color: #dc3545; font-size: 11px; margin-top: 5px;">
                                ⏱️ ${this.getRemainingTime(order.created_at)}
                            </div>
                        ` : ''}
                    </div>
                </div>
                
                <!-- Sipariş İçeriği -->
                <div class="order-items" style="margin-bottom: 15px;">
                    ${order.order_details?.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">
                            <div>
                                <span style="font-weight: 500;">${item.product_name}</span>
                                <div style="font-size: 12px; color: #666;">
                                    ${item.quantity} adet × ${parseFloat(item.unit_price).toFixed(2)} ₺
                                </div>
                            </div>
                            <div style="font-weight: bold;">
                                ${parseFloat(item.total_price).toFixed(2)} ₺
                            </div>
                        </div>
                    `).join('') || 'Sipariş detayı bulunamadı'}
                </div>
                
                <!-- Sipariş Aksiyonları -->
                <div class="order-actions" style="display: flex; gap: 10px; padding-top: 15px; border-top: 1px solid #e1e5e9;">
                    ${this.getOrderActions(order)}
                </div>

                <!-- Hazırlık Süresi -->
                ${order.status === 'confirmed' || order.status === 'preparing' ? `
                    <div style="margin-top: 15px; padding: 10px; background: #e7f3ff; border-radius: 6px;">
                        <div style="font-size: 14px; font-weight: 600; margin-bottom: 5px;">
                            ⏰ Hazırlık Süresi
                        </div>
                        <div style="display: flex; gap: 15px; font-size: 13px;">
                            <div>
                                <strong>Tahmini:</strong> 
                                <input type="number" id="prepTime-${order.id}" value="30" min="5" max="120" 
                                       style="width: 60px; padding: 2px 5px; border: 1px solid #ccc; border-radius: 3px; margin-left: 5px;">
                                dakika
                            </div>
                            <button class="btn btn-sm btn-primary" 
                                    onclick="sellerPanel.setPreparationTime('${order.id}')">
                                Süreyi Ayarla
                            </button>
                        </div>
                    </div>
                ` : ''}
            </div>
            `;
        }).join('');
    }
    
    // Diğer metodlar aynı kalacak...
    async loadSectionData(sectionName) {
        this.currentSection = sectionName;
        console.log(`📂 Section yükleniyor: ${sectionName}`);
        
        const section = document.getElementById(`${sectionName}Section`);
        if (!section) return;

        section.innerHTML = `<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i><p>Yükleniyor...</p></div>`;

        try {
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
                    await this.loadOrders();
                    break;
                case 'deliveryAreas':
                    await this.loadDeliveryAreas();
                    break;
                case 'sellerReports':
                    await this.loadSellerReports();
                    break;
            }
        } catch (error) {
            console.error(`❌ ${sectionName} hatası:`, error);
            section.innerHTML = `<div class="error-message"><p>Yükleme hatası</p></div>`;
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
        
        const { data: orders, error } = await this.supabase
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
        const { data: ratedOrders } = await this.supabase
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
        const { data: orders, error } = await this.supabase
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
        const { data: products, error } = await this.supabase
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
        const { data: products, error } = await this.supabase
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
            const { data, error } = await this.supabase
                .from('products')
                .insert([productData])
                .select()
                .single();

            if (error) throw error;

            // Also add to product_prices table
            await this.supabase
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
                const { error } = await this.supabase
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
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select(`
                *,
                order_details(*),
                customer:customers(name, phone)
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

    // ✅ SİPARİŞ AKSİYONLARI
    getOrderActions(order) {
        const actions = [];
        
        if (order.status === 'pending') {
            actions.push(`
                <button class="btn btn-success btn-sm" onclick="sellerPanel.acceptOrder('${order.id}')">
                    <i class="fas fa-check"></i> Kabul Et
                </button>
                <button class="btn btn-danger btn-sm" onclick="sellerPanel.rejectOrder('${order.id}')">
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

        return actions.join('');
    }

    // ✅ SİPARİŞ DURUM GÜNCELLEME
    async updateOrderStatus(orderId, newStatus) {
        try {
            const updateData = {
                status: newStatus,
                updated_at: new Date().toISOString()
            };

            // Hazırlanıyor durumuna geçerken hazırlık süresini kaydet
            if (newStatus === 'preparing') {
                const prepTime = document.getElementById(`prepTime-${orderId}`)?.value || 30;
                updateData.estimated_preparation_time = prepTime;
                updateData.preparation_started_at = new Date().toISOString();
            }

            const { error } = await this.supabase
                .from('orders')
                .update(updateData)
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert(`✅ Sipariş durumu: ${this.getStatusText(newStatus)}`, 'success');
            await this.loadOrders();

        } catch (error) {
            console.error('Sipariş durumu güncelleme hatası:', error);
            window.panelSystem.showAlert('❌ Durum güncellenemedi!', 'error');
        }
    }

    // ✅ HAZIRLIK SÜRESİ AYARLAMA
    async setPreparationTime(orderId) {
        const prepTimeInput = document.getElementById(`prepTime-${orderId}`);
        const prepTime = prepTimeInput?.value;

        if (!prepTime || prepTime < 5) {
            window.panelSystem.showAlert('❌ Geçerli bir süre girin (en az 5 dakika)', 'error');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('orders')
                .update({
                    estimated_preparation_time: parseInt(prepTime),
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert(`✅ Hazırlık süresi ${prepTime} dakika olarak ayarlandı`, 'success');

        } catch (error) {
            console.error('Hazırlık süresi ayarlama hatası:', error);
            window.panelSystem.showAlert('❌ Süre ayarlanamadı!', 'error');
        }
    }

    // ✅ SÜRE LİMİT KONTROLÜ
    isOrderExpired(order) {
        if (order.status !== 'pending') return false;
        
        const orderTime = new Date(order.created_at);
        const now = new Date();
        const diffMinutes = (now - orderTime) / (1000 * 60);
        
        // 5 dakika süre limiti
        return diffMinutes > 5;
    }

    getRemainingTime(createdAt) {
        const orderTime = new Date(createdAt);
        const now = new Date();
        const diffMinutes = (now - orderTime) / (1000 * 60);
        const remaining = Math.max(0, 5 - Math.floor(diffMinutes));
        
        return `${remaining} dakika kaldı`;
    }

    // ✅ FİLTRELEME
    filterOrders() {
        const filter = document.getElementById('orderStatusFilter').value;
        const filteredOrders = filter ? 
            this.orders.filter(order => order.status === filter) : 
            this.orders;
        this.renderOrders(filteredOrders);
    }

    handleOrderUpdate(updatedOrder) {
        // Orders sayfası açıksa güncelle
        if (this.currentSection === 'orders') {
            const orderIndex = this.orders.findIndex(o => o.id === updatedOrder.id);
            if (orderIndex !== -1) {
                this.orders[orderIndex] = updatedOrder;
                this.renderOrders(this.orders);
            }
        }
    }

    
    async cancelOrder(orderId) {
        const reason = prompt('İptal nedeni:');
        if (!reason) return;

        try {
            const { error } = await this.supabase
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
            const { error } = await this.supabase
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
            'pending': '⏳ Bekliyor',
            'confirmed': '✅ Onaylandı',
            'preparing': '👨‍🍳 Hazırlanıyor',
            'ready': '📦 Hazır',
            'on_the_way': '🚗 Yolda',
            'delivered': '🎉 Teslim Edildi',
            'cancelled': '❌ İptal Edildi'
        };
        return statusMap[status] || status;
    }
    
       
     // Manuel kurye atama modalı
async showCourierAssignmentModal(orderId) {
    const availableCouriers = await window.orderSystem.getAvailableCouriers();
    
    const modalHtml = `
        <div class="modal-overlay">
            <div class="modal">
                <div class="modal-header">
                    <h3>Kurye Atama</h3>
                    <button class="btn btn-sm btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                
                <div class="modal-body">
                    <div class="form-group">
                        <label for="courierSelect">Kurye Seçin</label>
                        <select id="courierSelect" class="form-control">
                            <option value="">Kurye seçin...</option>
                            ${availableCouriers.map(courier => `
                                <option value="${courier.id}">
                                    ${courier.full_name} - ${courier.vehicle_type} 
                                    (${courier.current_deliveries || 0}/5 teslimat)
                                </option>
                            `).join('')}
                        </select>
                    </div>
                </div>

                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                    <button type="button" class="btn btn-primary" onclick="sellerPanel.assignCourierManually('${orderId}')">
                        Kurye Ata
                    </button>
                </div>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Event listeners - MODAL AÇILDIKTAN SONRA EKLENMELİ
    setTimeout(() => {
        const autoAssignBtn = document.getElementById('autoAssignBtn');
        const manualAssignBtn = document.getElementById('manualAssignBtn');
        
        if (autoAssignBtn) {
            autoAssignBtn.addEventListener('click', async () => {
                await this.assignCourierAutomatically(orderId);
            });
        }
        
        if (manualAssignBtn) {
            manualAssignBtn.addEventListener('click', () => {
                const manualSection = document.getElementById('manualAssignmentSection');
                const autoResult = document.getElementById('autoAssignmentResult');
                
                if (manualSection) manualSection.style.display = 'block';
                if (autoResult) autoResult.style.display = 'none';
            });
        }
    }, 100);
}
    
    async getAvailableCouriers() {
        const { data: couriers, error } = await this.supabase
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
            const assignedCourier = await this.window.courierAssignmentSystem.assignBestCourier(orderId, sellerLocation);
            
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
    
    // Manuel kurye ata
    async assignCourierManually(orderId) {
        const courierSelect = document.getElementById('courierSelect');
        const courierId = courierSelect.value;

        if (!courierId) {
            window.panelSystem.showAlert('Lütfen bir kurye seçin!', 'error');
            return;
        }

        try {
            await window.orderSystem.assignCourierToOrder(orderId, courierId);
            window.panelSystem.showAlert('Kurye başarıyla atandı!', 'success');
            document.querySelector('.modal-overlay').remove();
            await this.loadAllSellerOrders();

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
        const { data: order } = await this.supabase
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
    

    async isAutoAssignmentEnabled() {
        // Sistem ayarlarından otomatik atama durumunu kontrol et
        // Varsayılan olarak true döndür
        return true;
    }
 }

  // Cleanup
    destroy() {
        if (this.realtimeSubscription) {
            this.realtimeSubscription.unsubscribe();
        }
    }
}

// Global
window.SellerPanel = SellerPanel;

if (window.panelSystem && typeof window.panelSystem.on === 'function') {
    window.panelSystem.on('sellerSessionStart', (userProfile) => {
        console.log('🛍️ SellerPanel başlatılıyor...');
        window.sellerPanel = new SellerPanel(userProfile);
    });
}

console.log('✅ seller-panel.js yüklendi - SİPARİŞ SİSTEMİ AKTİF');
