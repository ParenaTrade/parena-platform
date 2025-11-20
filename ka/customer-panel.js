class CustomerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.customerData = null;
        this.orders = [];
        this.payments = [];
        this.currentSection = '';
        this.isDataLoaded = false;
        
        // Referral özellikleri
        this.referralData = null;
        this.referralStats = null;
        this.referralEarnings = [];
        this.referralInvites = [];
        
        // Real-time özellikleri
        this.realtimeSubscription = null;
        this.updateInterval = null;
        
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('👤 CustomerPanel başlatılıyor - Müşteri Oturumu');
        
        if (!this.supabase) {
            console.error('❌ Supabase client bulunamadı!');
            this.supabase = window.supabase;
        }
        
        this.init();
    }

    async init() {
        await this.loadCustomerData();
        await this.loadReferralData();
        this.isDataLoaded = true;
        
        // Real-time güncellemeleri başlat
        this.startRealTimeUpdates();
        console.log('✅ CustomerPanel başlatma tamamlandı');
    }

    async loadCustomerData() {
        try {
            console.log('📥 Müşteri verisi yükleniyor...');
            
            if (!this.supabase) {
                console.error('❌ Supabase client yok!');
                this.customerData = {
                    id: this.userProfile.id,
                    name: this.userProfile.name,
                    phone: this.userProfile.phone,
                    bonus_balance: this.userProfile.bonus_balance || 0
                };
                return;
            }

            const { data, error } = await this.supabase
                .from('customers')
                .select('*')
                .eq('id', this.userProfile.id)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    console.warn('⚠️ Customers tablosunda kayıt bulunamadı');
                    this.customerData = {
                        id: this.userProfile.id,
                        name: this.userProfile.name,
                        phone: this.userProfile.phone,
                        bonus_balance: this.userProfile.bonus_balance || 0
                    };
                } else {
                    console.warn('⚠️ Müşteri sorgu hatası:', error);
                    throw error;
                }
            } else if (data) {
                this.customerData = data;
                console.log('✅ Müşteri verisi yüklendi:', data.name);
            }

        } catch (error) {
            console.error('❌ Müşteri verisi yükleme hatası:', error);
            this.customerData = {
                id: this.userProfile.id,
                name: this.userProfile.name,
                phone: this.userProfile.phone,
                bonus_balance: this.userProfile.bonus_balance || 0
            };
        }
    }

    async loadSectionData(sectionName) {
        this.currentSection = sectionName;
        
        console.log(`📂 Section yükleniyor: ${sectionName}`);
        
        if (!this.isDataLoaded) {
            console.log('⏳ Veri yükleniyor, bekleniyor...');
            await this.waitForData();
        }
        
        if (!this.supabase) {
            console.error('❌ Supabase client yok, section yüklenemiyor');
            this.showError(sectionName, 'Sistem hazır değil');
            return;
        }
        
        if (!this.customerData || !this.customerData.id) {
            console.error('❌ Müşteri verisi yok, section yüklenemiyor');
            this.showError(sectionName, 'Müşteri bilgileri yüklenemedi');
            return;
        }
        
        console.log(`✅ Section yükleniyor: ${sectionName}, Müşteri ID: ${this.customerData.id}`);
        
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
            case 'customerAddresses':
                await this.loadCustomerAddresses();
                break;
            case 'customerSupport':
                await this.loadCustomerSupport();
                break;
            // YENİ: Referral section'ları
            case 'customerReferral':
                await this.loadCustomerReferral();
                break;
            case 'referralEarnings':
                await this.loadReferralEarningsSection();
                break;
            case 'referralInvites':
                await this.loadReferralInvitesSection();
                break;
        }
    }

    async waitForData() {
        const maxWaitTime = 5000;
        const startTime = Date.now();
        
        while (!this.isDataLoaded && (Date.now() - startTime) < maxWaitTime) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        if (!this.isDataLoaded) {
            console.warn('⚠️ Veri yüklenme zaman aşımına uğradı');
        }
    }

    showError(sectionName, message) {
        const section = document.getElementById(`${sectionName}Section`);
        if (section) {
            section.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #ffc107; margin-bottom: 20px;"></i>
                    <h3>${message}</h3>
                    <p>Lütfen sayfayı yenileyin veya daha sonra tekrar deneyin.</p>
                    <button class="btn btn-primary" onclick="location.reload()">
                        <i class="fas fa-redo"></i> Sayfayı Yenile
                    </button>
                </div>
            `;
        }
    }

    async loadCustomerDashboard() {
        const section = document.getElementById('customerDashboardSection');
        if (!section) {
            console.error('❌ customerDashboardSection bulunamadı!');
            return;
        }

        const customerName = this.customerData?.name || 'Müşteri';

        section.innerHTML = `
            <h1>Hoş Geldiniz, ${customerName}!</h1>
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
                <div class="stat-card">
                    <div class="stat-icon info">
                        <i class="fas fa-user-friends"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${this.referralStats?.totalInvites || 0}</h3>
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
                            <div id="recentCustomerOrders">
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
                            <h3>Arkadaşını Davet Et</h3>
                            <a href="#" class="view-all" onclick="window.panelSystem.showSection('customerReferral')">Detaylar</a>
                        </div>
                        <div class="card-body">
                            <div class="referral-quick-info">
                                <div style="text-align: center; margin-bottom: 15px;">
                                    <i class="fas fa-gift" style="font-size: 48px; color: var(--primary); margin-bottom: 10px;"></i>
                                    <h4>Bonus Kazanma Fırsatı!</h4>
                                </div>
                                <p style="text-align: center; color: #666; margin-bottom: 15px;">
                                    Arkadaşlarını davet et, her davet için bonus puan kazan!
                                </p>
                                <button class="btn btn-primary" style="width: 100%;" onclick="window.panelSystem.showSection('customerReferral')">
                                    <i class="fas fa-share-alt"></i> Davet Etmeye Başla
                                </button>
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

            if (!this.customerData || !this.customerData.id) {
                console.error('❌ Müşteri ID yok!');
                return;
            }

            console.log(`🔍 Siparişler aranıyor, Müşteri ID: ${this.customerData.id}`);

            const { data: orders, error } = await this.supabase
                .from('orders')
                .select('id, status')
                .eq('customer_id', this.customerData.id);

            if (error) {
                console.error('❌ İstatistik sorgu hatası:', error);
                this.showDemoStats();
                return;
            }

            if (orders) {
                const totalOrders = orders.length;
                const pendingOrders = orders.filter(order => 
                    ['pending', 'confirmed', 'preparing', 'ready', 'on_the_way'].includes(order.status)
                ).length;

                document.getElementById('totalOrders').textContent = totalOrders;
                document.getElementById('pendingOrders').textContent = pendingOrders;
                
                console.log('✅ İstatistikler yüklendi:', { total: totalOrders, pending: pendingOrders });
            } else {
                console.log('ℹ️ Hiç sipariş bulunamadı');
                this.showDemoStats();
            }

        } catch (error) {
            console.error('❌ Müşteri istatistik yükleme hatası:', error);
            this.showDemoStats();
        }
    }

    showDemoStats() {
        document.getElementById('totalOrders').textContent = '0';
        document.getElementById('pendingOrders').textContent = '0';
        console.log('📊 Demo istatistikler gösteriliyor');
    }

    async loadRecentCustomerOrders() {
        try {
            console.log('📦 Son siparişler yükleniyor...');
            
            if (!this.supabase) {
                console.error('❌ Supabase client yok!');
                this.showNoOrdersMessage('Sistem hazır değil.');
                return;
            }

            if (!this.customerData || !this.customerData.id) {
                console.error('❌ Müşteri ID yok!');
                this.showNoOrdersMessage('Müşteri bilgisi bulunamadı.');
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
                    customer_name,
                    customer_phone,
                    courier_id,
                    estimated_delivery_time,
                    delivered_at
                `)
                .eq('customer_id', this.customerData.id)
                .order('created_at', { ascending: false })
                .limit(5);

            const container = document.getElementById('recentCustomerOrders');
            
            if (error) {
                console.error('❌ Sipariş sorgu hatası:', error);
                this.showNoOrdersMessage('Siparişler yüklenirken hata oluştu.');
                return;
            }

            if (!orders || orders.length === 0) {
                this.showNoOrdersMessage('Henüz siparişiniz bulunmuyor.');
                return;
            }

            container.innerHTML = orders.map(order => `
                <div class="order-item" style="border-bottom: 1px solid #eee; padding: 15px 0;">
                    <div class="order-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div>
                            <strong>Sipariş #${order.id.slice(-8)}</strong>
                            <div style="color: #666; font-size: 12px; margin-top: 2px;">
                                ${order.customer_name || 'Müşteri'}
                            </div>
                        </div>
                        <span class="status-badge status-${order.status}">
                            ${this.getStatusText(order.status)}
                        </span>
                    </div>
                    ${order.delivery_address ? `
                        <div style="color: #666; font-size: 12px; margin: 5px 0;">
                            <i class="fas fa-map-marker-alt"></i> ${order.delivery_address}
                        </div>
                    ` : ''}
                    
                    <!-- KURYE DURUMU -->
                    <div style="margin-top: 8px;">
                        ${this.renderDeliveryTracker(order)}
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
            this.showNoOrdersMessage('Siparişler yüklenirken hata oluştu.');
        }
    }

    showNoOrdersMessage(message = 'Henüz siparişiniz bulunmuyor.') {
        const container = document.getElementById('recentCustomerOrders');
        if (container) {
            container.innerHTML = `<p class="text-muted">${message}</p>`;
        }
    }

    // KURYE TAKİP SİSTEMİ - ENTEGRE FONKSİYONLAR

    async loadCustomerOrders() {
        const section = document.getElementById('customerOrdersSection');
        if (!section) return;

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
                    <input type="date" id="orderDateFilter" class="form-control">
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
        
        document.getElementById('orderStatusFilter').addEventListener('change', (e) => {
            this.filterOrders(e.target.value);
        });

        document.getElementById('orderDateFilter').addEventListener('change', (e) => {
            this.filterOrdersByDate(e.target.value);
        });
    }

    async loadAllCustomerOrders() {
        try {
            console.log('📋 Tüm siparişler yükleniyor...');
            
            if (!this.supabase || !this.customerData || !this.customerData.id) {
                const container = document.getElementById('customerOrdersList');
                container.innerHTML = '<p class="text-muted">Sistem hazır değil.</p>';
                return;
            }

            const { data: orders, error } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    order_details(*),
                    seller:seller_profiles(business_name, phone)   
                `)
                .eq('customer_id', this.customerData.id)
                .order('created_at', { ascending: false });

            if (error) {
                console.error('❌ Siparişler sorgu hatası:', error);
                throw error;
            }
        
            // Courier bilgilerini order'a ekle
            this.orders = (orders || []).map(order => ({
                ...order,
                courier_name: order.courier?.name,
                courier_phone: order.courier?.phone,
                courier_vehicle_type: order.courier?.vehicle_type
            }));
            
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
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-shopping-bag" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>Henüz siparişiniz bulunmuyor</h3>
                    <p>İlk siparişinizi vermek için alışverişe başlayın!</p>
                </div>
            `;
            return;
        }

        container.innerHTML = orders.map((order, index) => {
            const sellerName = order.seller && order.seller.business_name ? order.seller.business_name : 'Satıcı';
            const deliveryAddress = order.delivery_address || '';
            const orderDetails = order.order_details || [];
            
            return `
            <div class="order-card" style="border: 1px solid #e1e5e9; border-radius: 8px; margin-bottom: 15px; overflow: hidden;">
                <div class="order-summary" 
                     style="padding: 20px; cursor: pointer; background: #f8f9fa;"
                     data-order-id="${order.id}">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
                                <strong style="font-size: 16px;">Sipariş #${order.id.slice(-8)}</strong>
                                <span class="status-badge status-${order.status}">
                                    ${this.getStatusText(order.status)}
                                </span>
                            </div>
                            
                            <div style="color: #666; font-size: 14px; margin-bottom: 5px;">
                                <i class="fas fa-store" style="margin-right: 5px;"></i>
                                ${sellerName}
                            </div>
                            
                            ${deliveryAddress ? `
                                <div style="color: #666; font-size: 12px;">
                                    <i class="fas fa-map-marker-alt" style="margin-right: 5px;"></i> 
                                    ${deliveryAddress}
                                </div>
                            ` : ''}

                            <!-- KURYE DURUMU GÖSTERGESİ -->
                            <div class="delivery-tracker" style="margin-top: 10px;">
                                ${this.renderDeliveryTracker(order)}
                            </div>
                        </div>
                        
                        <div style="text-align: right;">
                            <div style="font-size: 18px; font-weight: bold; color: var(--primary); margin-bottom: 5px;">
                                ${parseFloat(order.total_amount || 0).toFixed(2)} ₺
                            </div>
                            <div style="color: #666; font-size: 12px;">
                                ${new Date(order.created_at).toLocaleDateString('tr-TR')}
                            </div>
                            <div style="margin-top: 8px;">
                                <i class="fas fa-chevron-down" id="chevron-${order.id}" 
                                   style="transition: transform 0.3s ease;"></i>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="order-details" id="details-${order.id}" 
                     style="display: none; padding: 0 20px 20px 20px; background: white;">
                    
                    ${orderDetails.length > 0 ? `
                        <div style="margin: 15px 0;">
                            <h4 style="margin-bottom: 10px; color: #333; font-size: 14px;">
                                <i class="fas fa-list" style="margin-right: 8px;"></i>
                                Sipariş İçeriği
                            </h4>
                            <div class="order-items">
                                ${orderDetails.map(item => {
                                    const unitPrice = parseFloat(item.unit_price || 0).toFixed(2);
                                    const discount = parseFloat(item.discount || 0).toFixed(2);
                                    const totalPrice = parseFloat(item.total_price || 0).toFixed(2);
                                    const quantity = item.quantity || 0;
                                    
                                    return `
                                    <div style="display: flex; justify-content: space-between; padding: 10px; 
                                             background: #f8f9fa; border-radius: 6px; margin-bottom: 8px;">
                                        <div style="flex: 1;">
                                            <div style="font-weight: 500; margin-bottom: 4px;">${item.product_name || 'Ürün'}</div>
                                            <div style="font-size: 12px; color: #666;">
                                                ${quantity} adet × ${unitPrice} ₺
                                                ${item.discount > 0 ? 
                                                    `<span style="color: var(--success); margin-left: 8px;">
                                                        -${discount} ₺ indirim
                                                    </span>` : ''}
                                            </div>
                                        </div>
                                        <div style="font-weight: bold; color: var(--primary);">
                                            ${totalPrice} ₺
                                        </div>
                                    </div>
                                    `;
                                }).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    <!-- KURYE TAKİP DETAYLARI -->
                    <div style="margin: 15px 0;">
                        <h4 style="margin-bottom: 10px; color: #333; font-size: 14px;">
                            <i class="fas fa-motorcycle" style="margin-right: 8px;"></i>
                            Kurye Takibi
                        </h4>
                        ${this.renderCourierDetails(order)}
                    </div>
                    
                    <!-- SİPARİŞ BİLGİLERİ -->
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin: 15px 0;">
                        <div>
                            <h4 style="margin-bottom: 8px; color: #333; font-size: 14px;">
                                <i class="fas fa-info-circle" style="margin-right: 8px;"></i>
                                Sipariş Bilgileri
                            </h4>
                            <div style="font-size: 13px; color: #666;">
                                <div style="margin-bottom: 4px;">
                                    <strong>Sipariş Tarihi:</strong> 
                                    ${new Date(order.created_at).toLocaleString('tr-TR')}
                                </div>
                                <div style="margin-bottom: 4px;">
                                    <strong>Ödeme Yöntemi:</strong> 
                                    ${order.payment_method ? this.getPaymentMethodText(order.payment_method) : 'Belirtilmemiş'}
                                </div>
                                ${order.customer_notes ? `
                                    <div style="margin-top: 8px; padding: 8px; background: #fff3cd; border-radius: 4px;">
                                        <strong>Notunuz:</strong> ${order.customer_notes}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                        
                        <div>
                            <h4 style="margin-bottom: 8px; color: #333; font-size: 14px;">
                                <i class="fas fa-shipping-fast" style="margin-right: 8px;"></i>
                                Teslimat Bilgileri
                            </h4>
                            <div style="font-size: 13px; color: #666;">
                                ${order.courier_id || order.courier_name ? `
                                    <div style="color: var(--success); margin-bottom: 4px;">
                                        <i class="fas fa-motorcycle"></i> 
                                        <strong>Kurye:</strong> ${order.courier_name || 'Atandı'}
                                    </div>
                                ` : `
                                    <div style="color: var(--warning); margin-bottom: 4px;">
                                        <i class="fas fa-clock"></i> 
                                        <strong>Kurye:</strong> Aranıyor
                                    </div>
                                `}
                                
                                ${order.delivery_address ? `
                                    <div style="margin-bottom: 4px;">
                                        <strong>Adres:</strong> ${order.delivery_address}
                                    </div>
                                ` : ''}
                                
                                ${order.estimated_delivery_time ? `
                                    <div style="margin-bottom: 4px;">
                                        <strong>Tahmini Teslimat:</strong> 
                                        ${new Date(order.estimated_delivery_time).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                                    </div>
                                ` : ''}
                            </div>
                        </div>
                    </div>

                    <!-- İPTAL DURUMU -->
                    ${order.cancellation_requested ? `
                        <div style="margin: 15px 0; padding: 12px; background: #fff3cd; border-radius: 6px;">
                            <div style="display: flex; align-items: center; gap: 8px; color: var(--warning);">
                                <i class="fas fa-exclamation-triangle"></i>
                                <strong>İptal Talebiniz İnceleniyor</strong>
                            </div>
                            ${order.cancellation_reason ? `
                                <div style="margin-top: 8px; font-size: 13px;">
                                    <strong>İptal Nedeni:</strong> ${order.cancellation_reason}
                                </div>
                            ` : ''}
                        </div>
                    ` : ''}
                    
                    <!-- GERÇEK ZAMANLI GÜNCELLEME BUTONU -->
                    <div style="display: flex; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e1e5e9;">
                        <button class="btn btn-sm btn-outline-primary" onclick="customerPanel.refreshOrderStatus('${order.id}')">
                            <i class="fas fa-sync-alt"></i> Durumu Güncelle
                        </button>
                        
                        ${order.status === 'delivered' ? `
                            <button class="btn btn-sm btn-success" onclick="customerPanel.rateOrder('${order.id}')">
                                <i class="fas fa-star"></i> Değerlendir
                            </button>
                        ` : ''}
                        
                        ${order.status === 'pending' ? `
                            ${order.cancellation_requested ? `
                                <button class="btn btn-sm btn-secondary" onclick="customerPanel.viewCancellationStatus('${order.id}')">
                                    <i class="fas fa-info-circle"></i> İptal Durumu
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-warning" onclick="customerPanel.cancelOrder('${order.id}')">
                                    <i class="fas fa-times"></i> İptal Talebi
                                </button>
                            `}
                        ` : ''}
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Event listener'ları ekle
        this.attachOrderEventListeners();
    }

        // KURYE DURUMU GÖSTERGESİ - SADECE HATA DÜZELTİLDİ
    renderDeliveryTracker(order) {
        const status = order.status;
        const hasCourier = order.courier_id || order.courier_name;
        const courierName = order.courier_name || 'Kurye';
        
        let trackerHTML = '';
        
        switch(status) {
            case 'pending':
                trackerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; color: #856404;">
                        <i class="fas fa-clock" style="font-size: 16px;"></i>
                        <div>
                            <div style="font-size: 13px; font-weight: 600;">Sipariş Alındı</div>
                            <div style="font-size: 11px; color: #666;">Satıcı onay bekleniyor</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'confirmed':
                trackerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; color: #0c5460;">
                        <i class="fas fa-check-circle" style="font-size: 16px;"></i>
                        <div>
                            <div style="font-size: 13px; font-weight: 600;">Sipariş Onaylandı</div>
                            <div style="font-size: 11px; color: #666;">Hazırlanmaya başlandı</div>
                        </div>
                    </div>
                `;
                break;
                
            case 'preparing':
                if (hasCourier) {
                    trackerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px; color: #0c5460;">
                            <i class="fas fa-user-check" style="font-size: 16px;"></i>
                            <div>
                                <div style="font-size: 13px; font-weight: 600;">Kurye Atandı</div>
                                <div style="font-size: 11px; color: #666;">${courierName} mağazaya geliyor</div>
                            </div>
                        </div>
                    `;
                } else {
                    trackerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px; color: #856404;">
                            <i class="fas fa-utensils" style="font-size: 16px;"></i>
                            <div>
                                <div style="font-size: 13px; font-weight: 600;">Hazırlanıyor</div>
                                <div style="font-size: 11px; color: #666;">Kurye aranıyor</div>
                            </div>
                        </div>
                    `;
                }
                break;
                
            case 'ready':
                if (hasCourier) {
                    trackerHTML = `
                        <div style="display: flex; align-items: center; gap: 12px; color: #155724;">
                            <div class="moto-container" style="position: relative; width: 80px; height: 25px; display: flex; align-items: center;">
                                <i class="fas fa-store" style="position: absolute; left: 0; font-size: 14px; color: #28a745;"></i>
                                <i class="fas fa-motorcycle" style="position: absolute; left: 40px; font-size: 16px; color: #007bff;"></i>
                                <div style="position: absolute; bottom: 8px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent 0%, #dee2e6 50%, transparent 100%);"></div>
                            </div>
                            <div>
                                <div style="font-size: 13px; font-weight: 600;">Kurye Mağazada</div>
                                <div style="font-size: 11px; color: #666;">${courierName} paketi aldı</div>
                            </div>
                        </div>
                    `;
                } else {
                    trackerHTML = `
                        <div style="display: flex; align-items: center; gap: 10px; color: #856404;">
                            <i class="fas fa-clock" style="font-size: 16px;"></i>
                            <div>
                                <div style="font-size: 13px; font-weight: 600;">Kurye Bekleniyor</div>
                                <div style="font-size: 11px; color: #666;">Siparişiniz hazır</div>
                            </div>
                        </div>
                    `;
                }
                break;
                
            case 'on_the_way':
                trackerHTML = `
                    <div style="display: flex; align-items: center; gap: 12px; color: #004085;">
                        <div class="moto-container" style="position: relative; width: 80px; height: 25px; display: flex; align-items: center;">
                            <i class="fas fa-map-marker-alt" style="position: absolute; right: 0; font-size: 14px; color: #dc3545;"></i>
                            <i class="fas fa-motorcycle" style="position: absolute; left: 20px; font-size: 16px; color: #007bff; animation: moveMoto 2s infinite;"></i>
                            <div style="position: absolute; bottom: 8px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent 0%, #dee2e6 50%, transparent 100%);"></div>
                        </div>
                        <div>
                            <div style="font-size: 13px; font-weight: 600;">Kurye Yolda</div>
                            <div style="font-size: 11px; color: #666;">${courierName} adresinize geliyor</div>
                        </div>
                    </div>
                    <style>
                        @keyframes moveMoto {
                            0% { left: 20px; }
                            50% { left: 40px; }
                            100% { left: 20px; }
                        }
                    </style>
                `;
                break;
                
            case 'delivered':
                const deliveryTime = order.delivered_at ? 
                    `${new Date(order.delivered_at).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}` : 
                    '';
                    
                trackerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; color: #155724;">
                        <i class="fas fa-check-circle" style="font-size: 16px;"></i>
                        <div>
                            <div style="font-size: 13px; font-weight: 600;">Teslim Edildi</div>
                            <div style="font-size: 11px; color: #666;">
                                ${deliveryTime ? `${deliveryTime} • ${courierName}` : `${courierName} teslim etti`}
                            </div>
                        </div>
                    </div>
                `;
                break;
                
            default:
                trackerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; color: #6c757d;">
                        <i class="fas fa-info-circle" style="font-size: 16px;"></i>
                        <div>
                            <div style="font-size: 13px; font-weight: 600;">${this.getStatusText(status)}</div>
                            <div style="font-size: 11px; color: #666;">Sipariş durumu</div>
                        </div>
                    </div>
                `;
        }
        
        return trackerHTML;
    }

    // KURYE DETAYLARI - SADECE HATA DÜZELTİLDİ
    renderCourierDetails(order) {
        if (!order.courier_id && !order.courier_name) {
            return `
                <div style="text-align: center; padding: 20px; background: #f8f9fa; border-radius: 6px;">
                    <i class="fas fa-motorcycle" style="font-size: 32px; color: #6c757d; margin-bottom: 10px;"></i>
                    <div style="color: #666; font-size: 14px;">
                        <strong>Kurye aranıyor...</strong>
                        <p style="margin: 5px 0 0 0; font-size: 12px;">Sipariş onaylandıktan sonra kurye atanacak</p>
                    </div>
                </div>
            `;
        }

        const courierName = order.courier_name || 'Kurye';
        const courierPhone = order.courier_phone || 'Belirtilmemiş';
        const vehicleType = order.courier_vehicle_type || 'Motor';
        
        return `
            <div style="background: #f8f9fa; border-radius: 6px; padding: 15px;">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 10px;">
                    <div style="width: 40px; height: 40px; background: var(--primary); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white;">
                        <i class="fas fa-motorcycle"></i>
                    </div>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; font-size: 14px;">${courierName}</div>
                        <div style="color: #666; font-size: 12px;">${vehicleType}</div>
                    </div>
                    ${courierPhone !== 'Belirtilmemiş' ? `
                        <a href="tel:${courierPhone}" class="btn btn-sm btn-outline-primary">
                            <i class="fas fa-phone"></i> Ara
                        </a>
                    ` : ''}
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 12px;">
                    <div>
                        <strong>Durum:</strong> ${this.getStatusText(order.status)}
                    </div>
                    <div>
                        <strong>Araç:</strong> ${vehicleType}
                    </div>
                    ${order.estimated_delivery_time ? `
                        <div style="grid-column: 1 / -1;">
                            <strong>Tahmini Varış:</strong> 
                            ${new Date(order.estimated_delivery_time).toLocaleTimeString('tr-TR', {hour: '2-digit', minute:'2-digit'})}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }
    // GERÇEK ZAMANLI GÜNCELLEME
    startRealTimeUpdates() {
        // Her 30 saniyede bir sipariş durumlarını güncelle
        this.updateInterval = setInterval(async () => {
            if (this.currentSection === 'customerOrders') {
                await this.loadAllCustomerOrders();
                console.log('🔄 Sipariş durumları güncellendi');
            }
        }, 30000);
    }

    // SİPARİŞ DURUMU GÜNCELLE
    async refreshOrderStatus(orderId) {
        try {
            console.log('🔄 Sipariş durumu güncelleniyor:', orderId);
            
            const { data: order, error } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    order_details(*),
                    seller:seller_profiles(business_name, phone)
                `)
                .eq('id', orderId)
                .single();

            if (error) throw error;

            // Siparişi güncelle
            const updatedOrder = {
                ...order,
                courier_name: order.courier?.name,
                courier_phone: order.courier?.phone,
                courier_vehicle_type: order.courier?.vehicle_type
            };

            const orderIndex = this.orders.findIndex(o => o.id === orderId);
            if (orderIndex !== -1) {
                this.orders[orderIndex] = updatedOrder;
            }

            // UI'ı güncelle
            this.renderCustomerOrders(this.orders);
            
            window.panelSystem.showAlert('Sipariş durumu güncellendi!', 'success');

        } catch (error) {
            console.error('❌ Sipariş durumu güncelleme hatası:', error);
            window.panelSystem.showAlert('Durum güncellenemedi!', 'error');
        }
    }

    // SİPARİŞ İPTAL
    async cancelOrder(orderId) {
        try {
            const reason = prompt('İptal talebiniz için neden belirtin:');
            if (!reason || reason.trim() === '') {
                alert('İptal nedeni boş olamaz.');
                return;
            }

            console.log('📝 İptal talebi oluşturuluyor:', orderId, reason);

            const { error } = await this.supabase
                .from('orders')
                .update({
                    cancellation_requested: true,
                    cancellation_reason: reason,
                    cancellation_requested_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert('İptal talebiniz alındı. Satıcı onayı bekleniyor.', 'success');
            await this.loadAllCustomerOrders();

        } catch (error) {
            console.error('❌ İptal talebi hatası:', error);
            window.panelSystem.showAlert('İptal talebi oluşturulamadı!', 'error');
        }
    }

    // İPTAL DURUMU GÖRÜNTÜLE
    async viewCancellationStatus(orderId) {
        try {
            const { data: order, error } = await this.supabase
                .from('orders')
                .select('cancellation_reason, cancellation_requested_at, status')
                .eq('id', orderId)
                .single();

            if (error) throw error;

            let message = `İptal Talebi Durumu:\n\n`;
            message += `Talep Tarihi: ${new Date(order.cancellation_requested_at).toLocaleString('tr-TR')}\n`;
            message += `İptal Nedeni: ${order.cancellation_reason}\n`;
            message += `Mevcut Durum: ${this.getStatusText(order.status)}\n\n`;
            message += `İptal talebiniz satıcı tarafından inceleniyor.`;

            alert(message);

        } catch (error) {
            console.error('❌ İptal durumu sorgulama hatası:', error);
            window.panelSystem.showAlert('İptal durumu görüntülenemedi!', 'error');
        }
    }

    // SİPARİŞ DEĞERLENDİR
    async rateOrder(orderId) {
        const rating = prompt('Siparişi 1-5 arasında değerlendirin:');
        if (!rating || rating < 1 || rating > 5) {
            alert('Lütfen 1-5 arasında bir değer girin.');
            return;
        }

        const comment = prompt('Değerlendirme yorumunuz (isteğe bağlı):');

        try {
            const { error } = await this.supabase
                .from('orders')
                .update({
                    performance_rating: parseFloat(rating),
                    rating_comment: comment,
                    rated_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert('Değerlendirmeniz kaydedildi!', 'success');
            await this.loadAllCustomerOrders();

        } catch (error) {
            console.error('Değerlendirme hatası:', error);
            window.panelSystem.showAlert('Değerlendirme kaydedilemedi!', 'error');
        }
    }

    attachOrderEventListeners() {
        const orderSummaries = document.querySelectorAll('.order-summary');
        
        orderSummaries.forEach(summary => {
            summary.addEventListener('click', (e) => {
                const orderId = e.currentTarget.getAttribute('data-order-id');
                this.toggleOrderDetails(orderId);
            });
        });
    }

    toggleOrderDetails(orderId) {
        const detailsElement = document.getElementById(`details-${orderId}`);
        const chevronElement = document.getElementById(`chevron-${orderId}`);
        
        if (detailsElement && chevronElement) {
            if (detailsElement.style.display === 'none' || !detailsElement.style.display) {
                detailsElement.style.display = 'block';
                chevronElement.style.transform = 'rotate(180deg)';
            } else {
                detailsElement.style.display = 'none';
                chevronElement.style.transform = 'rotate(0deg)';
            }
        }
    }

    filterOrders(status) {
        if (!status) {
            this.renderCustomerOrders(this.orders);
            return;
        }
        
        const filteredOrders = this.orders.filter(order => order.status === status);
        this.renderCustomerOrders(filteredOrders);
    }

    filterOrdersByDate(date) {
        if (!date) {
            this.renderCustomerOrders(this.orders);
            return;
        }
        
        const filteredOrders = this.orders.filter(order => 
            order.created_at.startsWith(date)
        );
        this.renderCustomerOrders(filteredOrders);
    }


    
    // DİĞER FONKSİYONLAR (loadCustomerProfile, loadCustomerPayments, vb.) BURAYA GELECEK

        async loadCustomerProfile() {
        const section = document.getElementById('customerProfileSection');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2>Profil Bilgilerim</h2>
            </div>
            <div class="card">
                <div class="card-body">
                    <form id="customerProfileForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="customerName">Ad Soyad *</label>
                                <input type="text" id="customerName" class="form-control" 
                                       value="${this.customerData?.name || ''}" required>
                            </div>
                            <div class="form-group">
                                <label for="customerPhone">Telefon</label>
                                <input type="text" id="customerPhone" class="form-control" 
                                       value="${this.customerData?.phone || ''}" readonly>
                                <small class="text-muted">Telefon numarası değiştirilemez</small>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="customerEmail">E-posta</label>
                                <input type="email" id="customerEmail" class="form-control" 
                                       value="${this.customerData?.email || ''}" 
                                       placeholder="ornek@email.com">
                            </div>
                            <div class="form-group">
                                <label for="customerBonus">Bonus Bakiyesi</label>
                                <input type="text" id="customerBonus" class="form-control" 
                                       value="${this.customerData?.bonus_balance || 0} ₺" readonly>
                            </div>
                        </div>
                        
                        <div class="form-row">
                            <div class="form-group">
                                <label for="customerCity">Şehir</label>
                                <input type="text" id="customerCity" class="form-control" 
                                       value="${this.customerData?.city || ''}" 
                                       placeholder="İstanbul">
                            </div>
                            <div class="form-group">
                                <label for="customerDistrict">İlçe</label>
                                <input type="text" id="customerDistrict" class="form-control" 
                                       value="${this.customerData?.district || ''}" 
                                       placeholder="Kadıköy">
                            </div>
                        </div>
                        
                        <div class="form-group">
                            <label for="customerAddress">Adres</label>
                            <textarea id="customerAddress" class="form-control" rows="3" 
                                      placeholder="Örnek Mah. Test Sok. No:1 Daire:2">${this.customerData?.address || ''}</textarea>
                        </div>
                        
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Bilgileri Güncelle
                        </button>
                    </form>
                </div>
            </div>
        `;

        const form = document.getElementById('customerProfileForm');
        if (form) {
            form.addEventListener('submit', (e) => this.updateCustomerProfile(e));
        }
    }

    async updateCustomerProfile(e) {
        e.preventDefault();
        
        const name = document.getElementById('customerName').value;
        const email = document.getElementById('customerEmail').value;
        const address = document.getElementById('customerAddress').value;
        const city = document.getElementById('customerCity').value;
        const district = document.getElementById('customerDistrict').value;

        try {
            const { error } = await this.supabase
                .from('customers')
                .update({
                    name: name,
                    email: email,
                    address: address,
                    city: city,
                    district: district,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.customerData.id);

            if (error) throw error;

            window.panelSystem.showAlert('Profil bilgileriniz güncellendi!', 'success');
            
            this.customerData.name = name;
            this.customerData.email = email;
            this.customerData.address = address;
            this.customerData.city = city;
            this.customerData.district = district;

        } catch (error) {
            console.error('Profil güncelleme hatası:', error);
            window.panelSystem.showAlert('Profil güncellenemedi!', 'error');
        }
    }

    async loadCustomerPayments() {
        const section = document.getElementById('customerPaymentsSection');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2>Ödeme Geçmişim</h2>
                <div class="header-actions">
                    <select id="paymentStatusFilter" class="form-control">
                        <option value="">Tüm Ödemeler</option>
                        <option value="completed">Tamamlanan</option>
                        <option value="pending">Bekleyen</option>
                        <option value="failed">Başarısız</option>
                        <option value="refunded">İade Edilen</option>
                    </select>
                    <select id="paymentMethodFilter" class="form-control">
                        <option value="">Tüm Yöntemler</option>
                        <option value="cash">Nakit</option>
                        <option value="card">Kart</option>
                        <option value="bonus">Bonus</option>
                        <option value="mixed">Karma</option>
                    </select>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div id="customerPaymentsContent">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Ödemeler yükleniyor...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadCustomerPaymentsData();
        
        document.getElementById('paymentStatusFilter').addEventListener('change', (e) => {
            this.filterPaymentsByStatus(e.target.value);
        });

        document.getElementById('paymentMethodFilter').addEventListener('change', (e) => {
            this.filterPaymentsByMethod(e.target.value);
        });
    }

    async loadCustomerPaymentsData() {
        try {
            console.log('💳 Müşteri ödemeleri yükleniyor...');
            
            if (!this.supabase || !this.customerData || !this.customerData.id) {
                this.showNoPaymentsMessage('Sistem hazır değil.');
                return;
            }

            const { data: payments, error } = await this.supabase
                .from('customer_payments')
                .select('*')
                .eq('customer_id', this.customerData.id)
                .order('payment_date', { ascending: false });

            if (error) {
                console.error('❌ Ödemeler sorgu hatası:', error);
                this.showNoPaymentsMessage('Ödemeler yüklenirken hata oluştu.');
                return;
            }

            this.payments = payments || [];
            this.renderCustomerPayments(this.payments);
            console.log('✅ Ödemeler yüklendi:', this.payments.length);

        } catch (error) {
            console.error('❌ Ödemeler yükleme hatası:', error);
            this.showNoPaymentsMessage('Ödemeler yüklenirken hata oluştu.');
        }
    }

    renderCustomerPayments(payments) {
        const container = document.getElementById('customerPaymentsContent');
        
        if (!payments || !payments.length) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-credit-card" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>Henüz ödeme kaydınız bulunmuyor</h3>
                    <p>Ödeme geçmişiniz burada görünecek.</p>
                </div>
            `;
            return;
        }

        const totalAmount = payments.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
        const completedPayments = payments.filter(p => p.status === 'completed').length;

        container.innerHTML = `
            <div class="stats-grid" style="margin-bottom: 25px;">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-receipt"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${payments.length}</h3>
                        <p>Toplam Ödeme</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-check-circle"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${completedPayments}</h3>
                        <p>Tamamlanan</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3>${totalAmount.toFixed(2)} ₺</h3>
                        <p>Toplam Tutar</p>
                    </div>
                </div>
            </div>

            <div class="table-responsive">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Tarih</th>
                            <th>Sipariş No</th>
                            <th>Yöntem</th>
                            <th>Tür</th>
                            <th>Toplam</th>
                            <th>Bonus</th>
                            <th>Nakit</th>
                            <th>Kart</th>
                            <th>Durum</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${payments.map(payment => {
                            const orderNumber = payment.order_id ? 
                                `Sipariş #${payment.order_id.slice(-8)}` : 
                                `Ödeme #${payment.id.slice(-8)}`;
                            
                            const totalAmount = payment.order?.total_amount || payment.amount || 0;
                            
                            return `
                            <tr>
                                <td>
                                    <div>${new Date(payment.payment_date).toLocaleDateString('tr-TR')}</div>
                                    <small style="color: #666;">${new Date(payment.payment_date).toLocaleTimeString('tr-TR')}</small>
                                </td>
                                <td>${orderNumber}</td>
                                <td>
                                    <span class="payment-method-badge method-${payment.payment_method}">
                                        ${this.getPaymentMethodText(payment.payment_method)}
                                    </span>
                                </td>
                                <td>${this.getPaymentTypeText(payment.payment_type)}</td>
                                <td style="font-weight: bold; color: var(--primary);">
                                    ${parseFloat(totalAmount).toFixed(2)} ₺
                                </td>
                                <td>${parseFloat(payment.bonus_used || 0).toFixed(2)} ₺</td>
                                <td>${parseFloat(payment.cash_amount || 0).toFixed(2)} ₺</td>
                                <td>${parseFloat(payment.card_amount || 0).toFixed(2)} ₺</td>
                                <td>
                                    <span class="status-badge status-${payment.status}">
                                        ${this.getPaymentStatusText(payment.status)}
                                    </span>
                                </td>
                            </tr>
                            `;
                        }).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    filterPaymentsByStatus(status) {
        if (!status) {
            this.renderCustomerPayments(this.payments);
            return;
        }
        
        const filteredPayments = this.payments.filter(payment => payment.status === status);
        this.renderCustomerPayments(filteredPayments);
    }

    filterPaymentsByMethod(method) {
        if (!method) {
            this.renderCustomerPayments(this.payments);
            return;
        }
        
        const filteredPayments = this.payments.filter(payment => payment.payment_method === method);
        this.renderCustomerPayments(filteredPayments);
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
                    <div id="customerAddressesList">
                        <div class="loading-spinner">
                            <i class="fas fa-spinner fa-spin"></i>
                            <p>Adresler yükleniyor...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadCustomerAddressesData();
        
        document.getElementById('addAddressBtn').addEventListener('click', () => {
            this.showAddAddressModal();
        });
    }

    async loadCustomerAddressesData() {
        try {
            console.log('🏠 Müşteri adres bilgileri yükleniyor...');
            
            if (!this.customerData) {
                this.showNoAddressMessage();
                return;
            }

            const addressData = {
                id: this.customerData.id,
                title: 'Ana Adres',
                address: this.customerData.address || '',
                city: this.customerData.city || '',
                district: this.customerData.district || '',
                is_default: true
            };

            this.renderCustomerAddresses([addressData]);
            console.log('✅ Adres bilgileri yüklendi');

        } catch (error) {
            console.error('❌ Adres bilgileri yükleme hatası:', error);
            this.showNoAddressMessage();
        }
    }

    renderCustomerAddresses(addresses) {
        const container = document.getElementById('customerAddressesList');
        
        const mainAddress = addresses[0];
        
        if (!mainAddress?.address) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-map-marker-alt" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                    <h3>Ana Adresiniz Bulunmuyor</h3>
                    <p>Ana adresinizi profil sayfasından ekleyebilirsiniz.</p>
                    <button class="btn btn-primary" onclick="window.panelSystem.showSection('customerProfile')">
                        <i class="fas fa-user-edit"></i> Profili Düzenle
                    </button>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div class="address-card" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                    <div style="flex: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px;">
                            <strong style="font-size: 16px;">${mainAddress.title}</strong>
                            <span class="badge badge-primary" style="background: var(--primary); color: white; padding: 4px 10px; border-radius: 12px; font-size: 11px;">Varsayılan</span>
                        </div>
                        
                        <div style="color: #666; font-size: 14px; margin-bottom: 8px;">
                            <i class="fas fa-map-marker-alt" style="margin-right: 8px; color: var(--primary);"></i>
                            ${mainAddress.address}
                        </div>
                        
                        ${mainAddress.district || mainAddress.city ? `
                            <div style="color: #888; font-size: 13px;">
                                <i class="fas fa-location-dot" style="margin-right: 5px;"></i>
                                ${mainAddress.district ? `${mainAddress.district}` : ''}${mainAddress.district && mainAddress.city ? ', ' : ''}${mainAddress.city || ''}
                            </div>
                        ` : ''}
                    </div>
                    
                    <div style="display: flex; gap: 8px; margin-left: 15px;">
                        <button class="btn btn-sm btn-primary" onclick="customerPanel.editAddress('${mainAddress.id}')">
                            <i class="fas fa-edit"></i> Düzenle
                        </button>
                    </div>
                </div>
                
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #f0f0f0;">
                    <div style="font-size: 13px; color: #666;">
                        <i class="fas fa-info-circle" style="margin-right: 5px;"></i>
                        <strong>Not:</strong> Siparişlerinizde farklı teslimat adresi kullanabilirsiniz. 
                        Bu adres varsayılan adresinizdir.
                    </div>
                </div>
            </div>
            
            <div style="text-align: center; margin-top: 20px;">
                <button class="btn btn-outline-primary" onclick="window.panelSystem.showSection('customerProfile')">
                    <i class="fas fa-user-edit"></i> Profil Bilgilerini Güncelle
                </button>
            </div>
        `;
    }

    async editAddress(addressId) {
        const currentAddress = this.customerData.address || '';
        const currentCity = this.customerData.city || '';
        const currentDistrict = this.customerData.district || '';

        const newAddress = prompt('Adres:', currentAddress);
        if (newAddress === null) return;

        const newCity = prompt('Şehir:', currentCity);
        if (newCity === null) return;

        const newDistrict = prompt('İlçe:', currentDistrict);
        if (newDistrict === null) return;

        try {
            const { error } = await this.supabase
                .from('customers')
                .update({
                    address: newAddress,
                    city: newCity,
                    district: newDistrict,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.customerData.id);

            if (error) throw error;

            this.customerData.address = newAddress;
            this.customerData.city = newCity;
            this.customerData.district = newDistrict;

            window.panelSystem.showAlert('Adres bilgileriniz güncellendi!', 'success');
            await this.loadCustomerAddressesData();

        } catch (error) {
            console.error('Adres güncelleme hatası:', error);
            window.panelSystem.showAlert('Adres güncellenemedi!', 'error');
        }
    }

    showAddAddressModal() {
        this.editAddress(this.customerData.id);
    }

    showNoAddressMessage() {
        const container = document.getElementById('customerAddressesList');
        container.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #666;">
                <i class="fas fa-map-marker-alt" style="font-size: 48px; margin-bottom: 20px; opacity: 0.5;"></i>
                <h3>Ana Adresiniz Bulunmuyor</h3>
                <p>Ana adresinizi eklemek için profil sayfasına gidin.</p>
                <button class="btn btn-primary" onclick="window.panelSystem.showSection('customerProfile')">
                    <i class="fas fa-user-edit"></i> Profil Sayfasına Git
                </button>
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
                    <div class="support-options">
                        <div class="support-card" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="font-size: 24px; color: var(--primary);">
                                    <i class="fas fa-phone"></i>
                                </div>
                                <div>
                                    <h4 style="margin: 0 0 5px 0;">Telefon Desteği</h4>
                                    <p style="margin: 0; color: #666;">0850 123 45 67</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="support-card" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="font-size: 24px; color: #25D366;">
                                    <i class="fab fa-whatsapp"></i>
                                </div>
                                <div>
                                    <h4 style="margin: 0 0 5px 0;">WhatsApp Desteği</h4>
                                    <p style="margin: 0; color: #666;">+90 555 123 45 67</p>
                                </div>
                            </div>
                        </div>
                        
                        <div class="support-card" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <div style="font-size: 24px; color: var(--warning);">
                                    <i class="fas fa-envelope"></i>
                                </div>
                                <div>
                                    <h4 style="margin: 0 0 5px 0;">E-posta Desteği</h4>
                                    <p style="margin: 0; color: #666;">destek@sirketiniz.com</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showNoPaymentsMessage(message = 'Henüz ödeme kaydınız bulunmuyor.') {
        const container = document.getElementById('customerPaymentsContent');
        if (container) {
            container.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-credit-card" style="font-size: 48px; margin-bottom: 20px;"></i>
                    <h3>${message}</h3>
                    <p>Ödeme geçmişiniz burada görünecek.</p>
                </div>
            `;
        }
    }

    // REFERRAL SİSTEMİ FONKSİYONLARI
    async loadReferralData() {
        try {
            console.log('📊 Referral verileri yükleniyor...');
            
            if (!this.supabase || !this.customerData?.id) {
                console.warn('⚠️ Referral verileri yüklenemedi: Supabase veya müşteri ID yok');
                return;
            }

            // SADECE mevcut linki kontrol et
            const { data: referralLink, error: linkError } = await this.supabase
                .from('referral_links')
                .select('*')
                .eq('owner_user_id', this.customerData.id)
                .eq('is_used', false)
                .single();

            if (!linkError && referralLink) {
                this.referralData = referralLink;
                console.log('✅ Mevcut referral link bulundu:', referralLink.referral_code);
            } else {
                this.referralData = null;
                console.log('ℹ️ Henüz referral link oluşturulmamış');
            }

            // İstatistikleri yükle
            await this.loadReferralStats();
            await this.loadReferralEarnings();
            await this.loadReferralInvites();

        } catch (error) {
            console.error('❌ Referral veri yükleme hatası:', error);
        }
    }

    async loadReferralStats() {
        try {
            if (!this.customerData?.id) return;

            // Basit istatistikler
            const { data: invites, error: invitesError } = await this.supabase
                .from('referral_tracking')
                .select('id, new_user_id, created_at')
                .eq('referrer_user_id', this.customerData.id);

            const { data: earnings, error: earningsError } = await this.supabase
                .from('referral_bonus_usage')
                .select('order_bonus, amount')
                .eq('user_id', this.customerData.id);

            let totalEarnings = 0;
            if (earnings) {
                earnings.forEach(earning => {
                    if (earning.order_bonus) {
                        totalEarnings += parseFloat(earning.order_bonus);
                    }
                });
            }

            this.referralStats = {
                totalInvites: invites?.length || 0,
                activeUsers: invites?.filter(invite => invite.new_user_id).length || 0,
                totalEarnings: totalEarnings,
                pendingEarnings: 0
            };

        } catch (error) {
            console.error('❌ Referral istatistik yükleme hatası:', error);
        }
    }

    async loadReferralEarnings() {
        try {
            if (!this.customerData?.id) return;

            const { data: earnings, error } = await this.supabase
                .from('referral_bonus_usage')
                .select('*')
                .eq('user_id', this.customerData.id)
                .order('created_at', { ascending: false });

            if (!error && earnings) {
                this.referralEarnings = earnings;
            }

        } catch (error) {
            console.error('❌ Referral kazanç geçmişi yükleme hatası:', error);
        }
    }

    async loadReferralInvites() {
        try {
            if (!this.customerData?.id) return;

            const { data: invites, error } = await this.supabase
                .from('referral_tracking')
                .select('*')
                .eq('referrer_user_id', this.customerData.id)
                .order('created_at', { ascending: false });

            if (!error && invites) {
                this.referralInvites = invites;
            }

        } catch (error) {
            console.error('❌ Davet edilenler yükleme hatası:', error);
        }
    }

    async loadCustomerReferral() {
        const section = document.getElementById('customerReferralSection');
        if (!section) return;

        try {
            // Butonları başlangıçta pasif yap
            section.innerHTML = `
                <div class="section-header">
                    <h2>🎁 Arkadaşını Davet Et</h2>
                    <p class="subtitle">Arkadaşlarını davet et, bonus kazan!</p>
                </div>

                <div class="loading-spinner" id="referralLoading">
                    <i class="fas fa-spinner fa-spin"></i>
                    <p>Güvenlik kontrolü yapılıyor... (10 saniye)</p>
                </div>

                <div class="content-row" id="referralContent" style="display: none;">
                    <div class="content-col">
                        <div class="card">
                            <div class="card-header">
                                <h3>📬 Davet Linkiniz</h3>
                            </div>
                            <div class="card-body">
                                <div class="referral-link-container">
                                    <label>Bu linki arkadaşlarınla paylaş:</label>
                                    <div class="input-group" style="margin-top: 10px;">
                                        <input type="text" id="referralLinkInput" class="form-control" 
                                               value="Hazırlanıyor..." readonly style="font-size: 14px;">
                                        <button class="btn btn-primary" id="copyReferralBtn" disabled>
                                            <i class="fas fa-copy"></i> Kopyala
                                        </button>
                                    </div>
                                    <small class="text-muted">
                                        Bu linki arkadaşlarınla paylaş, hem onlar hem sen kazanın!
                                    </small>
                                </div>

                                <div class="share-buttons" style="margin-top: 25px;">
                                    <h4>Hızlı Paylaşım:</h4>
                                    <div style="display: flex; gap: 10px; flex-wrap: wrap; margin-top: 10px;">
                                        <button class="btn btn-success" id="shareWhatsAppBtn" disabled>
                                            <i class="fab fa-whatsapp"></i> WhatsApp
                                        </button>
                                        <button class="btn btn-primary" id="shareTelegramBtn" disabled>
                                            <i class="fab fa-telegram"></i> Telegram
                                        </button>
                                        <button class="btn btn-info" id="shareSMSBtn" disabled>
                                            <i class="fas fa-sms"></i> SMS
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="content-col">
                        <div class="card">
                            <div class="card-header">
                                <h3>💰 Bonus Sistem</h3>
                            </div>
                            <div class="card-body">
                                <div class="bonus-rules">
                                    <div class="rule-item" style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #eee;">
                                        <div style="background: #007bff; color: white; padding: 10px; border-radius: 8px; margin-right: 15px;">
                                            <i class="fas fa-gift"></i>
                                        </div>
                                        <div>
                                            <strong>Referans Bonusu</strong>
                                            <p style="margin: 5px 0 0 0; color: #666;">Arkadaşın üye olduğunda sabit bonus kazan</p>
                                        </div>
                                    </div>
                                    <div class="rule-item" style="display: flex; align-items: center; padding: 15px; border-bottom: 1px solid #eee;">
                                        <div style="background: #28a745; color: white; padding: 10px; border-radius: 8px; margin-right: 15px;">
                                            <i class="fas fa-shopping-cart"></i>
                                        </div>
                                        <div>
                                            <strong>Sipariş Bonusu</strong>
                                            <p style="margin: 5px 0 0 0; color: #666;">Arkadaşın sipariş verdikçe % bazlı bonus kazan</p>
                                        </div>
                                    </div>
                                    <div class="rule-item" style="display: flex; align-items: center; padding: 15px;">
                                        <div style="background: #ffc107; color: white; padding: 10px; border-radius: 8px; margin-right: 15px;">
                                            <i class="fas fa-calendar-alt"></i>
                                        </div>
                                        <div>
                                            <strong>Ay Sonu Hakediş</strong>
                                            <p style="margin: 5px 0 0 0; color: #666;">Bonuslar ay sonunda bakiyene eklenecek</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            `;

            // 10 saniye bekleyip link oluştur
            await this.startReferralProcess();

        } catch (error) {
            console.error('❌ Referral sayfası yükleme hatası:', error);
            section.innerHTML = `
                <div class="error-message">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Link oluşturulamadı</h3>
                    <p>Lütfen sayfayı yenileyin ve tekrar deneyin.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Yenile</button>
                </div>
            `;
        }
    }

    async startReferralProcess() {
        try {
            let countdown = 10;
            const loadingElement = document.getElementById('referralLoading');
            const contentElement = document.getElementById('referralContent');
            
            // Geri sayım göster
            const countdownInterval = setInterval(() => {
                if (loadingElement) {
                    loadingElement.innerHTML = `
                        <i class="fas fa-spinner fa-spin"></i>
                        <p>Güvenlik kontrolü yapılıyor... (${countdown} saniye)</p>
                    `;
                }
                countdown--;
                
                if (countdown < 0) {
                    clearInterval(countdownInterval);
                    this.initializeReferralLink();
                }
            }, 1000);

        } catch (error) {
            console.error('❌ Referral proses hatası:', error);
        }
    }

    async initializeReferralLink() {
        try {
            const loadingElement = document.getElementById('referralLoading');
            const contentElement = document.getElementById('referralContent');
            
            // Loading'i gizle, içeriği göster
            if (loadingElement) loadingElement.style.display = 'none';
            if (contentElement) contentElement.style.display = 'flex';

            // Mevcut aktif link kontrolü
            const { data: existingLink, error: checkError } = await this.supabase
                .from('referral_links')
                .select('*')
                .eq('owner_user_id', this.customerData.id)
                .eq('is_used', false)
                .single();

            if (!checkError && existingLink) {
                // Mevcut link varsa onu kullan
                this.referralData = existingLink;
                console.log('✅ Mevcut link kullanılıyor:', existingLink.referral_code);
            } else {
                // Yeni link oluştur
                console.log('🔄 Yeni referral link oluşturuluyor...');
                await this.createNewReferralLink();
            }

            // Linki göster ve butonları aktif et
            this.activateReferralButtons();

        } catch (error) {
            console.error('❌ Link başlatma hatası:', error);
            this.showReferralError();
        }
    }

    async createNewReferralLink() {
    try {
        // MÜŞTERİNİN KENDİ group_code'sunu al
        const { data: customer, error: customerError } = await this.supabase
            .from('customers')
            .select('group_code')
            .eq('id', this.customerData.id)
            .single();

        if (customerError) {
            console.error('❌ Müşteri bilgisi alınamadı:', customerError);
            throw customerError;
        }

        let groupCode = 'DEFAULT';

        // Müşterinin group_code'u varsa onu kullan
        if (customer && customer.group_code) {
            groupCode = customer.group_code;
            console.log('✅ Müşteri group_code kullanılıyor:', groupCode);
        } else {
            console.log('ℹ️ Müşteride group_code yok, DEFAULT kullanılıyor');
        }

        const referralCode = this.generateReferralCode();
        
        // referral_links tablosuna kayıt
        const { data: newLink, error } = await this.supabase
            .from('referral_links')
            .insert({
                group_code: groupCode,
                owner_user_id: this.customerData.id,
                referral_code: referralCode,
                is_used: false,
                created_at: new Date().toISOString()
            })
            .select()
            .single();

        if (error) throw error;

        this.referralData = newLink;
        console.log('✅ Yeni referral link oluşturuldu:', referralCode, 'Group:', groupCode);
        return newLink;

    } catch (error) {
        console.error('❌ Yeni link oluşturma hatası:', error);
        throw error;
    }
}
    
    activateReferralButtons() {
        const referralLink = this.referralData ? 
            `${window.location.origin}?ref=${this.referralData.referral_code}` : 
            'Hata oluştu, lütfen yenileyin';

        // Link input'unu güncelle
        const linkInput = document.getElementById('referralLinkInput');
        if (linkInput) {
            linkInput.value = referralLink;
        }

        // Butonları aktif et ve event listener ekle
        const copyBtn = document.getElementById('copyReferralBtn');
        const whatsappBtn = document.getElementById('shareWhatsAppBtn');
        const telegramBtn = document.getElementById('shareTelegramBtn');
        const smsBtn = document.getElementById('shareSMSBtn');

        if (copyBtn) {
            copyBtn.disabled = false;
            copyBtn.addEventListener('click', () => this.copyReferralLink());
        }
        if (whatsappBtn) {
            whatsappBtn.disabled = false;
            whatsappBtn.addEventListener('click', () => this.shareOnWhatsApp());
        }
        if (telegramBtn) {
            telegramBtn.disabled = false;
            telegramBtn.addEventListener('click', () => this.shareOnTelegram());
        }
        if (smsBtn) {
            smsBtn.disabled = false;
            smsBtn.addEventListener('click', () => this.shareAsSMS());
        }

        console.log('✅ Referral butonları aktif edildi');
    }

    // PAYLAŞIM FONKSİYONLARI
    copyReferralLink() {
        const input = document.getElementById('referralLinkInput');
        if (input && this.referralData) {
            input.select();
            document.execCommand('copy');
            window.panelSystem.showAlert('Davet linki kopyalandı!', 'success');
        }
    }

    shareOnWhatsApp() {
        if (!this.referralData) return;
        
        const message = `Seni yemek siparişi uygulamasına davet ediyorum! 🍕 Bu linkten üye ol, ikimiz de bonus kazanalım: ${window.location.origin}?ref=${this.referralData.referral_code}`;
        
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            window.open(`whatsapp://send?text=${encodeURIComponent(message)}`, '_blank');
        } else {
            window.open(`https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`, '_blank');
        }
    }

    shareOnTelegram() {
        if (!this.referralData) return;
        
        const message = `Seni yemek siparişi uygulamasına davet ediyorum! 🍕 Bu linkten üye ol, ikimiz de bonus kazanalım: ${window.location.origin}?ref=${this.referralData.referral_code}`;
        window.open(`https://t.me/share/url?url=${encodeURIComponent(window.location.origin)}&text=${encodeURIComponent(message)}`, '_blank');
    }

    shareAsSMS() {
        if (!this.referralData) return;
        
        const message = `Yemek siparişi uygulamasına davetim: ${window.location.origin}?ref=${this.referralData.referral_code}`;
        
        if (/Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
            window.open(`sms:?body=${encodeURIComponent(message)}`, '_blank');
        } else {
            alert(`SMS için mesajı kopyalayın: ${message}`);
        }
    }

    generateReferralCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 8; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

        showReferralError() {
        const contentElement = document.getElementById('referralContent');
        if (contentElement) {
            contentElement.innerHTML = `
                <div class="error-message" style="text-align: center; padding: 40px;">
                    <i class="fas fa-exclamation-triangle" style="font-size: 48px; color: #dc3545;"></i>
                    <h3>Link oluşturulamadı</h3>
                    <p>Lütfen sayfayı yenileyip tekrar deneyin.</p>
                    <button class="btn btn-primary" onclick="location.reload()">Sayfayı Yenile</button>
                </div>
            `;
        }
    }

    async loadReferralEarningsSection() {
        const section = document.getElementById('referralEarningsSection');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2>Bonus Kazançlarım</h2>
                <div class="header-actions">
                    <select id="earningTypeFilter" class="form-control" onchange="customerPanel.filterEarnings()">
                        <option value="">Tüm Kazançlar</option>
                        <option value="referral_bonus">Referans Bonusu</option>
                        <option value="order_bonus">Sipariş Bonusu</option>
                    </select>
                    <input type="date" id="earningDateFilter" class="form-control" onchange="customerPanel.filterEarnings()">
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div id="referralEarningsList">
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-coins" style="font-size: 48px; margin-bottom: 20px;"></i>
                            <h3>Henüz bonus kazancınız bulunmuyor</h3>
                            <p>Arkadaşlarını davet ederek bonus kazanmaya başla!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    async loadReferralInvitesSection() {
        const section = document.getElementById('referralInvitesSection');
        if (!section) return;

        section.innerHTML = `
            <div class="section-header">
                <h2>Davet Ettiklerim</h2>
                <div class="header-actions">
                    <select id="inviteStatusFilter" class="form-control" onchange="customerPanel.filterInvites()">
                        <option value="">Tüm Davetler</option>
                        <option value="used">Üye Olanlar</option>
                        <option value="not_used">Üye Olmayanlar</option>
                    </select>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <div id="referralInvitesList">
                        <div style="text-align: center; padding: 40px; color: #666;">
                            <i class="fas fa-user-friends" style="font-size: 48px; margin-bottom: 20px;"></i>
                            <h3>Henüz kimseyi davet etmediniz</h3>
                            <p>Davet linkinizi paylaşarak arkadaşlarınızı davet edin!</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    // Filtreleme fonksiyonları
    filterEarnings() {
        console.log('Kazançlar filtreleniyor...');
    }

    filterInvites() {
        console.log('Davetler filtreleniyor...');
    }

    // Yardımcı fonksiyonlar
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

    getPaymentMethodText(method) {
        const methodMap = {
            'cash': 'Nakit',
            'card': 'Kart',
            'bonus': 'Bonus',
            'mixed': 'Karma'
        };
        return methodMap[method] || method;
    }

    getPaymentTypeText(type) {
        const typeMap = {
            'full': 'Tam Ödeme',
            'partial': 'Kısmi Ödeme', 
            'bonus_only': 'Sadece Bonus'
        };
        return typeMap[type] || type;
    }

    getPaymentStatusText(status) {
        const statusMap = {
            'completed': 'Tamamlandı',
            'pending': 'Bekliyor',
            'failed': 'Başarısız',
            'refunded': 'İade Edildi'
        };
        return statusMap[status] || status;
    }

       // Cleanup fonksiyonu
    destroy() {
        if (this.realtimeSubscription) {
            this.realtimeSubscription.unsubscribe();
        }
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
} // CLASS SONU

// Global erişim için
window.customerPanel = null;

// ⚠️ HATA KORUMALI VERSİYON - panelSystem kontrolü ekleyin
if (window.panelSystem && typeof window.panelSystem.on === 'function') {
    window.panelSystem.on('customerSessionStart', (userProfile) => {
        console.log('👤 CustomerPanel başlatılıyor...');
        window.customerPanel = new CustomerPanel(userProfile);
    });
} else {
    console.warn('⚠️ panelSystem bulunamadı veya on metodu yok');
}

console.log('✅ customer-panel.js yüklendi');
