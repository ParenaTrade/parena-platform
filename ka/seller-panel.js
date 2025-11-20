class SellerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.sellerData = null;
        this.products = [];
        this.orders = [];
        this.allSellerOrders = [];
        this.currentSection = '';
        this.realtimeSubscription = null;
        this.pollingInterval = null;
        this.isInitialized = false;
        this.categories = [];
        this.processedOrders = new Set();
        this.lastProcessedOrderId = null;
        
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('🏪 SellerPanel başlatılıyor...', this.userProfile);
        
        if (!this.supabase) {
            console.error('❌ Supabase client bulunamadı!');
            this.supabase = window.supabase;
        }
        
        window.sellerPanel = this;
        this.init();
    }

    async init() {
        try {
            await this.loadSellerData();
            await this.loadCategories();
            this.setupRealTimeListeners();
            this.isInitialized = true;
            console.log('✅ SellerPanel başlatıldı', this.sellerData);
        } catch (error) {
            console.error('❌ SellerPanel init hatası:', error);
        }
    }

    // ✅ REAL-TIME LISTENER METODU - EKSİK OLAN
    setupRealTimeListeners() {
        if (!this.sellerData?.id) {
            console.log('⚠️ Seller ID yok, real-time listener kurulamıyor');
            setTimeout(() => this.setupRealTimeListeners(), 1000);
            return;
        }

        console.log('🔔 Real-time sipariş listenerları kuruluyor...', this.sellerData.id);

        try {
            // Basit polling sistemi ile başlayalım
            this.setupPollingSystem();
            
        } catch (error) {
            console.error('❌ Real-time listener kurulum hatası:', error);
            setTimeout(() => {
                console.log('🔄 Real-time yeniden deneniyor...');
                this.setupRealTimeListeners();
            }, 5000);
        }
    }

    // ✅ POLLING SİSTEMİ
    setupPollingSystem() {
        console.log('🔄 Polling sistemi başlatılıyor...');
        
        // Önceki interval'ı temizle
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
        }

        this.pollingInterval = setInterval(async () => {
            try {
                await this.checkForNewOrders();
            } catch (error) {
                console.error('❌ Polling hatası:', error);
            }
        }, 10000); // 10 saniyede bir kontrol

        console.log('✅ Polling sistemi başlatıldı');
    }

    // ✅ YENİ SİPARİŞ KONTROLÜ
    async checkForNewOrders() {
        if (!this.sellerData?.id) return;

        try {
            const { data: newOrders, error } = await this.supabase
                .from('orders')
                .select('*')
                .eq('seller_id', this.sellerData.id)
                .eq('status', 'pending')
                .gt('created_at', new Date(Date.now() - 60000).toISOString()) // Son 1 dakika
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Yeni sipariş kontrol hatası:', error);
                return;
            }

            if (newOrders && newOrders.length > 0) {
                console.log('🆕 Yeni siparişler bulundu:', newOrders.length);
                
                // Yeni siparişleri işle
                newOrders.forEach(order => {
                    if (!this.processedOrders.has(order.id)) {
                        this.processedOrders.add(order.id);
                        this.handleNewOrder(order);
                    }
                });
            }
        } catch (error) {
            console.error('❌ Yeni sipariş işleme hatası:', error);
        }
    }

    // ✅ YENİ SİPARİŞ İŞLEME
    // ✅ YENİ SİPARİŞ İŞLEME - SES İLE
async handleNewOrder(order) {
    console.log('🎯 Yeni sipariş işleniyor:', order);
    
    // Aynı siparişi tekrar işleme
    if (this.lastProcessedOrderId === order.id) {
        console.log('⏭️ Bu sipariş zaten işlendi, atlanıyor...');
        return;
    }
    
    this.lastProcessedOrderId = order.id;

    // Push bildirimi göster
    this.showOrderNotification(order);
    
    // Sipariş sesini çal (tekrarlı)
    this.playOrderSound('order');
    
    // Sayfaları güncelle
    await this.refreshCurrentSections();
}

// ✅ KURYE ATANDIĞINDA SES
async assignCourierToOrder(orderId, courierId) {
    try {
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

        // Kurye atama sesi
        this.playOrderSound('courier');
        
        this.showAlert('✅ Kurye başarıyla atandı!', 'success');
        await this.loadOrders();

    } catch (error) {
        console.error('Kurye atama hatası:', error);
        this.showAlert('❌ Kurye atanamadı!', 'error');
    }
}

// ✅ SİPARİŞ İPTAL SESİ
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

        // İptal sesi
        this.playOrderSound('cancel');
        
        this.showAlert('❌ Sipariş reddedildi!', 'success');
        this.removeNotification();
        await this.loadOrders();

    } catch (error) {
        console.error('Sipariş reddetme hatası:', error);
        this.showAlert('❌ Sipariş reddedilemedi!', 'error');
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

    // ✅ SES SİSTEMİ - FARKLI WAV DOSYALARI
playOrderSound(type = 'order') {
    console.log('🔊 Ses çalınıyor:', type);
    
    const soundFiles = {
        order: 'wav_order.wav',
        courier: 'wav_courier.wav', 
        cancel: 'wav_cancel.wav'
    };

    const soundFile = soundFiles[type] || soundFiles.order;
    
    try {
        // Audio element oluştur
        const audio = new Audio(`/panel/${soundFile}`);
        audio.volume = 0.7;
        
        // Sipariş bildiriminde kabul/red diyene kadar tekrarla
        if (type === 'order') {
            audio.loop = true;
            
            // Kabul/red butonlarına event listener ekle
            setTimeout(() => {
                const acceptBtns = document.querySelectorAll('.accept-order-btn');
                const rejectBtns = document.querySelectorAll('.reject-order-btn');
                
                const stopSound = () => {
                    audio.pause();
                    audio.currentTime = 0;
                };
                
                acceptBtns.forEach(btn => {
                    btn.addEventListener('click', stopSound);
                });
                
                rejectBtns.forEach(btn => {
                    btn.addEventListener('click', stopSound);
                });
                
                // 2 dakika sonra otomatik durdur
                setTimeout(stopSound, 120000);
            }, 100);
        }
        
        audio.play().catch(e => {
            console.log('🔇 Ses çalınamadı:', e);
            this.playFallbackSound();
        });
        
    } catch (error) {
        console.log('🔇 Ses hatası:', error);
        this.playFallbackSound();
    }
}

// ✅ FALLBACK SES SİSTEMİ
playFallbackSound() {
    try {
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
        }, 300);
        
    } catch (e) {
        console.log('🔇 Fallback ses de çalınamadı');
    }
}

    
    // ✅ SAYFALARI YENİLE
    async refreshCurrentSections() {
        if (this.currentSection === 'orders') {
            await this.loadOrders();
        }
        
        if (this.currentSection === 'sellerDashboard') {
            await this.loadSellerDashboard();
        }
    }

    // ✅ TEMİZLİK
    destroy() {
        console.log('🧹 SellerPanel temizleniyor...');
        
        if (this.realtimeSubscription) {
            this.supabase.removeChannel(this.realtimeSubscription);
            this.realtimeSubscription = null;
        }
        
        if (this.pollingInterval) {
            clearInterval(this.pollingInterval);
            this.pollingInterval = null;
        }
        
        this.processedOrders.clear();
        this.lastProcessedOrderId = null;
        
        console.log('✅ SellerPanel temizlendi');
    }
    async loadSellerData() {
        try {
            console.log('📥 Seller verisi yükleniyor...', this.userProfile);
            
            const { data, error } = await this.supabase
                .from('seller_profiles')
                .select('*')
                    .eq('id', this.userProfile.id)
                .single();

            if (error) {
                console.error('❌ Seller profili bulunamadı:', error);
                this.sellerData = {
                    id: this.userProfile.id,
                    business_name: this.userProfile.name,
                    phone: this.userProfile.phone
                };
            } else {
                this.sellerData = data;
                console.log('✅ Seller verisi yüklendi:', data);
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

    
      // ✅ KATEGORİLERİ YÜKLE
    // ✅ KATEGORİLERİ YÜKLE
async loadCategories() {
    try {
        console.log('🔍 Kategoriler yükleniyor...');
        
        const { data: categories, error } = await this.supabase
            .from('categories')
            .select('*');

        if (error) {
            console.error('❌ Kategori yükleme hatası:', error);
            return;
        }

        if (categories && categories.length > 0) {
            this.categories = categories;
            console.log('✅ Tüm kategoriler yüklendi:', categories.length, 'adet');
        } else {
            console.warn('⚠️ Kategori bulunamadı');
        }
    } catch (error) {
        console.error('Kategori yükleme hatası:', error);
    }
}
    
// ✅ DASHBOARD - GÜNCELLENMİŞ VERSİYON
async loadSellerDashboard() {
    const section = document.getElementById('sellerDashboardSection');
    if (!section) return;
    
    section.innerHTML = `
        <div class="section-header">
            <h1>İşletme Paneli</h1>
            <p class="subtitle">${this.sellerData?.business_name || ''}</p>
        </div>
        
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
                        <a href="#" class="view-all" id="viewAllOrders">Tümünü Gör</a>
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

    // Event listener ekle
    setTimeout(() => {
        const viewAllBtn = document.getElementById('viewAllOrders');
        if (viewAllBtn) {
            viewAllBtn.addEventListener('click', (e) => {
                e.preventDefault();
                if (window.panelSystem) {
                    window.panelSystem.showSection('orders');
                }
            });
        }
    }, 100);

    // Seller verisinin yüklenmesini bekle ve sonra istatistikleri yükle
    if (!this.sellerData?.id) {
        console.log('⏳ Seller verisi yükleniyor, bekleniyor...');
        await this.loadSellerData();
    }

    await this.loadSellerStats();
    await this.loadRecentSellerOrders();
    await this.loadStockAlerts();
}



// ✅ SON SİPARİŞLER - GÜNCELLENMİŞ VERSİYON
async loadRecentSellerOrders() {
    if (!this.sellerData?.id) {
        console.log('⏳ Seller ID bekleniyor...');
        setTimeout(() => {
            if (this.sellerData?.id) {
                this.loadRecentSellerOrders();
            }
        }, 500);
        return;
    }

    try {
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
            .eq('seller_id', this.sellerData.id)
            .order('created_at', { ascending: false })
            .limit(5);

        const container = document.getElementById('recentSellerOrders');
        if (!container) {
            console.error('❌ Son siparişler container bulunamadı');
            return;
        }
        
        if (error) {
            console.error('❌ Son siparişler yükleme hatası:', error);
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
                        <strong>Sipariş #${order.id?.slice(-8) || 'N/A'}</strong>
                        <div style="color: #666; font-size: 12px; margin-top: 2px;">
                            ${order.customer_name || 'Müşteri'} • ${order.customer_phone || 'Telefon yok'}
                        </div>
                    </div>
                    <span class="status-badge status-${order.status}">${this.getStatusText(order.status)}</span>
                </div>
                <div class="order-details" style="color: #666; font-size: 14px;">
                    ${order.order_details[0]?.product_name || 'Ürün'} 
                    ${order.order_details.length > 1 ? `ve ${order.order_details.length - 1} ürün daha` : ''}
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

    } catch (error) {
        console.error('❌ Son siparişler yükleme hatası:', error);
        const container = document.getElementById('recentSellerOrders');
        if (container) {
            container.innerHTML = '<p class="text-muted">Siparişler yüklenirken hata oluştu.</p>';
        }
    }
}

// ✅ STOK UYARILARI - GÜNCELLENMİŞ VERSİYON
// ✅ STOK UYARILARI - PRODUCT_PRICES STOK BİLGİSİ İLE
async loadStockAlerts() {
    if (!this.sellerData?.id) {
        console.log('⏳ Seller ID bekleniyor...');
        setTimeout(() => {
            if (this.sellerData?.id) {
                this.loadStockAlerts();
            }
        }, 500);
        return;
    }

    try {
        // Product_prices tablosundan stok bilgilerini çek
        const { data: lowStockProducts, error } = await this.supabase
            .from('product_prices')
            .select(`
                stock,
                product:products!inner(
                    name,
                    unit_type
                )
            `)
            .eq('seller_id', this.sellerData.id)
            .lt('stock', 10)
            .order('stock', { ascending: true });

        const container = document.getElementById('stockAlerts');
        if (!container) {
            console.error('❌ Stok uyarıları container bulunamadı');
            return;
        }
        
        if (error) {
            console.error('❌ Stok uyarıları yükleme hatası:', error);
            container.innerHTML = '<p class="text-muted">Stok bilgileri yüklenirken hata oluştu.</p>';
            return;
        }

        if (!lowStockProducts || lowStockProducts.length === 0) {
            container.innerHTML = '<p class="text-muted">Stok uyarısı bulunmuyor.</p>';
            return;
        }

        container.innerHTML = lowStockProducts.map(item => `
            <div class="stock-alert" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span style="font-weight: 500;">${item.product.name}</span>
                    <span style="color: var(--danger); font-weight: bold;">
                        ${item.stock} ${item.product.unit_type || 'adet'}
                    </span>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('❌ Stok uyarıları yükleme hatası:', error);
        const container = document.getElementById('stockAlerts');
        if (container) {
            container.innerHTML = '<p class="text-muted">Stok bilgileri yüklenirken hata oluştu.</p>';
        }
    }
}
    
    // ✅ SİPARİŞ KABUL/RED - DÜZELTİLMİŞ
    async acceptOrder(orderId) {
        if (!orderId) {
            console.error('❌ Order ID yok');
            this.showAlert('❌ Sipariş ID bulunamadı!', 'error');
            return;
        }

        try {
            console.log('✅ Sipariş kabul ediliyor:', orderId);
            
            const updateData = {
                status: 'confirmed',
                accepted_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('orders')
                .update(updateData)
                .eq('id', orderId);

            if (error) {
                console.error('❌ Sipariş güncelleme hatası:', error);
                throw error;
            }

            this.showAlert('✅ Sipariş kabul edildi!', 'success');
            this.removeNotification();
            
            // Sayfayı yenile
            if (this.currentSection === 'orders') {
                await this.loadOrders();
            }
            if (this.currentSection === 'sellerDashboard') {
                await this.loadSellerDashboard();
            }

        } catch (error) {
            console.error('Sipariş kabul hatası:', error);
            this.showAlert('❌ Sipariş kabul edilemedi!', 'error');
        }
    }

     async rejectOrder(orderId) {
        if (!orderId) {
            console.error('❌ Order ID yok');
            this.showAlert('❌ Sipariş ID bulunamadı!', 'error');
            return;
        }

        const reason = prompt('Reddetme nedeniniz:');
        if (!reason) return;

        try {
            console.log('❌ Sipariş reddediliyor:', orderId);
            
            const updateData = {
                status: 'cancelled',
                cancellation_reason: `Satıcı tarafından reddedildi: ${reason}`,
                cancelled_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { error } = await this.supabase
                .from('orders')
                .update(updateData)
                .eq('id', orderId);

            if (error) throw error;

            this.showAlert('❌ Sipariş reddedildi!', 'success');
            this.removeNotification();
            
            // Sayfayı yenile
            if (this.currentSection === 'orders') {
                await this.loadOrders();
            }
            if (this.currentSection === 'sellerDashboard') {
                await this.loadSellerDashboard();
            }

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

    // ✅ SİPARİŞ YÖNETİMİ
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

        // Event listener ekle
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
            return;
        }

        try {
            console.log('📥 Siparişler yükleniyor, seller_id:', this.sellerData.id);
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
            const container = document.getElementById('ordersList');
            if (container) {
                container.innerHTML = `
                    <div class="error-message">
                        <p>Siparişler yüklenirken hata oluştu: ${error.message}</p>
                    </div>
                `;
            }
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
                                 ${item.quantity} ${item.unit_type} × ${parseFloat(item.unit_price || 0).toFixed(2)} ₺
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

    // ✅ ÜRÜN YÖNETİMİ SAYFASI - GÜNCELLENMİŞ
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
                <div class="filters" style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                    <select id="categoryFilter" class="form-control" style="min-width: 200px;">
                        <option value="">Tüm Kategoriler</option>
                        ${this.categories.map(cat => 
                            `<option value="${cat.id}">${cat.name}</option>`
                        ).join('')}
                    </select>
                    <select id="productStatusFilter" class="form-control">
                        <option value="">Tüm Durumlar</option>
                        <option value="active">Aktif</option>
                        <option value="inactive">Pasif</option>
                    </select>
                    <input type="text" id="productSearch" placeholder="Ürün ara..." class="form-control" style="min-width: 250px;">
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
                                <th>Tip</th>
                                <th>İşlemler</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td colspan="8" class="text-center">
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

    // Event listener'ları ekle - DÜZELTİLMİŞ
    const addProductBtn = document.getElementById('addProductBtn');
    if (addProductBtn) {
        addProductBtn.addEventListener('click', () => {
            this.showAddProductModal();
        });
    }

    const productSearch = document.getElementById('productSearch');
    if (productSearch) {
        productSearch.addEventListener('input', (e) => {
            this.searchProducts(e.target.value);
        });
    }

    const categoryFilter = document.getElementById('categoryFilter');
    if (categoryFilter) {
        categoryFilter.addEventListener('change', (e) => {
            this.filterProductsByCategory(e.target.value);
        });
    }

    const statusFilter = document.getElementById('productStatusFilter');
    if (statusFilter) {
        statusFilter.addEventListener('change', (e) => {
            this.filterProductsByStatus(e.target.value);
        });
    }

    await this.loadProductsData();
}
    
// ✅ ÜRÜN VERİLERİNİ YÜKLE - PRODUCT_PRICES JOIN DÜZELTMESİ
async loadProductsData() {
    if (!this.sellerData?.id) {
        console.error('❌ Seller ID yok, ürünler yüklenemiyor');
        return;
    }

    try {
        // Products ve product_prices join ile birlikte çek - DÜZELTİLMİŞ
        const { data: products, error } = await this.supabase
            .from('products')
            .select(`
                *,
                product_prices(
                    price,
                    discount_price,
                    stock,
                    currency,
                    centre_id
                )
            `)
            .eq('seller_id', this.sellerData.id)
            .order('created_at', { ascending: false });

        if (error) throw error;

        // Product_prices verilerini ana ürün objesine merge et - DÜZELTİLMİŞ
        this.products = (products || []).map(product => {
            const priceData = product.product_prices && product.product_prices.length > 0 ? product.product_prices[0] : null;
            return {
                ...product,
                current_price: priceData?.price || product.price,
                discount_price: priceData?.discount_price || null,
                current_stock: priceData?.stock || product.stock,
                currency: priceData?.currency || product.currency,
                centre_id: priceData?.centre_id || null
            };
        });

        console.log('✅ Ürünler yüklendi:', this.products.length);
        console.log('📊 İndirimli ürünler:', this.products.filter(p => p.discount_price).length);
        this.renderProductsTable(this.products);

    } catch (error) {
        console.error('❌ Ürünler yükleme hatası:', error);
        const tbody = document.querySelector('#productsTable tbody');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center">
                        <div class="error-message">
                            <p>Ürünler yüklenirken hata oluştu: ${error.message}</p>
                        </div>
                    </td>
                </tr>
            `;
        }
    }
}
    
    // ✅ ÜRÜN TABLOSU RENDER - İNDİRİMLİ FİYAT GÖSTERİMİ
renderProductsTable(products) {
    const tbody = document.querySelector('#productsTable tbody');
    if (!tbody) return;
    
    if (!products.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center">
                    <p class="text-muted">Henüz ürün eklenmemiş.</p>
                    <button class="btn btn-primary mt-2" id="addFirstProduct">
                        <i class="fas fa-plus"></i> İlk Ürünü Ekle
                    </button>
                </td>
            </tr>
        `;
        
        setTimeout(() => {
            const addFirstBtn = document.getElementById('addFirstProduct');
            if (addFirstBtn) {
                addFirstBtn.addEventListener('click', () => {
                    this.showAddProductModal();
                });
            }
        }, 100);
        
        return;
    }

    tbody.innerHTML = products.map(product => {
        // Kategori ismini bul
        const category = this.categories.find(cat => cat.id === product.category_id);
        const categoryName = category ? category.name : (product.reyon_name || '-');

        // Fiyat bilgilerini product_prices'tan al
        const displayPrice = product.current_price || product.price;
        const displayStock = product.current_stock || product.stock;
        const hasDiscount = product.discount_price && product.discount_price < displayPrice;
        const discountPercentage = hasDiscount ? 
            Math.round(((displayPrice - product.discount_price) / displayPrice) * 100) : 0;

        return `
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
            <td>${categoryName}</td>
            <td>
                <div style="min-width: 120px;">
                    ${hasDiscount ? `
                        <div style="display: flex; flex-direction: column; gap: 2px;">
                            <div style="color: #dc3545; text-decoration: line-through; font-size: 12px;">
                                ${parseFloat(displayPrice).toFixed(2)} ₺
                            </div>
                            <div style="color: #28a745; font-weight: bold; font-size: 14px;">
                                ${parseFloat(product.discount_price).toFixed(2)} ₺
                            </div>
                            <div style="background: #ffc107; color: #000; padding: 2px 6px; border-radius: 10px; font-size: 10px; font-weight: bold; text-align: center;">
                                %${discountPercentage} İNDİRİM
                            </div>
                        </div>
                    ` : `
                        <div style="font-weight: bold; color: #333;">
                            ${parseFloat(displayPrice).toFixed(2)} ₺
                        </div>
                    `}
                </div>
                ${product.tax_rate ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">KDV: %${product.tax_rate}</div>` : ''}
            </td>
            <td>
                <span class="${displayStock < 10 ? 'text-danger' : 'text-success'}" style="font-weight: 500;">
                    ${displayStock} ${product.unit_type || 'adet'}
                </span>
                ${displayStock < 5 ? `<div style="font-size: 11px; color: #dc3545;">⏳ Az Stok</div>` : ''}
            </td>
            <td>
                <span class="status-badge status-${product.is_active ? 'active' : 'inactive'}">
                    ${product.is_active ? 'Aktif' : 'Pasif'}
                </span>
            </td>
            <td>
                ${product.centre_id ? `
                    <span class="badge badge-info" style="background: #17a2b8; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px;">
                        Şube
                    </span>
                ` : `
                    <span class="badge badge-primary" style="background: #007bff; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px;">
                        Merkez
                    </span>
                `}
            </td>
            <td>
                <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                    <button class="btn btn-sm btn-warning edit-product-btn" data-product-id="${product.id}" 
                            style="padding: 4px 8px; font-size: 12px;">
                        <i class="fas fa-edit"></i> Düzenle
                    </button>
                    <button class="btn btn-sm btn-secondary toggle-product-btn" 
                            data-product-id="${product.id}" 
                            data-current-status="${product.is_active}"
                            style="padding: 4px 8px; font-size: 12px;">
                        <i class="fas fa-power-off"></i> ${product.is_active ? 'Pasif' : 'Aktif'}
                    </button>
                </div>
            </td>
        </tr>
        `;
    }).join('');

    // ✅ EVENT LISTENER'LARI EKLE - DÜZELTİLMİŞ
    this.attachProductEventListeners();
}

// ✅ EVENT LISTENER FONKSİYONU - AYRI BİR FONKSİYON OLARAK
attachProductEventListeners() {
    console.log('🔗 Ürün event listenerları ekleniyor...');
    
    // Düzenle butonları - DÜZELTİLMİŞ
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('✏️ Düzenle butonuna tıklandı');
            const productId = btn.getAttribute('data-product-id');
            console.log('🆔 Product ID:', productId);
            if (productId) {
                this.editProduct(productId);
            } else {
                console.error('❌ Product ID bulunamadı');
            }
        });
    });

    // Aktif/Pasif butonları - DÜZELTİLMİŞ
    document.querySelectorAll('.toggle-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('🔘 Durum butonuna tıklandı');
            const productId = btn.getAttribute('data-product-id');
            const currentStatus = btn.getAttribute('data-current-status') === 'true';
            if (productId) {
                this.toggleProductStatus(productId, currentStatus);
            } else {
                console.error('❌ Product ID bulunamadı');
            }
        });
    });

    console.log('✅ Event listenerlar eklendi');
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


// ✅ MODAL FORM AÇMA - TEK FORM (Ekleme ve Güncelleme)
showProductModal(productId = null) {
    try {
        console.log('🔍 Ürün modalı açılıyor...', productId ? 'Güncelleme' : 'Ekleme');
        
        // Eski modal varsa temizle
        const existingModal = document.querySelector('.modal-overlay');
        if (existingModal) {
            existingModal.remove();
        }

        const isEditMode = !!productId;
        const modalTitle = isEditMode ? 'Ürünü Düzenle' : 'Yeni Ürün Ekle';
        const buttonText = isEditMode ? 'Ürünü Güncelle' : 'Ürünü Ekle';

        // Modal HTML'ini oluştur
        const modalHTML = `
        <div class="modal-overlay">
            <div class="modal-content">
                <h3>${modalTitle}</h3>
                <form id="productForm">
                    <input type="hidden" id="productId" value="${productId || ''}">
                    
                    <!-- Temel Bilgiler -->
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

                    <!-- Reyon -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="productReyon">Reyon *</label>
                            <select id="productReyon" class="form-control" required>
                                <option value="">Reyon Seçin</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="productBrand">Marka</label>
                            <select id="productBrand" class="form-control">
                                <option value="">Marka Seçin</option>
                            </select>
                        </div>
                    </div>

                    <!-- Kategori -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="productCategory">Kategori *</label>
                            <select id="productCategory" class="form-control" required>
                                <option value="">Önce reyon seçin</option>
                            </select>
                        </div>
                    </div>

                    <!-- Fiyat ve Stok -->
                    <div class="form-row">
                        <div class="form-group">
                            <label for="productPrice">Fiyat (₺) *</label>
                            <input type="number" id="productPrice" class="form-control" step="0.01" min="0" required>
                        </div>
                        <div class="form-group">
                            <label for="productDiscountPrice">İndirimli Fiyat (₺)</label>
                            <input type="number" id="productDiscountPrice" class="form-control" step="0.01" min="0">
                        </div>
                        <div class="form-group">
                            <label for="productStock">Stok *</label>
                            <input type="number" id="productStock" class="form-control" min="0" required>
                        </div>
                    </div>

                    <!-- Açıklama -->
                    <div class="form-group">
                        <label for="productDescription">Açıklama</label>
                        <textarea id="productDescription" class="form-control" rows="3"></textarea>
                    </div>

                    <!-- Durum (Sadece güncelleme modunda) -->
                    ${isEditMode ? `
                    <div class="form-row">
                        <div class="form-group">
                            <label for="productStatus">Durum</label>
                            <select id="productStatus" class="form-control">
                                <option value="true">Aktif</option>
                                <option value="false">Pasif</option>
                            </select>
                        </div>
                    </div>
                    ` : ''}

                    <!-- Otomatik bilgiler -->
                    <div class="auto-fill-info" style="background: #f8f9fa; padding: 10px; border-radius: 5px; margin-bottom: 15px; display: none;" id="autoFillInfo">
                        <small><strong>Otomatik doldurulacak:</strong> 
                            <span id="unitTypeDisplay"></span>, 
                            <span id="taxRateDisplay"></span>
                        </small>
                    </div>

                    <!-- Butonlar -->
                    <div class="modal-actions">
                        <button type="button" class="btn btn-secondary" id="cancelProductModal">İptal</button>
                        <button type="submit" class="btn btn-primary">${buttonText}</button>
                    </div>
                </form>
            </div>
        </div>`;
        
        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        // Event listener'ları ekle
        document.getElementById('cancelProductModal').addEventListener('click', () => {
            document.querySelector('.modal-overlay').remove();
        });
        
        document.getElementById('productForm').addEventListener('submit', (e) => {
            e.preventDefault();
            if (isEditMode) {
                this.updateProduct(productId);
            } else {
                this.addNewProduct();
            }
        });

        // Selectleri doldur
        this.loadModalSelects();

        // Eğer güncelleme modundaysa formu doldur
        if (isEditMode) {
            this.loadProductDataForEdit(productId);
        }

        console.log('✅ Ürün modalı başarıyla açıldı:', isEditMode ? 'Güncelleme' : 'Ekleme');

    } catch (error) {
        console.error('❌ Modal açma hatası:', error);
        this.showAlert('❌ Modal açılamadı!', 'error');
    }
}

// ✅ YENİ ÜRÜN EKLEME MODALI (Eski fonksiyon - geriye uyumluluk için)
showAddProductModal() {
    this.showProductModal();
}
// ✅ EVENT LISTENER'LARI EKLE - GÜNCELLENMİŞ
attachProductEventListeners() {
    console.log('🔗 Ürün event listenerları ekleniyor...');
    
    // Düzenle butonları
    document.querySelectorAll('.edit-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('✏️ Düzenle butonuna tıklandı');
            const productId = btn.getAttribute('data-product-id');
            console.log('🆔 Product ID:', productId);
            if (productId) {
                this.showProductModal(productId); // ✅ Tek modal fonksiyonu
            } else {
                console.error('❌ Product ID bulunamadı');
            }
        });
    });

    // Aktif/Pasif butonları
    document.querySelectorAll('.toggle-product-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            console.log('🔘 Durum butonuna tıklandı');
            const productId = btn.getAttribute('data-product-id');
            const currentStatus = btn.getAttribute('data-current-status') === 'true';
            if (productId) {
                this.toggleProductStatus(productId, currentStatus);
            } else {
                console.error('❌ Product ID bulunamadı');
            }
        });
    });

    console.log('✅ Event listenerlar eklendi');
}




    
// ✅ GÜNCELLEME İÇİN ÜRÜN VERİLERİNİ YÜKLE - DÜZELTİLMİŞ
async loadProductDataForEdit(productId) {
    try {
        console.log('🔍 Ürün verileri yükleniyor:', productId);
        
        // Products ve product_prices tablolarını JOIN yaparak al
        const { data: product, error } = await this.supabase
            .from('products')
            .select(`
                *,
                product_prices (
                    price,
                    discount_price,
                    stock
                )
            `)
            .eq('id', productId)
            .single();

        if (error) {
            console.error('❌ Ürün verisi yükleme hatası:', error);
            this.showAlert('❌ Ürün verileri yüklenemedi!', 'error');
            return;
        }

        if (product) {
            console.log('✅ Ürün verileri yüklendi:', product);
            
            // Temel bilgileri doldur
            document.getElementById('productName').value = product.name || '';
            document.getElementById('productBarcode').value = product.barcode || '';
            document.getElementById('productDescription').value = product.description || '';
            
            // Durum select'ini doldur (sadece güncelleme modunda varsa)
            const statusSelect = document.getElementById('productStatus');
            if (statusSelect) {
                statusSelect.value = product.is_active.toString();
            }
            
            // Fiyat ve stok bilgilerini product_prices'tan al
            const productPrice = product.product_prices && product.product_prices.length > 0 
                ? product.product_prices[0] 
                : null;
            
            document.getElementById('productPrice').value = productPrice?.price || product.price || '';
            document.getElementById('productDiscountPrice').value = productPrice?.discount_price || '';
            document.getElementById('productStock').value = productPrice?.stock || product.stock || '';
            
            // ✅ REYON SELECT'İNİ DOLDUR
            const reyonSelect = document.getElementById('productReyon');
            if (product.reyon_id && reyonSelect) {
                // Önce reyon select'ini doldurmayı bekle
                await this.waitForElementOptions(reyonSelect);
                
                reyonSelect.value = product.reyon_id;
                console.log('✅ Reyon select dolduruldu:', product.reyon_id);
                
                // Reyon değişimini tetikle (kategorileri filtrelemek için)
                this.handleReyonChange(product.reyon_id);
                
                // ✅ KATEGORİ SELECT'İNİ DOLDUR (reyon değişiminden sonra)
                setTimeout(async () => {
                    const categorySelect = document.getElementById('productCategory');
                    if (product.category_id && categorySelect) {
                        await this.waitForElementOptions(categorySelect);
                        categorySelect.value = product.category_id;
                        console.log('✅ Kategori select dolduruldu:', product.category_id);
                    }
                }, 800);
            }
            
            // ✅ MARKA SELECT'İNİ DOLDUR
            const brandSelect = document.getElementById('productBrand');
            if (product.brand_id && brandSelect) {
                await this.waitForElementOptions(brandSelect);
                brandSelect.value = product.brand_id;
                console.log('✅ Marka select dolduruldu:', product.brand_id);
            }
            
            console.log('✅ Form başarıyla dolduruldu');
        }

    } catch (error) {
        console.error('❌ Ürün verisi yükleme hatası:', error);
        this.showAlert('❌ Ürün verileri yüklenemedi!', 'error');
    }
}

// ✅ ELEMENT OPTION'LARININ YÜKLENMESİNİ BEKLE
waitForElementOptions(selectElement, maxWaitTime = 5000) {
    return new Promise((resolve, reject) => {
        const startTime = Date.now();
        
        const checkOptions = () => {
            // Select'te option'lar var mı kontrol et (en az 1 tane boş olmayan)
            const hasOptions = selectElement.options.length > 1 || 
                              (selectElement.options.length === 1 && selectElement.options[0].value !== '');
            
            if (hasOptions) {
                resolve(true);
            } else if (Date.now() - startTime > maxWaitTime) {
                reject(new Error('Select options timeout'));
            } else {
                setTimeout(checkOptions, 100);
            }
        };
        
        checkOptions();
    });
}
    
// ✅ ÜRÜN DÜZENLEME - DEBUG EKLİ
async editProduct(productId) {
    console.log('🎯 Ürün düzenleniyor:', productId);
    
    try {
        // Ürün bilgilerini getir - PRODUCT_PRICES İLE BİRLİKTE
        const { data: product, error } = await this.supabase
            .from('products')
            .select(`
                *,
                product_prices(
                    price,
                    discount_price,
                    stock,
                    currency,
                    centre_id
                )
            `)
            .eq('id', productId)
            .single();

        if (error) throw error;

        console.log('📦 Ürün verisi:', product);

        // Product_prices verilerini merge et
        const priceData = product.product_prices && product.product_prices.length > 0 ? product.product_prices[0] : null;
        const mergedProduct = {
            ...product,
            current_price: priceData?.price || product.price,
            discount_price: priceData?.discount_price || null,
            current_stock: priceData?.stock || product.stock
        };

        // Düzenleme modalını göster
        this.showEditProductModal(mergedProduct);

    } catch (error) {
        console.error('❌ Ürün bilgileri yüklenemedi:', error);
        this.showAlert('❌ Ürün bilgileri yüklenemedi!', 'error');
    }
}

// ✅ ÜRÜN DÜZENLEME MODALI - DEBUG EKLİ
showEditProductModal(product) {
    console.log('📝 Düzenleme modalı açılıyor:', product);
    
    const modalHtml = `
        <div class="modal-overlay" style="position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000;">
            <div class="modal" style="background: white; border-radius: 12px; padding: 30px; width: 90%; max-width: 600px; max-height: 90vh; overflow-y: auto;">
                <div class="modal-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                    <h3 style="margin: 0;">Ürünü Düzenle</h3>
                    <button class="btn btn-sm btn-secondary" onclick="this.closest('.modal-overlay').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <form id="editProductForm">
                    <input type="hidden" id="editProductId" value="${product.id}">
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editProductName">Ürün Adı *</label>
                            <input type="text" id="editProductName" class="form-control" value="${product.name}" required>
                        </div>
                        <div class="form-group">
                            <label for="editProductBarcode">Barkod</label>
                            <input type="text" id="editProductBarcode" class="form-control" value="${product.barcode || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editProductPrice">Fiyat (₺) *</label>
                            <input type="number" id="editProductPrice" class="form-control" step="0.01" min="0" 
                                   value="${product.current_price || product.price}" required>
                        </div>
                        <div class="form-group">
                            <label for="editProductDiscountPrice">İndirimli Fiyat (₺)</label>
                            <input type="number" id="editProductDiscountPrice" class="form-control" step="0.01" min="0" 
                                   value="${product.discount_price || ''}">
                        </div>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="editProductStock">Stok *</label>
                            <input type="number" id="editProductStock" class="form-control" min="0" 
                                   value="${product.current_stock || product.stock}" required>
                        </div>
                        <div class="form-group">
                            <label for="editProductCategory">Kategori</label>
                            <select id="editProductCategory" class="form-control">
                                <option value="">Kategori Seçin</option>
                                ${this.categories.map(cat => 
                                    `<option value="${cat.id}" ${cat.name === product.reyon_name ? 'selected' : ''}>${cat.name}</option>`
                                ).join('')}
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label for="editProductDescription">Açıklama</label>
                        <textarea id="editProductDescription" class="form-control" rows="3">${product.description || ''}</textarea>
                    </div>
                    <div class="form-actions" style="display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px;">
                        <button type="button" class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">İptal</button>
                        <button type="submit" class="btn btn-primary">Güncelle</button>
                    </div>
                </form>
            </div>
        </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Form submit event'ini ekle - DÜZELTİLMİŞ
    const form = document.getElementById('editProductForm');
    if (form) {
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            console.log('📤 Form gönderiliyor...');
            await this.updateProduct(product.id);
        });
    } else {
        console.error('❌ Edit form bulunamadı');
    }
}

// ✅ MODAL FORM SELECTLERİNİ DOLDUR
// ✅ MODAL FORM SELECTLERİNİ DOLDUR - TAM ÇALIŞAN
// ✅ MODAL FORM SELECTLERİNİ DOLDUR - BASİT
async loadModalSelects() {
    try {
        console.log('🔍 Modal selectler dolduruluyor...');

        // 1. Satıcının mağaza türünü al
        await this.loadSellerStoreType();

        // 2. Reyondları yükle (satıcının mağaza türüne göre)
        await this.loadReyons();

        // 3. Tüm kategorileri yükle
        await this.loadCategories();

        // 4. Markaları yükle
        await this.loadBrands();

        console.log('✅ Tüm modal selectler başarıyla yüklendi');

    } catch (error) {
        console.error('Modal select yükleme hatası:', error);
    }
}
    
// ✅ SATICININ MAĞAZA TÜRÜNÜ AL - DİREKT
async loadSellerStoreType() {
    try {
        console.log('🔍 Satıcı mağaza türü yükleniyor...');
        
        // seller_profiles ve store_type tablolarını JOIN yap
        const { data: sellerData, error } = await this.supabase
            .from('seller_profiles')
            .select(`
                store_type_id,
                store_type:store_type_id (
                    id,
                    name
                )
            `)
            .eq('id', this.userProfile.id)
            .single();

        if (error) {
            console.error('❌ Satıcı mağaza türü yükleme hatası:', error);
            // Varsayılan değer
            this.sellerStoreTypeId = '3b6d27de-3f30-4113-82f2-d71e9b1cf89f';
            this.sellerStoreTypeName = 'Market';
            return;
        }

        if (sellerData && sellerData.store_type) {
            this.sellerStoreTypeId = sellerData.store_type_id;
            this.sellerStoreTypeName = sellerData.store_type.name;
            console.log('✅ Satıcı mağaza türü:', this.sellerStoreTypeName);
        } else {
            console.warn('⚠️ Mağaza türü bulunamadı, varsayılan kullanılıyor');
            this.sellerStoreTypeId = '3b6d27de-3f30-4113-82f2-d71e9b1cf89f';
            this.sellerStoreTypeName = 'Market';
        }

    } catch (error) {
        console.error('Satıcı mağaza türü yükleme hatası:', error);
        this.sellerStoreTypeId = '3b6d27de-3f30-4113-82f2-d71e9b1cf89f';
        this.sellerStoreTypeName = 'Market';
    }
}    
// ✅ REYONLARI YÜKLE (SATICI MAĞAZA TÜRÜNE GÖRE OTOMATİK FİLTRELİ)
async loadReyons() {
    try {
        console.log('🔍 Reyonlar yükleniyor, mağaza türü ID:', this.sellerStoreTypeId);
        
        if (!this.sellerStoreTypeId) {
            console.error('❌ Mağaza türü ID bulunamadı');
            return;
        }

        const { data: reyons, error } = await this.supabase
            .from('reyon')
            .select('*')
            .eq('store_type_id', this.sellerStoreTypeId); // ✅ Otomatik filtre

        if (error) {
            console.error('❌ Reyon yükleme hatası:', error);
            return;
        }

        if (reyons && reyons.length > 0) {
            this.reyons = reyons;
            const reyonSelect = document.getElementById('productReyon');
            
            reyonSelect.innerHTML = '<option value="">Reyon Seçin</option>' +
                reyons.map(reyon => 
                    `<option value="${reyon.id}" 
                      data-unit-type="${reyon.unit_type_name}" 
                      data-tax-rate="${reyon.tax_rate}">
                ${reyon.name} (${reyon.unit_type_name})
            </option>`
                ).join('');

            console.log('✅ Reyonlar yüklendi:', reyons.length, 'adet');

            // Reyon değişim eventi
            reyonSelect.addEventListener('change', (e) => {
                this.handleReyonChange(e.target.value);
            });
        } else {
            console.warn('⚠️ Bu mağaza türü için reyon bulunamadı');
            const reyonSelect = document.getElementById('productReyon');
            reyonSelect.innerHTML = '<option value="">Reyon bulunamadı</option>';
        }
    } catch (error) {
        console.error('Reyon yükleme hatası:', error);
    }
}    
// ✅ MARKALARI YÜKLE
async loadBrands() {
    try {
        console.log('🔍 Markalar yükleniyor...');
        
        const { data: brands, error } = await this.supabase
            .from('brands')
            .select('id, name')
            .not('name', 'is', null)
            .order('name');

        if (error) {
            console.error('❌ Marka yükleme hatası:', error);
            return;
        }

        if (brands && brands.length > 0) {
            this.brands = brands;
            const brandSelect = document.getElementById('productBrand');
            
            brandSelect.innerHTML = '<option value="">Marka Seçin</option>' +
                brands.map(brand => 
                    `<option value="${brand.id}">${brand.name}</option>`
                ).join('');
            
            console.log('✅ Markalar yüklendi:', brands.length, 'adet');
        } else {
            console.warn('⚠️ Marka bulunamadı');
            const brandSelect = document.getElementById('productBrand');
            brandSelect.innerHTML = '<option value="">Marka bulunamadı</option>';
        }
    } catch (error) {
        console.error('Marka yükleme hatası:', error);
    }
}
    
// ✅ MAĞAZA TÜRÜNE GÖRE REYONLARI FİLTRELE
filterReyonsByStoreType(storeTypeId) {
    const reyonSelect = document.getElementById('productReyon');
    
    if (!storeTypeId) {
        reyonSelect.innerHTML = '<option value="">Reyon Seçin</option>';
        return;
    }

    // Mağaza türüne göre reyonları filtrele
    const filteredReyons = this.allReyons.filter(reyon => 
        reyon.store_type_id === storeTypeId
    );

    reyonSelect.innerHTML = '<option value="">Reyon Seçin</option>' +
        filteredReyons.map(reyon => 
            `<option value="${reyon.id}" 
                      data-unit-type="${reyon.unit_type_name}" 
                      data-tax-rate="${reyon.tax_rate}"
                      data-store-type-id="${reyon.store_type_id}">
                ${reyon.name} (${reyon.unit_type_name})
            </option>`
        ).join('');

    console.log('🔍 Filtrelenmiş reyonlar:', filteredReyons.length, 'adet');
}

// ✅ REYON DEĞİŞİMİNDE KATEGORİLERİ FİLTRELE - DEBUG'LI
async handleReyonChange(reyonId) {
    try {
        console.log('🔍 Reyon değişti:', reyonId);
        console.log('🔍 Mevcut kategoriler:', this.categories?.length);
        
        if (!this.categories) {
            console.error('❌ Kategoriler yüklenmemiş');
            return;
        }

        const reyon = this.reyons.find(r => r.id === reyonId);
        const autoFillInfo = document.getElementById('autoFillInfo');
        const unitTypeDisplay = document.getElementById('unitTypeDisplay');
        const taxRateDisplay = document.getElementById('taxRateDisplay');
        const categorySelect = document.getElementById('productCategory');

        if (reyon) {
            // Otomatik bilgileri göster
            unitTypeDisplay.textContent = `Birim: ${reyon.unit_type_name}`;
            taxRateDisplay.textContent = `KDV: %${reyon.tax_rate}`;
            autoFillInfo.style.display = 'block';

            // Kategorileri reyon_id'ye göre filtrele
            const filteredCategories = this.categories.filter(cat => cat.reyon_id === reyonId);
            
            console.log('🔍 Filtrelenmiş kategoriler:', filteredCategories);
            
            categorySelect.innerHTML = '<option value="">Kategori Seçin</option>' +
                (filteredCategories.length > 0 
                    ? filteredCategories.map(cat => 
                        `<option value="${cat.id}">${cat.name}</option>`
                    ).join('')
                    : '<option value="">Bu reyon için kategori bulunamadı</option>'
                );

            console.log('✅ Filtrelenmiş kategoriler:', filteredCategories.length, 'adet');
        } else {
            autoFillInfo.style.display = 'none';
            categorySelect.innerHTML = '<option value="">Önce reyon seçin</option>';
        }
    } catch (error) {
        console.error('Reyon değişim hatası:', error);
    }
}    
// ✅ REYON'A GÖRE KATEGORİLERİ FİLTRELE
async filterCategoriesByReyon(reyonId) {
    const catSelect = document.getElementById('productCategory');
    
    if (!reyonId) {
        catSelect.innerHTML = '<option value="">Kategori Seçin</option>';
        return;
    }

    // Kategorileri reyon_id'ye göre filtrele
    const filteredCategories = this.allCategories.filter(category => 
        category.reyon_id === reyonId
    );

    catSelect.innerHTML = '<option value="">Kategori Seçin</option>' +
        filteredCategories.map(category => 
            `<option value="${category.id}">${category.name}</option>`
        ).join('');

    console.log('🔍 Filtrelenmiş kategoriler:', filteredCategories.length, 'adet');
    
    if (filteredCategories.length === 0) {
        console.warn('⚠️ Bu reyon için kategori bulunamadı');
    }
}
    
// ✅ YENİ ÜRÜN EKLEME - GÜNCELLENMİŞ
async addNewProduct() {
    try {
        console.log('🔍 Ürün ekleme başlıyor...');
        
        // Form değerlerini güvenli şekilde al
        const getValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.value.trim() : '';
        };

        const getNumber = (id) => {
            const element = document.getElementById(id);
            const value = element ? element.value : '';
            return value !== '' ? Number(value) : null;
        };

        // Tüm form değerlerini al
        const formData = {
            name: getValue('productName'),
            barcode: getValue('productBarcode') || null,
            price: getNumber('productPrice'),
            discountPrice: getNumber('productDiscountPrice'),
            stock: getNumber('productStock'),
            description: getValue('productDescription') || '',
            reyonId: getValue('productReyon'),
            categoryId: getValue('productCategory'),
            brandId: getValue('productBrand') || null
        };

        console.log('🔍 FORM DATA:', formData);

        // Validation
        if (!formData.name) {
            this.showAlert('❌ Ürün adı zorunludur!', 'error');
            return;
        }

        if (formData.price === null || isNaN(formData.price) || formData.price < 0) {
            this.showAlert('❌ Geçerli bir fiyat giriniz!', 'error');
            return;
        }

        if (formData.stock === null || isNaN(formData.stock) || formData.stock < 0) {
            this.showAlert('❌ Geçerli bir stok miktarı giriniz!', 'error');
            return;
        }

        if (!formData.reyonId) {
            this.showAlert('❌ Reyon seçimi zorunludur!', 'error');
            return;
        }

        if (!formData.categoryId) {
            this.showAlert('❌ Kategori seçimi zorunludur!', 'error');
            return;
        }

        // İlişkili tablo verilerini al
        const reyon = this.reyons.find(r => r.id === formData.reyonId);
        const category = this.categories.find(c => c.id === formData.categoryId);
        const brand = formData.brandId ? this.brands.find(b => b.id === formData.brandId) : null;

        if (!reyon || !category) {
            this.showAlert('❌ Geçersiz kategori veya reyon seçimi!', 'error');
            return;
        }

        // Mağaza türü kontrolü
        if (!this.sellerStoreTypeId || !this.sellerStoreTypeName) {
            this.showAlert('❌ Mağaza türü bulunamadı!', 'error');
            return;
        }

        console.log('🔍 İlişkili veriler:', {
            reyon,
            category,
            brand,
            storeType: this.sellerStoreTypeName
        });

        // ✅ PRODUCTS TABLOSU İÇİN VERİ
        const productData = {
            // Temel bilgiler
            name: formData.name,
            barcode: formData.barcode,
            price: formData.price,
            stock: formData.stock,
            description: formData.description,
            seller_id: this.userProfile.id,
            currency: 'TRY',
            is_active: true,
            
            // ✅ Satıcının mağaza türü
            store_id: this.sellerStoreTypeId,
            store_name: this.sellerStoreTypeName,
            
            // ✅ Kategori ilişkisi
            category_id: formData.categoryId,
            category_name: category.name,
            
            // ✅ Reyon ilişkisi
            reyon_id: formData.reyonId,
            reyon_name: reyon.name,
            unit_type: reyon.unit_type_name,
            tax_rate: reyon.tax_rate,
            
            // ✅ Marka ilişkisi
            brand_id: formData.brandId,
            brand_name: brand ? brand.name : null,
            
            // Timestamps
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };

        console.log('🔍 PRODUCT DATA:', productData);

        // 1. Önce products tablosuna ekle
        console.log('📦 Products tablosuna ekleniyor...');
        const { data: newProduct, error: productError } = await this.supabase
            .from('products')
            .insert([productData])
            .select()
            .single();

        if (productError) {
            console.error('❌ Products insert hatası:', productError);
            throw productError;
        }

        console.log('✅ Products tablosuna eklendi:', newProduct);

        // 2. Sonra product_prices tablosuna ekle
        console.log('💰 Product prices tablosuna ekleniyor...');
        const priceData = {
            product_id: newProduct.id,
            seller_id: this.userProfile.id,
            price: formData.price,
            discount_price: formData.discountPrice,
            stock: formData.stock,
            currency: 'TRY',
            created: new Date().toISOString(),
            updated: new Date().toISOString()
        };

        // Eğer centre_id varsa ekle
        if (this.sellerData?.centre_id) {
            priceData.centre_id = this.sellerData.centre_id;
        }

        const { error: priceError } = await this.supabase
            .from('product_prices')
            .insert([priceData]);

        if (priceError) {
            console.error('❌ Product prices insert hatası:', priceError);
            throw priceError;
        }

        console.log('✅ Product prices tablosuna eklendi');

        // Başarı mesajı ve temizlik
        this.showAlert('✅ Ürün başarıyla eklendi!', 'success');
        
        // Modalı kapat
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        // Ürün listesini yenile
        await this.loadProductsData();

    } catch (error) {
        console.error('❌ Ürün ekleme hatası:', error);
        this.showAlert('❌ Ürün eklenemedi: ' + error.message, 'error');
    }
}    
    
// ✅ ÜRÜN GÜNCELLEME - TEK FORM
async updateProduct(productId) {
    try {
        console.log('🔍 Ürün güncelleniyor:', productId);
        
        // Form değerlerini güvenli şekilde al
        const getValue = (id) => {
            const element = document.getElementById(id);
            return element ? element.value.trim() : '';
        };

        const getNumber = (id) => {
            const element = document.getElementById(id);
            const value = element ? element.value : '';
            return value !== '' ? Number(value) : null;
        };

        const getBoolean = (id) => {
            const element = document.getElementById(id);
            return element ? element.value === 'true' : true;
        };

        // Tüm form değerlerini al
        const formData = {
            name: getValue('productName'),
            barcode: getValue('productBarcode') || null,
            price: getNumber('productPrice'),
            discountPrice: getNumber('productDiscountPrice'),
            stock: getNumber('productStock'),
            description: getValue('productDescription') || '',
            reyonId: getValue('productReyon'),
            categoryId: getValue('productCategory'),
            brandId: getValue('productBrand') || null,
            isActive: getBoolean('productStatus')
        };

        console.log('🔍 GÜNCELLEME FORM DATA:', formData);

        // Validation (aynı ekleme ile)
        if (!formData.name) {
            this.showAlert('❌ Ürün adı zorunludur!', 'error');
            return;
        }

        if (formData.price === null || isNaN(formData.price) || formData.price < 0) {
            this.showAlert('❌ Geçerli bir fiyat giriniz!', 'error');
            return;
        }

        if (formData.stock === null || isNaN(formData.stock) || formData.stock < 0) {
            this.showAlert('❌ Geçerli bir stok miktarı giriniz!', 'error');
            return;
        }

        if (!formData.reyonId) {
            this.showAlert('❌ Reyon seçimi zorunludur!', 'error');
            return;
        }

        if (!formData.categoryId) {
            this.showAlert('❌ Kategori seçimi zorunludur!', 'error');
            return;
        }

        // İlişkili tablo verilerini al
        const reyon = this.reyons.find(r => r.id === formData.reyonId);
        const category = this.categories.find(c => c.id === formData.categoryId);
        const brand = formData.brandId ? this.brands.find(b => b.id === formData.brandId) : null;

        if (!reyon || !category) {
            this.showAlert('❌ Geçersiz kategori veya reyon seçimi!', 'error');
            return;
        }

        // ✅ PRODUCTS TABLOSU İÇİN GÜNCELLEME VERİSİ
        const productUpdateData = {
            // Temel bilgiler
            name: formData.name,
            barcode: formData.barcode,
            price: formData.price,
            stock: formData.stock,
            description: formData.description,
            is_active: formData.isActive,
            
            // Kategori ve reyon
            category_id: formData.categoryId,
            category_name: category.name,
            reyon_id: formData.reyonId,
            reyon_name: reyon.name,
            unit_type: reyon.unit_type_name,
            tax_rate: reyon.tax_rate,
            
            // Marka
            brand_id: formData.brandId,
            brand_name: brand ? brand.name : null,
            
            updated_at: new Date().toISOString()
        };

        console.log('🔍 PRODUCT UPDATE DATA:', productUpdateData);

        // 1. Products tablosunu güncelle
        console.log('📦 Products tablosu güncelleniyor...');
        const { error: productError } = await this.supabase
            .from('products')
            .update(productUpdateData)
            .eq('id', productId);

        if (productError) {
            console.error('❌ Products update hatası:', productError);
            throw productError;
        }

        console.log('✅ Products tablosu güncellendi');

        // 2. Product_prices tablosunu güncelle veya oluştur
        console.log('💰 Product prices güncelleniyor...');
        const priceUpdateData = {
            price: formData.price,
            discount_price: formData.discountPrice,
            stock: formData.stock,
            updated: new Date().toISOString()
        };

        // Mevcut price kaydını kontrol et
        const { data: existingPrice, error: priceCheckError } = await this.supabase
            .from('product_prices')
            .select('id')
            .eq('product_id', productId)
            .eq('seller_id', this.userProfile.id)
            .maybeSingle();

        if (priceCheckError) {
            console.error('❌ Price check hatası:', priceCheckError);
            throw priceCheckError;
        }

        if (existingPrice) {
            // Mevcut price kaydını güncelle
            const { error: priceUpdateError } = await this.supabase
                .from('product_prices')
                .update(priceUpdateData)
                .eq('id', existingPrice.id);

            if (priceUpdateError) throw priceUpdateError;
            console.log('✅ Mevcut price kaydı güncellendi');
        } else {
            // Yeni price kaydı oluştur
            const newPriceData = {
                product_id: productId,
                seller_id: this.userProfile.id,
                ...priceUpdateData,
                currency: 'TRY',
                created: new Date().toISOString()
            };

            // Eğer centre_id varsa ekle
            if (this.sellerData?.centre_id) {
                newPriceData.centre_id = this.sellerData.centre_id;
            }

            const { error: priceInsertError } = await this.supabase
                .from('product_prices')
                .insert([newPriceData]);

            if (priceInsertError) throw priceInsertError;
            console.log('✅ Yeni price kaydı oluşturuldu');
        }

        // Başarı mesajı ve temizlik
        this.showAlert('✅ Ürün başarıyla güncellendi!', 'success');
        
        // Modalı kapat
        const modal = document.querySelector('.modal-overlay');
        if (modal) {
            modal.remove();
        }
        
        // Ürün listesini yenile
        await this.loadProductsData();

    } catch (error) {
        console.error('❌ Ürün güncelleme hatası:', error);
        this.showAlert('❌ Ürün güncellenemedi: ' + error.message, 'error');
    }
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

// ✅ İSTATİSTİKLER - GÜNCELLENMİŞ VERSİYON
async loadSellerStats() {
    // Seller ID kontrolü - eğer hala yoksa tekrar dene
    if (!this.sellerData?.id) {
        console.error('❌ Seller ID hala yok, istatistikler yüklenemiyor');
        
        // 1 saniye bekle ve tekrar dene
        setTimeout(async () => {
            if (this.sellerData?.id) {
                await this.loadSellerStats();
            }
        }, 1000);
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    
    try {
        console.log('📊 İstatistikler yükleniyor, seller_id:', this.sellerData.id);
        
        // Bugünkü siparişler
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select('id, total_amount, status, created_at')
            .eq('seller_id', this.sellerData.id)
            .gte('created_at', today);

        if (error) {
            console.error('❌ İstatistik sorgu hatası:', error);
            return;
        }

        // Elementleri kontrol et
        const todayOrdersEl = document.getElementById('todayOrders');
        const todayRevenueEl = document.getElementById('todayRevenue');
        const pendingOrdersEl = document.getElementById('pendingOrders');
        const sellerRatingEl = document.getElementById('sellerRating');

        if (!todayOrdersEl || !todayRevenueEl || !pendingOrdersEl || !sellerRatingEl) {
            console.error('❌ İstatistik elementleri bulunamadı');
            return;
        }

        // Default değerleri sıfırla
        todayOrdersEl.textContent = '0';
        todayRevenueEl.textContent = '0 ₺';
        pendingOrdersEl.textContent = '0';
        sellerRatingEl.textContent = '0.0';

        if (orders && orders.length > 0) {
            todayOrdersEl.textContent = orders.length.toString();
            
            const todayRevenue = orders
                .filter(order => order.status !== 'cancelled')
                .reduce((sum, order) => sum + parseFloat(order.total_amount || 0), 0);
            todayRevenueEl.textContent = todayRevenue.toFixed(2) + ' ₺';

            const pendingOrders = orders.filter(order => 
                ['pending', 'confirmed', 'preparing'].includes(order.status)
            ).length;
            pendingOrdersEl.textContent = pendingOrders.toString();
        }

        // Average rating - farklı alan isimlerini dene
        try {
            // Önce performance_rating dene
            const { data: ratedOrders, error: ratingError } = await this.supabase
                .from('orders')
                .select('performance_rating')
                .eq('seller_id', this.sellerData.id)
                .not('performance_rating', 'is', null);

            if (!ratingError && ratedOrders && ratedOrders.length > 0) {
                const avgRating = ratedOrders.reduce((sum, order) => 
                    sum + parseFloat(order.performance_rating || 0), 0) / ratedOrders.length;
                sellerRatingEl.textContent = avgRating.toFixed(1);
            } else {
                // Sonra seller_rating dene
                const { data: sellerRatedOrders } = await this.supabase
                    .from('orders')
                    .select('seller_rating')
                    .eq('seller_id', this.sellerData.id)
                    .not('seller_rating', 'is', null);

                if (sellerRatedOrders && sellerRatedOrders.length > 0) {
                    const avgRating = sellerRatedOrders.reduce((sum, order) => 
                        sum + parseFloat(order.seller_rating || 0), 0) / sellerRatedOrders.length;
                    sellerRatingEl.textContent = avgRating.toFixed(1);
                } else {
                    // Rating yoksa varsayılan değer
                    sellerRatingEl.textContent = '0.0';
                }
            }
        } catch (ratingError) {
            console.log('⭐ Rating hesaplanamadı, varsayılan kullanılıyor');
            sellerRatingEl.textContent = '0.0';
        }

        console.log('✅ İstatistikler güncellendi');

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

        // Önce loading göster
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
                default:
                    console.warn('⚠️ Bilinmeyen section:', sectionName);
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
 
    // Diğer metodlar...
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

destroy() {
        if (this.realtimeSubscription) {
            this.supabase.removeChannel(this.realtimeSubscription);
        }
    }
}

// Global
window.SellerPanel = SellerPanel;

// Event listener
document.addEventListener('DOMContentLoaded', function() {
    if (window.userProfile?.role === 'seller' && !window.sellerPanel) {
        console.log('🔄 SellerPanel doğrudan başlatılıyor...');
        window.sellerPanel = new SellerPanel(window.userProfile);
    }
});

console.log('✅ seller-panel.js yüklendi - SELLER_ID SORUNU ÇÖZÜLDÜ');
