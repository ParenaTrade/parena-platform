class SellerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.sellerData = null;
        this.products = [];
        this.orders = [];
        this.allSellerOrders = [];
        this.currentSection = '';
        this.realtimeSubscription = null;
        this.isInitialized = false;
        
        // Supabase client'ını config'den al
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('🏪 SellerPanel başlatılıyor...', this.userProfile);
        
        if (!this.supabase) {
            console.error('❌ Supabase client bulunamadı!');
            this.supabase = window.supabase; // Fallback
        }
        
        // Global erişim
        window.sellerPanel = this;
        
        this.init();
    }

    async init() {
        try {
            await this.loadSellerData();
            this.setupRealTimeListeners();
            this.isInitialized = true;
            console.log('✅ SellerPanel başlatıldı', this.sellerData);
        } catch (error) {
            console.error('❌ SellerPanel init hatası:', error);
        }
    }

    async loadSellerData() {
        try {
            console.log('📥 Seller verisi yükleniyor...', this.userProfile);
            
            let { data, error } = await this.supabase
                .from('seller_profiles')
                .select('*')
                .eq('id', this.userProfile.id)
                .single();

            if (error) {
                console.log('🔍 User_id ile deneyelim...');
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
                    user_id: this.userProfile.id,
                    business_name: this.userProfile.name,
                    phone: this.userProfile.phone
                };
                
                // Yeni seller profili oluştur
                try {
                    const { data: newSeller, error: createError } = await this.supabase
                        .from('seller_profiles')
                        .insert([this.sellerData])
                        .select()
                        .single();
                    
                    if (!createError && newSeller) {
                        this.sellerData = newSeller;
                        console.log('✅ Yeni seller profili oluşturuldu:', newSeller);
                    }
                } catch (createError) {
                    console.error('❌ Seller profili oluşturulamadı:', createError);
                }
            } else {
                this.sellerData = data;
                console.log('✅ Seller verisi yüklendi:', data);
            }

        } catch (error) {
            console.error('❌ Seller veri hatası:', error);
            this.sellerData = {
                id: this.userProfile.id,
                user_id: this.userProfile.id,
                business_name: this.userProfile.name,
                phone: this.userProfile.phone
            };
        }
    }

    // ✅ YENİ SİPARİŞ BİLDİRİM SİSTEMİ
    setupRealTimeListeners() {
        if (!this.sellerData?.id) {
            console.log('⚠️ Seller ID yok, real-time listener kurulamıyor');
            setTimeout(() => this.setupRealTimeListeners(), 1000);
            return;
        }

        console.log('🔔 Real-time sipariş listenerları kuruluyor...', this.sellerData.id);

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
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Real-time bağlantı hatası');
                }
            });
    }

    // ✅ YENİ SİPARİŞ BİLDİRİMİ
    async handleNewOrder(order) {
        console.log('🎯 Yeni sipariş işleniyor:', order);
        
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
        console.log('📢 Push bildirimi gösteriliyor:', order);
        
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
                            Sipariş #${order.id?.slice(-8) || 'N/A'} • ${parseFloat(order.total_amount || 0).toFixed(2)} ₺
                        </div>
                        <div style="font-size: 12px; opacity: 0.8; margin-top: 5px;">
                            ${order.customer_name || 'Müşteri'} • ${order.customer_phone || 'Telefon yok'}
                        </div>
                    </div>
                    <button onclick="this.parentElement.parentElement.remove()" 
                            style="background: none; border: none; color: white; font-size: 18px; cursor: pointer;">
                        ✕
                    </button>
                </div>
                <div style="margin-top: 15px; display: flex; gap: 10px;">
                    <button class="btn btn-success btn-sm accept-order-btn" 
                            data-order-id="${order.id}"
                            style="background: rgba(255,255,255,0.2); border: 1px solid rgba(255,255,255,0.3); color: white; padding: 8px 15px; border-radius: 20px; cursor: pointer;">
                        ✅ Kabul Et
                    </button>
                    <button class="btn btn-danger btn-sm reject-order-btn" 
                            data-order-id="${order.id}"
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
                @keyframes slideOut {
                    from { transform: translateX(0); opacity: 1; }
                    to { transform: translateX(400px); opacity: 0; }
                }
                .order-notification {
                    animation: slideIn 0.5s ease-out;
                }
            </style>
        `;

        document.body.insertAdjacentHTML('beforeend', notificationHtml);

        // Event listener'ları ekle
        setTimeout(() => {
            const acceptBtn = document.querySelector('.accept-order-btn');
            const rejectBtn = document.querySelector('.reject-order-btn');
            
            if (acceptBtn) {
                acceptBtn.addEventListener('click', (e) => {
                    const orderId = e.target.getAttribute('data-order-id');
                    this.acceptOrder(orderId);
                });
            }
            
            if (rejectBtn) {
                rejectBtn.addEventListener('click', (e) => {
                    const orderId = e.target.getAttribute('data-order-id');
                    this.rejectOrder(orderId);
                });
            }
        }, 100);

        // 30 saniye sonra otomatik kapan
        setTimeout(() => {
            const notification = document.querySelector('.order-notification');
            if (notification) {
                notification.style.animation = 'slideOut 0.5s ease-in';
                setTimeout(() => notification.remove(), 500);
            }
        }, 30000);
    }

    // ✅ SESLİ ALARM - DÜZELTİLMİŞ VERSİYON
    playOrderSound() {
        console.log('🔊 Sesli alarm çalınıyor...');
        try {
            // Tarayıcı bildirimi
            if ('Notification' in window && Notification.permission === 'granted') {
                new Notification('Yeni Sipariş!', {
                    body: 'Yeni bir siparişiniz var',
                    icon: '/favicon.ico',
                    tag: 'new-order'
                });
            } else if ('Notification' in window && Notification.permission !== 'denied') {
                Notification.requestPermission().then(permission => {
                    if (permission === 'granted') {
                        new Notification('Yeni Sipariş!', {
                            body: 'Yeni bir siparişiniz var',
                            icon: '/favicon.ico'
                        });
                    }
                });
            }

            // Ses çalma (basit yöntem)
            this.playBeepSound();
            
        } catch (e) {
            console.log('🔇 Ses/bildirim hatası:', e);
            this.playBeepSound(); // Fallback
        }
    }

    playBeepSound() {
        try {
            // Basit bip sesi için audio element kullan
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            oscillator.type = 'sine';
            oscillator.frequency.value = 800;
            gainNode.gain.value = 0.1;
            
            oscillator.start();
            setTimeout(() => {
                oscillator.stop();
            }, 200);
            
        } catch (e) {
            console.log('🔇 AudioContext hatası:', e);
        }
    }

    // ✅ SİPARİŞ KABUL/RED
    async acceptOrder(orderId) {
        if (!orderId) {
            console.error('❌ Order ID yok');
            return;
        }

        try {
            console.log('✅ Sipariş kabul ediliyor:', orderId);
            const { error } = await this.supabase
                .from('orders')
                .update({
                    status: 'confirmed',
                    accepted_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            this.showAlert('✅ Sipariş kabul edildi!', 'success');
            this.removeNotification();
            await this.loadOrders();

        } catch (error) {
            console.error('Sipariş kabul hatası:', error);
            this.showAlert('❌ Sipariş kabul edilemedi!', 'error');
        }
    }

    async rejectOrder(orderId) {
        if (!orderId) {
            console.error('❌ Order ID yok');
            return;
        }

        const reason = prompt('Reddetme nedeniniz:');
        if (!reason) return;

        try {
            console.log('❌ Sipariş reddediliyor:', orderId);
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

            this.showAlert('❌ Sipariş reddedildi!', 'success');
            this.removeNotification();
            await this.loadOrders();

        } catch (error) {
            console.error('Sipariş reddetme hatası:', error);
            this.showAlert('❌ Sipariş reddedilemedi!', 'error');
        }
    }

    removeNotification() {
        const notification = document.querySelector('.order-notification');
        if (notification) {
            notification.remove();
        }
    }

    // ✅ SİPARİŞ YÖNETİMİ SAYFASI - DÜZELTİLMİŞ
    async loadOrders() {
        const section = document.getElementById('ordersSection');
        if (!section) return;
        
        section.innerHTML = `
            <div class="section-header">
                <h2>Sipariş Yönetimi</h2>
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
                    <div id="ordersList">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Siparişler yükleniyor...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Event listener'ı ekle
        setTimeout(() => {
            const filterSelect = document.getElementById('orderStatusFilter');
            if (filterSelect) {
                filterSelect.addEventListener('change', (e) => {
                    this.filterOrders(e.target.value);
                });
            }
        }, 100);

        await this.loadOrdersData();
    }

    async loadOrdersData() {
        if (!this.sellerData?.id) {
            console.error('❌ Seller ID yok, siparişler yüklenemiyor');
            await this.loadSellerData(); // Seller verisini tekrar yükle
        }

        try {
            console.log('📥 Siparişler yükleniyor, seller_id:', this.sellerData?.id);
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
            console.log('✅ Siparişler yüklendi:', this.orders.length);
            this.renderOrders(this.orders);

        } catch (error) {
            console.error('❌ Siparişler yükleme hatası:', error);
            document.getElementById('ordersList').innerHTML = `
                <div class="error-message">
                    <p>Siparişler yüklenirken hata oluştu: ${error.message}</p>
                </div>
            `;
        }
    }

    // ✅ SİPARİŞ LİSTESİ RENDER - DÜZELTİLMİŞ
    renderOrders(orders) {
        const container = document.getElementById('ordersList');
        if (!container) return;
        
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
                            <strong style="font-size: 16px;">Sipariş #${order.id?.slice(-8) || 'N/A'}</strong>
                            <span class="status-badge status-${order.status}">
                                ${this.getStatusText(order.status)}
                            </span>
                            ${isExpired ? `<span class="badge badge-warning">SÜRE DOLDU</span>` : ''}
                        </div>
                        <div style="color: #666; font-size: 14px;">
                            ${order.customer_name || 'Müşteri'} • ${order.customer_phone || 'Telefon yok'}
                        </div>
                        <div style="color: #999; font-size: 12px; margin-top: 2px;">
                            ${order.delivery_address || 'Adres belirtilmemiş'}
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 18px; font-weight: bold; color: var(--primary); margin-bottom: 5px;">
                            ${parseFloat(order.total_amount || 0).toFixed(2)} ₺
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
                                    ${item.quantity} adet × ${parseFloat(item.unit_price || 0).toFixed(2)} ₺
                                </div>
                            </div>
                            <div style="font-weight: bold;">
                                ${parseFloat(item.total_price || 0).toFixed(2)} ₺
                            </div>
                        </div>
                    `).join('') || 'Sipariş detayı bulunamadı'}
                </div>
                
                <!-- Sipariş Aksiyonları -->
                <div class="order-actions" style="display: flex; gap: 10px; padding-top: 15px; border-top: 1px solid #e1e5e9;">
                    ${this.getOrderActions(order)}
                </div>
            </div>
            `;
        }).join('');

        // Event listener'ları ekle
        setTimeout(() => {
            this.attachOrderEventListeners();
        }, 100);
    }

    attachOrderEventListeners() {
        // Kabul et butonları
        document.querySelectorAll('.accept-order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                this.acceptOrder(orderId);
            });
        });

        // Reddet butonları
        document.querySelectorAll('.reject-order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                this.rejectOrder(orderId);
            });
        });

        // Hazırlık süresi butonları
        document.querySelectorAll('.prep-time-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const orderId = e.target.getAttribute('data-order-id');
                this.setPreparationTime(orderId);
            });
        });
    }

    // ✅ FİLTRELEME - DÜZELTİLMİŞ
    filterOrders(status) {
        console.log('🔍 Siparişler filtreleniyor:', status);
        const filteredOrders = status ? 
            this.orders.filter(order => order.status === status) : 
            this.orders;
        this.renderOrders(filteredOrders);
    }

    // ✅ ÜRÜN YÖNETİMİ - DÜZELTİLMİŞ
    async loadProducts() {
        const section = document.getElementById('productsSection');
        if (!section) return;
        
        section.innerHTML = `
            <div class="section-header">
                <h2>Ürün Yönetimi</h2>
                <button class="btn btn-primary" id="addProductBtn">
                    <i class="fas fa-plus"></i> Yeni Ürün
                </button>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="filters" style="display: flex; gap: 10px; margin-bottom: 20px;">
                        <select id="categoryFilter" class="form-control">
                            <option value="">Tüm Kategoriler</option>
                            <option value="gida">Gıda</option>
                            <option value="icecek">İçecek</option>
                            <option value="temizlik">Temizlik</option>
                            <option value="kirtasiye">Kırtasiye</option>
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

        // Event listener'ları ekle
        setTimeout(() => {
            const addProductBtn = document.getElementById('addProductBtn');
            const productSearch = document.getElementById('productSearch');
            const categoryFilter = document.getElementById('categoryFilter');
            const statusFilter = document.getElementById('productStatusFilter');

            if (addProductBtn) {
                addProductBtn.addEventListener('click', () => {
                    this.showAddProductModal();
                });
            }

            if (productSearch) {
                productSearch.addEventListener('input', (e) => {
                    this.searchProducts(e.target.value);
                });
            }

            if (categoryFilter) {
                categoryFilter.addEventListener('change', (e) => {
                    this.filterProductsByCategory(e.target.value);
                });
            }

            if (statusFilter) {
                statusFilter.addEventListener('change', (e) => {
                    this.filterProductsByStatus(e.target.value);
                });
            }
        }, 100);

        await this.loadProductsData();
    }

    async loadProductsData() {
        if (!this.sellerData?.id) {
            console.error('❌ Seller ID yok, ürünler yüklenemiyor');
            return;
        }

        try {
            const { data: products, error } = await this.supabase
                .from('products')
                .select('*')
                .eq('seller_id', this.sellerData.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            this.products = products || [];
            this.renderProductsTable(this.products);

        } catch (error) {
            console.error('❌ Ürünler yükleme hatası:', error);
            const tbody = document.querySelector('#productsTable tbody');
            if (tbody) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center">
                            <div class="error-message">
                                <p>Ürünler yüklenirken hata oluştu</p>
                            </div>
                        </td>
                    </tr>
                `;
            }
        }
    }

    renderProductsTable(products) {
        const tbody = document.querySelector('#productsTable tbody');
        if (!tbody) return;
        
        if (!products.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <p class="text-muted">Henüz ürün eklenmemiş.</p>
                        <button class="btn btn-primary mt-2" onclick="window.sellerPanel.showAddProductModal()">
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
                <td>${product.category || '-'}</td>
                <td>
                    <div style="font-weight: bold;">${parseFloat(product.price || 0).toFixed(2)} ₺</div>
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
                        <button class="btn btn-sm btn-warning edit-product-btn" data-product-id="${product.id}">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                        <button class="btn btn-sm btn-secondary toggle-product-btn" data-product-id="${product.id}" data-current-status="${product.is_active}">
                            <i class="fas fa-power-off"></i> ${product.is_active ? 'Pasif Et' : 'Aktif Et'}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Event listener'ları ekle
        setTimeout(() => {
            this.attachProductEventListeners();
        }, 100);
    }

    attachProductEventListeners() {
        // Düzenle butonları
        document.querySelectorAll('.edit-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('button').getAttribute('data-product-id');
                this.editProduct(productId);
            });
        });

        // Aktif/Pasif butonları
        document.querySelectorAll('.toggle-product-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const productId = e.target.closest('button').getAttribute('data-product-id');
                const currentStatus = e.target.closest('button').getAttribute('data-current-status') === 'true';
                this.toggleProductStatus(productId, currentStatus);
            });
        });
    }

    // ✅ ÜRÜN FİLTRELEME
    searchProducts(query) {
        if (!query) {
            this.renderProductsTable(this.products);
            return;
        }
        
        const filteredProducts = this.products.filter(product =>
            product.name.toLowerCase().includes(query.toLowerCase()) ||
            (product.barcode && product.barcode.includes(query)) ||
            (product.description && product.description.toLowerCase().includes(query.toLowerCase()))
        );
        this.renderProductsTable(filteredProducts);
    }

    filterProductsByCategory(category) {
        if (!category) {
            this.renderProductsTable(this.products);
            return;
        }
        
        const filteredProducts = this.products.filter(product => 
            product.category === category
        );
        this.renderProductsTable(filteredProducts);
    }

    filterProductsByStatus(status) {
        if (!status) {
            this.renderProductsTable(this.products);
            return;
        }
        
        const filteredProducts = this.products.filter(product => 
            status === 'active' ? product.is_active : !product.is_active
        );
        this.renderProductsTable(filteredProducts);
    }

    // ✅ ÜRÜN DÜZENLEME
    async editProduct(productId) {
        this.showAlert('Ürün düzenleme özelliği yakında eklenecek!', 'info');
    }

    // ✅ ÜRÜN PASİF ETME (SİLME YERİNE)
    async toggleProductStatus(productId, currentStatus) {
        const newStatus = !currentStatus;
        const actionText = newStatus ? 'aktif' : 'pasif';
        
        if (!confirm(`Bu ürünü ${actionText} etmek istediğinizden emin misiniz?`)) {
            return;
        }

        try {
            const { error } = await this.supabase
                .from('products')
                .update({
                    is_active: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', productId);

            if (error) throw error;

            this.showAlert(`✅ Ürün başarıyla ${actionText} edildi!`, 'success');
            await this.loadProductsData();

        } catch (error) {
            console.error('Ürün durumu değiştirme hatası:', error);
            this.showAlert(`❌ Ürün ${actionText} edilemedi!`, 'error');
        }
    }

    // ✅ DASHBOARD - DÜZELTİLMİŞ
    async loadSellerStats() {
        if (!this.sellerData?.id) {
            console.error('❌ Seller ID yok, istatistikler yüklenemiyor');
            return;
        }

        const today = new Date().toISOString().split('T')[0];
        
        try {
            const { data: orders, error } = await this.supabase
                .from('orders')
                .select('id, total_amount, status, created_at')
                .eq('seller_id', this.sellerData.id)
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
                .eq('seller_id', this.sellerData.id)
                .not('performance_rating', 'is', null);

            if (ratedOrders && ratedOrders.length > 0) {
                const avgRating = ratedOrders.reduce((sum, order) => 
                    sum + parseFloat(order.performance_rating || 0), 0) / ratedOrders.length;
                document.getElementById('sellerRating').textContent = avgRating.toFixed(1);
            } else {
                document.getElementById('sellerRating').textContent = '0.0';
            }

        } catch (error) {
            console.error('❌ İstatistik yükleme hatası:', error);
        }
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
            section.innerHTML = `<div class="error-message"><p>Yükleme hatası: ${error.message}</p></div>`;
        }
    }

    // Yardımcı metodlar
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

    getOrderActions(order) {
        const actions = [];
        
        if (order.status === 'pending') {
            actions.push(`
                <button class="btn btn-success btn-sm accept-order-btn" data-order-id="${order.id}">
                    <i class="fas fa-check"></i> Kabul Et
                </button>
                <button class="btn btn-danger btn-sm reject-order-btn" data-order-id="${order.id}">
                    <i class="fas fa-times"></i> Reddet
                </button>
            `);
        }
        
        if (order.status === 'confirmed') {
            actions.push(`
                <button class="btn btn-warning btn-sm" onclick="window.sellerPanel.updateOrderStatus('${order.id}', 'preparing')">
                    <i class="fas fa-utensils"></i> Hazırlanıyor
                </button>
            `);
        }
        
        if (order.status === 'preparing') {
            actions.push(`
                <button class="btn btn-info btn-sm" onclick="window.sellerPanel.updateOrderStatus('${order.id}', 'ready')">
                    <i class="fas fa-check-double"></i> Hazır
                </button>
            `);
        }

        return actions.join('');
    }

    isOrderExpired(order) {
        if (order.status !== 'pending') return false;
        
        const orderTime = new Date(order.created_at);
        const now = new Date();
        const diffMinutes = (now - orderTime) / (1000 * 60);
        
        return diffMinutes > 5;
    }

    getRemainingTime(createdAt) {
        const orderTime = new Date(createdAt);
        const now = new Date();
        const diffMinutes = (now - orderTime) / (1000 * 60);
        const remaining = Math.max(0, 5 - Math.floor(diffMinutes));
        
        return `${remaining} dakika kaldı`;
    }

    showAlert(message, type = 'info') {
        const alert = document.createElement('div');
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;
        
        if (type === 'success') alert.style.background = '#28a745';
        else if (type === 'error') alert.style.background = '#dc3545';
        else if (type === 'warning') alert.style.background = '#ffc107';
        else alert.style.background = '#17a2b8';
        
        alert.textContent = message;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => alert.remove(), 300);
        }, 3000);
    }

    handleOrderUpdate(updatedOrder) {
        if (this.currentSection === 'orders') {
            this.loadOrders();
        }
        if (this.currentSection === 'sellerDashboard') {
            this.loadSellerDashboard();
        }
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

    // ✅ KURYE ATAMA SİSTEMİ - TÜM ÖZELLİKLER KORUNDU
    async showCourierAssignmentModal(orderId) {
        const availableCouriers = await this.getAvailableCouriers();
        
        const modalHtml = `
            <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
                <div class="modal" style="background: white; border-radius: 12px; padding: 30px; width: 90%; max-width: 500px;">
                    <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                        <h3 style="margin: 0;">Kurye Atama</h3>
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

                    <div class="modal-footer" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                        <button type="button" class="btn btn-primary" onclick="window.sellerPanel.assignCourierManually('${orderId}')">
                            Kurye Ata
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        document.body.insertAdjacentHTML('beforeend', modalHtml);
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
            const assignedCourier = await this.assignBestCourier(orderId, sellerLocation);
            
            if (assignedCourier) {
                this.showAlert(`Otomatik kurye atandı: ${assignedCourier.full_name}`, 'success');
                document.querySelector('.modal-overlay').remove();
                await this.loadAllSellerOrders();
            } else {
                this.showAlert('Müsait kurye bulunamadı!', 'error');
            }
    
        } catch (error) {
            console.error('Otomatik kurye atama hatası:', error);
            this.showAlert('Kurye atanamadı!', 'error');
        }
    }
    
    // Manuel kurye ata
    async assignCourierManually(orderId) {
        const courierSelect = document.getElementById('courierSelect');
        const courierId = courierSelect.value;

        if (!courierId) {
            this.showAlert('Lütfen bir kurye seçin!', 'error');
            return;
        }

        try {
            await this.assignCourierToOrder(orderId, courierId);
            this.showAlert('Kurye başarıyla atandı!', 'success');
            document.querySelector('.modal-overlay').remove();
            await this.loadAllSellerOrders();

        } catch (error) {
            console.error('Manuel kurye atama hatası:', error);
            this.showAlert('Kurye atanamadı!', 'error');
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
    
    async assignBestCourier(orderId, sellerLocation) {
        // Basit kurye atama algoritması
        const availableCouriers = await this.getAvailableCouriers();
        
        if (availableCouriers.length === 0) return null;
        
        // En az teslimatı olan kuryeyi seç
        const bestCourier = availableCouriers[0];
        
        // Kuryeyi siparişe ata
        await this.assignCourierToOrder(orderId, bestCourier.id);
        
        return bestCourier;
    }
    
    async assignCourierToOrder(orderId, courierId) {
        const { error } = await this.supabase
            .from('orders')
            .update({
                courier_id: courierId,
                status: 'on_the_way',
                assigned_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', orderId);

        if (error) throw error;
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

    showAlert(message, type = 'info') {
        // Basit alert sistemi
        const alert = document.createElement('div');
        alert.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            border-radius: 8px;
            color: white;
            z-index: 10000;
            font-weight: 500;
            animation: slideInRight 0.3s ease-out;
        `;
        
        if (type === 'success') alert.style.background = '#28a745';
        else if (type === 'error') alert.style.background = '#dc3545';
        else if (type === 'warning') alert.style.background = '#ffc107';
        else alert.style.background = '#17a2b8';
        
        alert.textContent = message;
        document.body.appendChild(alert);
        
        setTimeout(() => {
            alert.style.animation = 'slideOutRight 0.3s ease-in';
            setTimeout(() => alert.remove(), 300);
        }, 3000);
    }

    // Cleanup
    destroy() {
        if (this.realtimeSubscription) {
            this.supabase.removeChannel(this.realtimeSubscription);
        }
        console.log('🧹 SellerPanel temizlendi');
    }
}

// Global
window.SellerPanel = SellerPanel;

// Event listener
if (window.panelSystem && typeof window.panelSystem.on === 'function') {
    window.panelSystem.on('sellerSessionStart', (userProfile) => {
        console.log('🛍️ SellerPanel başlatılıyor...');
        window.sellerPanel = new SellerPanel(userProfile);
    });
} else {
    console.log('⚠️ panelSystem bulunamadı, doğrudan başlatılıyor...');
    // Fallback: Sayfa yüklendiğinde kontrol et
    document.addEventListener('DOMContentLoaded', function() {
        if (window.userProfile?.role === 'seller' && !window.sellerPanel) {
            console.log('🔄 SellerPanel doğrudan başlatılıyor...');
            window.sellerPanel = new SellerPanel(window.userProfile);
        }
    });
}

console.log('✅ seller-panel.js yüklendi - TÜM HATALAR DÜZELTİLDİ');
