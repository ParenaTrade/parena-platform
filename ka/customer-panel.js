// Customer Panel - Müşteri Paneli Yönetimi
class CustomerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.customerData = null;
        this.orders = [];
        this.payments = [];
        this.currentSection = '';
        this.isDataLoaded = false;
        
        
        this.supabase = window.SUPABASE_CLIENT;
        this.config = window.CONFIG;
        
        console.log('👤 CustomerPanel başlatılıyor - Müşteri Oturumu');
        console.log('Müşteri Profili:', {
            id: userProfile.id,
            name: userProfile.name,
            phone: userProfile.phone,
            role: userProfile.role
        });
        
        if (!this.supabase) {
            console.error('❌ Supabase client bulunamadı!');
            this.supabase = window.supabase;
        }
        
        this.init();
    }

    async init() {
        await this.loadCustomerData();
        this.isDataLoaded = true;
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
                    customer_phone
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

        // Kurye bilgilerini de içeren sorgu
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
    
        this.orders = orders || [];
        this.renderCustomerOrders(this.orders);
        console.log('✅ Tüm siparişler yüklendi:', this.orders.length);

    } catch (error) {
        console.error('❌ Siparişler yükleme hatası:', error);
        const container = document.getElementById('customerOrdersList');
        container.innerHTML = '<p class="text-muted">Siparişler yüklenirken hata oluştu.</p>';
    }
}
    renderDeliveryTracker(order) {
    const status = order.status;
    
    // Sadece courier_id ve courier_name kullan
    const hasCourier = order.courier_id || order.courier_name;
    const courierName = order.courier_name || 'Kurye';
    
    let trackerHTML = '';
    
    switch(status) {
        case 'pending':
        case 'confirmed':
        case 'preparing':
            if (hasCourier) {
                trackerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; color: #0c5460;">
                        <i class="fas fa-user-check" style="font-size: 16px;"></i>
                        <div>
                            <div style="font-size: 13px; font-weight: 600;">Kurye atandı</div>
                            <div style="font-size: 11px; color: #666;">${courierName} bekleniyor</div>
                        </div>
                    </div>
                `;
            } else {
                trackerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; color: #856404;">
                        <i class="fas fa-clock" style="font-size: 16px;"></i>
                        <div>
                            <div style="font-size: 13px; font-weight: 600;">Kurye aranıyor</div>
                            <div style="font-size: 11px; color: #666;">Siparişiniz hazırlanıyor</div>
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
                            <div style="font-size: 13px; font-weight: 600;">Kurye mağazada</div>
                            <div style="font-size: 11px; color: #666;">${courierName} paketi aldı</div>
                        </div>
                    </div>
                `;
            } else {
                trackerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px; color: #856404;">
                        <i class="fas fa-clock" style="font-size: 16px;"></i>
                        <div>
                            <div style="font-size: 13px; font-weight: 600;">Kurye bekleniyor</div>
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
                        <i class="fas fa-motorcycle" style="position: absolute; left: 20px; font-size: 16px; color: #007bff;"></i>
                        <div style="position: absolute; bottom: 8px; left: 0; right: 0; height: 2px; background: linear-gradient(90deg, transparent 0%, #dee2e6 50%, transparent 100%);"></div>
                    </div>
                    <div>
                        <div style="font-size: 13px; font-weight: 600;">Kurye yolda</div>
                        <div style="font-size: 11px; color: #666;">${courierName} adresinize geliyor</div>
                    </div>
                </div>
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
                        <div style="font-size: 13px; font-weight: 600;">Teslim edildi</div>
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


    
    

startSimpleMotoAnimation(orderId, status) {
    console.log(`🏍️ Basit animasyon başlatılıyor: ${orderId} - ${status}`);
    
    const container = document.querySelector(`[data-order-id="${orderId}"] .moto-container`);
    const motoElement = document.querySelector(`[data-order-id="${orderId}"] .fa-motorcycle`);
    
    if (!container || !motoElement) {
        console.log('❌ Animasyon elementleri bulunamadı');
        return;
    }
    
    console.log('✅ Animasyon elementleri bulundu');
    
    // Mevcut animasyonları temizle
    motoElement.style.animation = '';
    
    // Yeni animasyonu başlat
    if (status === 'ready') {
        motoElement.style.animation = 'motoMoveStore 2s ease-in-out infinite';
    } else if (status === 'on_the_way') {
        motoElement.style.animation = 'motoMoveAddress 3s ease-in-out infinite';
    }
    
    // Hemen CSS ekle
    this.addSimpleAnimationsCSS();
}

addSimpleAnimationsCSS() {
    if (document.getElementById('simple-delivery-animations')) return;
    
    const style = document.createElement('style');
    style.id = 'simple-delivery-animations';
    style.textContent = `
        /* BASİT ANİMASYONLAR */
        @keyframes motoMoveStore {
            0% {
                transform: translateX(0px) translateY(0px);
            }
            25% {
                transform: translateX(15px) translateY(-2px);
            }
            50% {
                transform: translateX(30px) translateY(0px);
            }
            75% {
                transform: translateX(45px) translateY(-2px);
            }
            100% {
                transform: translateX(60px) translateY(0px);
            }
        }
        
        @keyframes motoMoveAddress {
            0% {
                transform: translateX(0px) translateY(0px);
            }
            20% {
                transform: translateX(12px) translateY(-1px);
            }
            40% {
                transform: translateX(24px) translateY(0px);
            }
            60% {
                transform: translateX(36px) translateY(-1px);
            }
            80% {
                transform: translateX(48px) translateY(0px);
            }
            100% {
                transform: translateX(60px) translateY(0px);
            }
        }
        
        @keyframes simpleBounce {
            0%, 100% {
                transform: translateY(0px);
            }
            50% {
                transform: translateY(-3px);
            }
        }
        
        @keyframes simplePulse {
            0%, 100% {
                transform: scale(1);
                opacity: 1;
            }
            50% {
                transform: scale(1.1);
                opacity: 0.8;
            }
        }
        
        /* ANİMASYON UYGULA */
        .fa-motorcycle[style*="animation"] {
            color: #007bff !important;
        }
        
        .fa-store {
            animation: simplePulse 2s ease-in-out infinite !important;
            color: #28a745 !important;
        }
        
        .fa-map-marker-alt {
            animation: simplePulse 1.5s ease-in-out infinite !important;
            color: #dc3545 !important;
        }
    `;
    
    document.head.appendChild(style);
    console.log('✅ Basit animasyon CSS yüklendi!');
}

// TEST FONKSİYONU - Hemen deneyin
testAnimationsNow() {
    console.log('🚀 ANİMASYON TESTİ BAŞLATILIYOR...');
    
    // Önce CSS'i yükle
    this.addSimpleAnimationsCSS();
    
    // 1 saniye bekle ve animasyonları başlat
    setTimeout(() => {
        this.startDeliveryAnimations();
        
        // Animasyonların çalıştığını kontrol et
        setTimeout(() => {
            const animatedElements = document.querySelectorAll('.fa-motorcycle');
            console.log(`🎯 ${animatedElements.length} motosiklet elementi bulundu`);
            
            animatedElements.forEach((el, index) => {
                const animation = window.getComputedStyle(el).animation;
                console.log(`Motosiklet ${index + 1} animasyon:`, animation);
            });
        }, 1000);
        
    }, 100);
}

// HEMEN ÇALIŞTIRMAK İÇİN:
// customerPanel.testAnimationsNow()
    
    
    // Ana Sipariş Render Fonksiyonu
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
                <!-- Sipariş Özeti - Her Zaman Görünür -->
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

                            <!-- Kurye Durumu Göstergesi -->
                            <div class="delivery-tracker" style="margin-top: 10px; position: relative;">
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
                
                <!-- Sipariş Detayları - Açılır/Kapanır -->
                <div class="order-details" id="details-${order.id}" 
                     style="display: none; padding: 0 20px 20px 20px; background: white;">
                    
                    <!-- Ürünler -->
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
                    
                    <!-- Sipariş Bilgileri -->
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
        ${order.courier_id || (order.courier && order.courier.name) ? `
            <div style="color: var(--success); margin-bottom: 4px;">
                <i class="fas fa-motorcycle"></i> 
                <strong>Kurye:</strong> ${order.courier ? order.courier.name : order.courier_name || 'Atandı'}
            </div>
        ` : `
            <div style="color: var(--warning); margin-bottom: 4px;">
                <i class="fas fa-clock"></i> 
                <strong>Kurye:</strong> Atanıyor
            </div>
        `}
        
        ${order.delivery_address ? `
            <div style="margin-bottom: 4px;">
                <strong>Adres:</strong> ${order.delivery_address}
            </div>
        ` : ''}
    </div>
    </div>
   </div>
                    <!-- İptal Durumu -->
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
                    
                    <!-- Aksiyon Butonları -->
                    <div class="order-actions" style="display: flex; gap: 10px; margin-top: 15px; padding-top: 15px; border-top: 1px solid #e1e5e9;">
                        ${order.status === 'delivered' ? `
                            <button class="btn btn-sm btn-success" data-action="rate" data-order-id="${order.id}">
                                <i class="fas fa-star"></i> Değerlendir
                            </button>
                        ` : ''}
                        
                        ${order.status === 'pending' ? `
                            ${order.cancellation_requested ? `
                                <button class="btn btn-sm btn-secondary" data-action="view-cancellation" data-order-id="${order.id}">
                                    <i class="fas fa-info-circle"></i> İptal Durumu
                                </button>
                            ` : `
                                <button class="btn btn-sm btn-warning" data-action="cancel" data-order-id="${order.id}">
                                    <i class="fas fa-times"></i> İptal Talebi
                                </button>
                            `}
                        ` : ''}
                        
                        <button class="btn btn-sm btn-outline-primary" data-action="close" data-order-id="${order.id}">
                            <i class="fas fa-times"></i> Kapat
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Event listener'ları ekle
        this.attachOrderEventListeners();
        
    }

    // Event Listener Fonksiyonu
    attachOrderEventListeners() {
        const orderSummaries = document.querySelectorAll('.order-summary');
        const actionButtons = document.querySelectorAll('[data-action]');
        
        // Sipariş özeti tıklama
        orderSummaries.forEach(summary => {
            summary.addEventListener('click', (e) => {
                const orderId = e.currentTarget.getAttribute('data-order-id');
                this.toggleOrderDetails(orderId);
            });
        });
        
        // Aksiyon butonları
        actionButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = e.currentTarget.getAttribute('data-action');
                const orderId = e.currentTarget.getAttribute('data-order-id');
                
                switch(action) {
                    case 'rate':
                        this.rateOrder(orderId);
                        break;
                    case 'view-cancellation':
                        this.viewCancellationStatus(orderId);
                        break;
                    case 'cancel':
                        this.cancelOrder(orderId);
                        break;
                    case 'close':
                        this.toggleOrderDetails(orderId);
                        break;
                }
            });
        });
    }

    // Açılır-kapanır fonksiyonu
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

    async cancelOrder(orderId) {
        try {
            const { data: order, error } = await this.supabase
                .from('orders')
                .select('status, cancellation_requested')
                .eq('id', orderId)
                .single();

            if (error) throw error;

            if (order.status === 'pending' && !order.cancellation_requested) {
                await this.requestCancellation(orderId);
            } 
            else if (order.cancellation_requested) {
                await this.viewCancellationStatus(orderId);
            }
            else if (order.status !== 'pending') {
                window.panelSystem.showAlert('Bu sipariş artık iptal edilemez. Lütfen satıcı ile iletişime geçin.', 'warning');
            }

        } catch (error) {
            console.error('❌ Sipariş durumu sorgulama hatası:', error);
            window.panelSystem.showAlert('Sipariş bilgileri alınamadı!', 'error');
        }
    }

    async requestCancellation(orderId) {
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

    async rateOrder(orderId) {
        const rating = prompt('Siparişi 1-5 arasında değerlendirin:');
        if (!rating || rating < 1 || rating > 5) {
            alert('Lütfen 1-5 arasında bir değer girin.');
            return;
        }

        try {
            const { error } = await this.supabase
                .from('orders')
                .update({
                    performance_rating: parseFloat(rating),
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

  
    
    
    // Diğer fonksiyonlar (loadCustomerPayments, loadCustomerAddresses, vb.) buraya gelecek
    // ... kalan fonksiyonlar aynı kalacak ...

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

        // Doğru kolon isimleriyle join sorgusu
        const { data: payments, error } = await this.supabase
            .from('customer_payments')
            .select(`
                *,
                order:orders(
                    id,
                    total_amount,
                    created_at,
                    status,
                    customer_name,
                    delivery_address
                )
            `)
            .eq('customer_id', this.customerData.id)
            .order('payment_date', { ascending: false });

        if (error) {
            console.error('❌ Ödemeler sorgu hatası:', error);
            
            // Eğer join hatası verirse, basit sorgu yap
            if (error.code === '42703' || error.code === 'PGRST200') {
                console.log('🔄 Basit sorgu yöntemi kullanılıyor...');
                return await this.loadPaymentsWithoutJoin();
            }
            throw error;
        }

        this.payments = payments || [];
        this.renderCustomerPayments(this.payments);
        console.log('✅ Ödemeler yüklendi:', this.payments.length);

    } catch (error) {
        console.error('❌ Ödemeler yükleme hatası:', error);
        this.showNoPaymentsMessage('Ödemeler yüklenirken hata oluştu.');
    }
}

async loadPaymentsWithoutJoin() {
    try {
        const { data: payments, error } = await this.supabase
            .from('customer_payments')
            .select('*')
            .eq('customer_id', this.customerData.id)
            .order('payment_date', { ascending: false });

        if (error) throw error;

        // Sipariş bilgilerini manuel olarak ekle
        if (payments && payments.length > 0) {
            const orderIds = payments
                .map(p => p.order_id)
                .filter(id => id)
                .filter((id, index, array) => array.indexOf(id) === index);

            if (orderIds.length > 0) {
                const { data: orders, error: ordersError } = await this.supabase
                    .from('orders')
                    .select('id, total_amount, created_at, status, customer_name, delivery_address')
                    .in('id', orderIds);

                if (!ordersError && orders) {
                    const ordersMap = {};
                    orders.forEach(order => {
                        ordersMap[order.id] = order;
                    });

                    payments.forEach(payment => {
                        payment.order = ordersMap[payment.order_id] || {
                            id: payment.order_id,
                            total_amount: payment.amount,
                            created_at: payment.payment_date
                        };
                    });
                }
            } else {
                // Order ID yoksa temel bilgileri ekle
                payments.forEach(payment => {
                    payment.order = {
                        id: payment.id,
                        total_amount: payment.amount,
                        created_at: payment.payment_date
                    };
                });
            }
        }

        this.payments = payments || [];
        this.renderCustomerPayments(this.payments);
        console.log('✅ Ödemeler (basit sorgu) yüklendi:', this.payments.length);

    } catch (error) {
        console.error('❌ Basit ödeme sorgu hatası:', error);
        throw error;
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
                        // Sipariş numarasını oluştur
                        const orderNumber = payment.order_id ? 
                            `Sipariş #${payment.order_id.slice(-8)}` : 
                            `Ödeme #${payment.id.slice(-8)}`;
                        
                        // Toplam tutarı belirle
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
}




// CustomerPanel class'ına bu fonksiyonları ekleyin:

async loadReferralSection() {
    const section = document.getElementById('customerReferralSection');
    if (!section) return;

    // Referral kurallarını ve kullanıcı bilgilerini yükle
    const [referralRules, userGroups, referralStats, hasFirstOrder] = await Promise.all([
        this.getReferralRules(),
        this.getUserGroups(),
        this.getReferralStats(),
        this.checkFirstOrderCompleted()
    ]);

    const referralBonusRule = referralRules?.find(rule => rule.rule_name === 'Referans Bonusu');
    const hasActiveGroup = userGroups && userGroups.length > 0;
    
    section.innerHTML = `
        <div class="section-header">
            <h2>Arkadaşını Davet Et</h2>
            <div class="header-badge ${hasFirstOrder ? 'badge-success' : 'badge-warning'}">
                ${hasFirstOrder ? '✅ Aktif' : '⏳ İlk Sipariş Bekleniyor'}
            </div>
            ${hasActiveGroup ? `
                <div class="header-badge badge-info">
                    👥 ${userGroups.length} Aktif Grup
                </div>
            ` : ''}
        </div>
        <div class="card">
            <div class="card-body">
                ${hasFirstOrder ? 
                    this.renderActiveReferral(hasActiveGroup, userGroups, referralStats, referralBonusRule) : 
                    this.renderPendingReferral(referralBonusRule)
                }
            </div>
        </div>
    `;

    if (hasFirstOrder) {
        this.attachReferralEventListeners(hasActiveGroup, userGroups);
        this.loadDetailedReferralStats();
    }
}

async getReferralRules() {
    try {
        const { data, error } = await this.supabase
            .from('referral_rules')
            .select('*')
            .eq('is_active', true);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Referral kuralları yükleme hatası:', error);
        return null;
    }
}

async getUserGroups() {
    try {
        const { data, error } = await this.supabase
            .from('referral_groups')
            .select(`
                id,
                name,
                group_code,
                leader_user_id,
                is_active
            `)
            .eq('is_active', true)
            .or(`leader_user_id.eq.${this.customerData.id},id.in.(select group_id from group_members where user_id.eq.${this.customerData.id})`);

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Grup bilgileri yükleme hatası:', error);
        return null;
    }
}

async getReferralStats() {
    try {
        if (!this.customerData?.id) return null;

        // Toplam davet sayısı
        const { data: referrals, error: refError } = await this.supabase
            .from('referral_links')
            .select('id, referral_code, group_code, created_at')
            .eq('owner_user_id', this.customerData.id);

        if (refError) throw refError;

        // Başarılı davetler (kullanıcı kayıt olmuş)
        const { data: tracking, error: trackError } = await this.supabase
            .from('referral_tracking')
            .select(`
                id,
                referral_code,
                new_user_id,
                created_at,
                referral_bonus(bonus_amount)
            `)
            .eq('referrer_user_id', this.customerData.id);

        if (trackError) throw trackError;

        // Toplam kazanılan bonus
        const { data: bonusUsage, error: bonusError } = await this.supabase
            .from('referral_bonus_usage')
            .select('amount, bonus_type, created_at')
            .eq('user_id', this.customerData.id);

        if (bonusError) throw bonusError;

        return {
            totalReferrals: referrals?.length || 0,
            successfulReferrals: tracking?.length || 0,
            totalBonus: bonusUsage?.reduce((sum, item) => sum + parseFloat(item.amount || 0), 0) || 0,
            referralTracking: tracking || [],
            bonusUsage: bonusUsage || []
        };

    } catch (error) {
        console.error('Referral istatistikleri yükleme hatası:', error);
        return null;
    }
}

async checkFirstOrderCompleted() {
    try {
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select('id, status, total_amount')
            .eq('customer_id', this.customerData.id)
            .in('status', ['delivered', 'completed'])
            .gt('total_amount', 0);

        if (error) throw error;
        return orders && orders.length > 0;
    } catch (error) {
        console.error('Sipariş kontrol hatası:', error);
        return false;
    }
}

renderActiveReferral(hasActiveGroup, userGroups, referralStats, referralBonusRule) {
    const groupOptions = hasActiveGroup ? this.renderGroupOptions(userGroups) : '';
    const referralBonusAmount = referralBonusRule?.bonus_amount || 50; // Varsayılan 50₺

    return `
        <div class="referral-content">
            <!-- Bonus Bilgileri -->
            <div class="bonus-info-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="padding: 15px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border-radius: 8px;">
                    <div style="font-size: 12px; opacity: 0.9;">Referans Bonusu</div>
                    <div style="font-size: 20px; font-weight: bold;">${referralBonusAmount}₺</div>
                    <div style="font-size: 11px; opacity: 0.8;">Her başarılı davet için</div>
                </div>
                <div style="padding: 15px; background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; border-radius: 8px;">
                    <div style="font-size: 12px; opacity: 0.9;">Sipariş Bonusu</div>
                    <div style="font-size: 20px; font-weight: bold;">%2-10</div>
                    <div style="font-size: 11px; opacity: 0.8;">Grup cirosundan pay</div>
                </div>
            </div>

            ${hasActiveGroup ? `
                <div class="group-selection" style="margin-bottom: 20px;">
                    <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                        Grup Seçimi (Opsiyonel):
                    </label>
                    <select id="groupCodeSelect" class="form-control" style="margin-bottom: 10px;">
                        <option value="">Grup seçmeden davet gönder</option>
                        ${groupOptions}
                    </select>
                    <small style="color: #666;">
                        Grup seçersen, davet ettiğin kişi otomatik olarak bu gruba katılır ve grup cirosuna katkıda bulunur
                    </small>
                </div>
            ` : ''}

            <!-- İstatistikler -->
            <div class="referral-stats" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 25px;">
                <div class="stat-card" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--primary);" id="totalReferrals">
                        ${referralStats?.totalReferrals || 0}
                    </div>
                    <div style="font-size: 12px; color: #666;">Toplam Davet</div>
                </div>
                <div class="stat-card" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--success);" id="successfulReferrals">
                        ${referralStats?.successfulReferrals || 0}
                    </div>
                    <div style="font-size: 12px; color: #666;">Başarılı Davet</div>
                </div>
                <div class="stat-card" style="text-align: center; padding: 15px; background: #f8f9fa; border-radius: 8px;">
                    <div style="font-size: 24px; font-weight: bold; color: var(--warning);" id="totalBonus">
                        ${(referralStats?.totalBonus || 0).toFixed(2)}₺
                    </div>
                    <div style="font-size: 12px; color: #666;">Toplam Kazanç</div>
                </div>
            </div>

            <!-- Link Oluşturma -->
            <div class="referral-link-section" style="margin-bottom: 25px;">
                <label style="display: block; margin-bottom: 8px; font-weight: 600; color: #333;">
                    Davet Linkiniz:
                </label>
                <div style="display: flex; gap: 10px;">
                    <input type="text" id="referralLinkInput" 
                           style="flex: 1; padding: 10px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px;" 
                           readonly placeholder="Link oluşturmak için butona tıklayın">
                    <button class="btn btn-primary" id="generateReferralLinkBtn">
                        <i class="fas fa-link"></i> Link Oluştur
                    </button>
                </div>
            </div>

            <!-- Aksiyon Butonları -->
            <div class="referral-actions" style="display: flex; gap: 10px; flex-wrap: wrap;">
                <button class="btn btn-success" id="copyReferralLinkBtn" style="display: none;">
                    <i class="fas fa-copy"></i> Kopyala
                </button>
                <button class="btn btn-outline-primary" id="shareWhatsAppBtn" style="display: none;">
                    <i class="fab fa-whatsapp"></i> WhatsApp
                </button>
                <button class="btn btn-outline-info" id="shareTelegramBtn" style="display: none;">
                    <i class="fab fa-telegram"></i> Telegram
                </button>
            </div>

            <!-- Detaylı İstatistikler -->
            <div id="detailedStatsContainer" style="margin-top: 25px;">
                <!-- JavaScript ile doldurulacak -->
            </div>

            <!-- Bilgilendirme -->
            <div class="referral-info" style="margin-top: 25px; padding: 15px; background: #e7f3ff; border-radius: 8px;">
                <h4 style="color: #004085; margin-bottom: 10px;">
                    <i class="fas fa-info-circle"></i> Çift Katmanlı Kazanç Sistemi
                </h4>
                <div style="color: #004085;">
                    <p><strong>1. Referans Bonusu (${referralBonusAmount}₺):</strong></p>
                    <ul style="padding-left: 20px; margin-bottom: 15px;">
                        <li>Davet ettiğin her arkadaşın ilk siparişinden <strong>${referralBonusAmount}₺</strong> bonus kazanırsın</li>
                        <li>Bonus anında hesabına yüklenir</li>
                    </ul>
                    
                    <p><strong>2. Sipariş Bonusu (%2-10):</strong></p>
                    <ul style="padding-left: 20px;">
                        <li>Grup üyesiysen, grubun toplam ciroşundan pay alırsın</li>
                        <li>Davet ettiğin kişilerin tüm siparişleri grup cirosuna eklenir</li>
                        <li>Ay sonunda grup performansına göre bonus dağıtılır</li>
                        <li>Ne kadar çok aktif üye davet edersen, o kadar çok kazanırsın</li>
                    </ul>
                </div>
            </div>
        </div>
    `;
}

renderGroupOptions(userGroups) {
    return userGroups.map(group => `
        <option value="${group.group_code}">
            ${group.name} (${group.leader_user_id === this.customerData.id ? 'Lider' : 'Üye'})
        </option>
    `).join('');
}

renderPendingReferral(referralBonusRule) {
    const referralBonusAmount = referralBonusRule?.bonus_amount || 50;

    return `
        <div class="referral-pending" style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 64px; color: #ffc107; margin-bottom: 20px;">
                <i class="fas fa-clock"></i>
            </div>
            <h3 style="color: #856404; margin-bottom: 15px;">Referral Sistemine Hazırlanıyorsun!</h3>
            <p style="color: #666; margin-bottom: 25px; line-height: 1.6;">
                Çift katmanlı kazanç sisteminden yararlanmak için ilk siparişini tamamlaman gerekiyor.<br>
                İlk siparişinden sonra hem referans bonusu hem de sipariş bonusu kazanmaya başlayabilirsin!
            </p>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 25px;">
                <div style="padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;">
                    <strong>🎁 Referans Bonusu</strong><br>
                    Her davet başına <strong>${referralBonusAmount}₺</strong>
                </div>
                <div style="padding: 15px; background: #fff3cd; border-radius: 8px; border: 1px solid #ffeaa7;">
                    <strong>📈 Sipariş Bonusu</strong><br>
                    Grup cirosundan <strong>%2-10</strong> pay
                </div>
            </div>
        </div>
    `;
}

async loadDetailedReferralStats() {
    try {
        const stats = await this.getReferralStats();
        if (!stats) return;

        const container = document.getElementById('detailedStatsContainer');
        if (!container) return;

        // Davet edilen kullanıcıların detayları
        const trackingDetails = await this.getTrackingDetails(stats.referralTracking);

        container.innerHTML = `
            <div class="detailed-stats">
                <h4 style="margin-bottom: 15px; color: #333;">
                    <i class="fas fa-chart-bar"></i> Detaylı İstatistikler
                </h4>
                
                ${stats.referralTracking.length > 0 ? `
                    <div style="margin-bottom: 20px;">
                        <h5 style="color: #666; margin-bottom: 10px;">Davet Edilen Üyeler</h5>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            ${trackingDetails.map(tracking => `
                                <div style="display: flex; justify-content: between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 500;">${tracking.user_name || 'Kullanıcı'}</div>
                                        <div style="font-size: 12px; color: #666;">
                                            ${new Date(tracking.created_at).toLocaleDateString('tr-TR')}
                                            ${tracking.bonus_amount ? ` • ${tracking.bonus_amount}₺ bonus` : ''}
                                        </div>
                                    </div>
                                    <div style="color: ${tracking.has_orders ? 'var(--success)' : 'var(--warning)'};">
                                        ${tracking.has_orders ? '✅ Sipariş Var' : '⏳ Bekleniyor'}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
                
                ${stats.bonusUsage.length > 0 ? `
                    <div>
                        <h5 style="color: #666; margin-bottom: 10px;">Bonus Geçmişi</h5>
                        <div style="background: #f8f9fa; padding: 15px; border-radius: 8px;">
                            ${stats.bonusUsage.map(bonus => `
                                <div style="display: flex; justify-content: between; align-items: center; padding: 8px 0; border-bottom: 1px solid #eee;">
                                    <div style="flex: 1;">
                                        <div style="font-weight: 500;">${bonus.bonus_type || 'Bonus'}</div>
                                        <div style="font-size: 12px; color: #666;">
                                            ${new Date(bonus.created_at).toLocaleDateString('tr-TR')}
                                        </div>
                                    </div>
                                    <div style="font-weight: bold; color: var(--success);">
                                        +${parseFloat(bonus.amount).toFixed(2)}₺
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                ` : ''}
            </div>
        `;

    } catch (error) {
        console.error('Detaylı istatistik yükleme hatası:', error);
    }
}

async getTrackingDetails(trackingData) {
    if (!trackingData || trackingData.length === 0) return [];

    const userIds = trackingData.map(t => t.new_user_id).filter(id => id);
    
    try {
        const { data: users, error } = await this.supabase
            .from('customers')
            .select('id, name, phone')
            .in('id', userIds);

        if (error) throw error;

        // Kullanıcıların sipariş bilgilerini kontrol et
        const userOrdersPromises = userIds.map(userId => 
            this.supabase
                .from('orders')
                .select('id')
                .eq('customer_id', userId)
                .in('status', ['delivered', 'completed'])
        );

        const ordersResults = await Promise.all(userOrdersPromises);

        return trackingData.map(tracking => {
            const user = users?.find(u => u.id === tracking.new_user_id);
            const userOrders = ordersResults.find(result => 
                result.data && result.data.length > 0 && 
                result.data[0].customer_id === tracking.new_user_id
            );
            
            return {
                user_name: user?.name || 'Kullanıcı',
                created_at: tracking.created_at,
                bonus_amount: tracking.referral_bonus?.[0]?.bonus_amount,
                has_orders: userOrders?.data && userOrders.data.length > 0
            };
        });

    } catch (error) {
        console.error('Tracking detayları yükleme hatası:', error);
        return trackingData.map(tracking => ({
            user_name: 'Kullanıcı',
            created_at: tracking.created_at,
            bonus_amount: tracking.referral_bonus?.[0]?.bonus_amount,
            has_orders: false
        }));
    }
}

// Diğer fonksiyonlar (generateReferralLink, copyReferralLink, shareReferralLink) aynı kalacak
// Sadece generateReferralLink fonksiyonunuzu kullanacağım

renderPendingReferral() {
    return `
        <div class="referral-pending" style="text-align: center; padding: 40px 20px;">
            <div style="font-size: 64px; color: #ffc107; margin-bottom: 20px;">
                <i class="fas fa-clock"></i>
            </div>
            <h3 style="color: #856404; margin-bottom: 15px;">Referral Sistemine Hazırlanıyorsun!</h3>
            <p style="color: #666; margin-bottom: 25px; line-height: 1.6;">
                Referral sisteminden yararlanmak için ilk siparişini tamamlaman gerekiyor.<br>
                İlk siparişinden sonra arkadaşlarını davet ederek bonus kazanmaya başlayabilirsin!
            </p>
            <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffeaa7;">
                <strong>🎁 Kazanç Fırsatı:</strong> Her davet ettiğin arkadaşın için <strong>50₺ bonus</strong> kazanacaksın!
            </div>
        </div>
    `;
}

attachReferralEventListeners(hasActiveGroup, userGroups) {
    // Link oluştur butonu
    document.getElementById('generateReferralLinkBtn')?.addEventListener('click', () => {
        const selectedGroupCode = hasActiveGroup ? 
            document.getElementById('groupCodeSelect')?.value : null;
        this.generateAndShowReferralLink(selectedGroupCode);
    });

    // Kopyala butonu
    document.getElementById('copyReferralLinkBtn')?.addEventListener('click', () => {
        this.copyReferralLink();
    });

    // Paylaş butonları
    document.getElementById('shareWhatsAppBtn')?.addEventListener('click', () => {
        this.shareReferralLink('whatsapp');
    });

    document.getElementById('shareTelegramBtn')?.addEventListener('click', () => {
        this.shareReferralLink('telegram');
    });

    // İstatistikleri yükle
    this.loadReferralStats();
}

async generateAndShowReferralLink(groupCode = null) {
    try {
        if (!this.customerData?.id) {
            window.panelSystem.showAlert('Müşteri bilgileri bulunamadı!', 'error');
            return;
        }

        const referralData = await this.generateReferralLink(this.customerData.id, groupCode);
        
        if (!referralData) {
            window.panelSystem.showAlert('Referral link oluşturulamadı!', 'error');
            return;
        }

        // Link input'una yaz
        const linkInput = document.getElementById('referralLinkInput');
        if (linkInput) {
            linkInput.value = referralData.link;
        }

        // Butonları göster
        const copyBtn = document.getElementById('copyReferralLinkBtn');
        const whatsappBtn = document.getElementById('shareWhatsAppBtn');
        const telegramBtn = document.getElementById('shareTelegramBtn');

        if (copyBtn) copyBtn.style.display = 'inline-block';
        if (whatsappBtn) whatsappBtn.style.display = 'inline-block';
        if (telegramBtn) telegramBtn.style.display = 'inline-block';

        window.panelSystem.showAlert('Referral link oluşturuldu!', 'success');

    } catch (error) {
        console.error('Referral link oluşturma hatası:', error);
        window.panelSystem.showAlert('Link oluşturulurken hata oluştu!', 'error');
    }
}

// MEVCUT SİSTEME UYGUN REFERRAL LINK OLUŞTURMA
async generateReferralLink(ownerUserId, groupCode = null) {
    try {
        const referralCode = this.generateReferralCode();
        
        const linkData = {
            owner_user_id: ownerUserId,
            referral_code: referralCode,
            created_at: new Date().toISOString()
        };

        if (groupCode) {
            linkData.group_code = groupCode;
        }

        const { data, error } = await this.supabase
            .from('referral_links')
            .insert([linkData])
            .select()
            .single();

        if (error) throw error;

        const baseUrl = window.location.origin;
        const referralLink = groupCode 
            ? `${baseUrl}?group_code=${groupCode}&ref=${referralCode}`
            : `${baseUrl}?ref=${referralCode}`;

        return {
            link: referralLink,
            code: referralCode,
            id: data.id
        };

    } catch (error) {
        console.error('Referral link oluşturma hatası:', error);
        return null;
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

async loadReferralStats() {
    try {
        if (!this.customerData?.id) return;

        const { data: referrals, error } = await this.supabase
            .from('referral_links')
            .select(`
                referral_code,
                created_at,
                referred_users (
                    id,
                    completed_orders_count
                )
            `)
            .eq('owner_user_id', this.customerData.id);

        if (error) throw error;

        const totalReferrals = referrals?.length || 0;
        const successfulReferrals = referrals?.filter(ref => 
            ref.referred_users && ref.referred_users.completed_orders_count > 0
        ).length || 0;
        const totalBonus = successfulReferrals * 50; // Her başarılı davet için 50₺

        // İstatistikleri güncelle
        document.getElementById('totalReferrals').textContent = totalReferrals;
        document.getElementById('successfulReferrals').textContent = successfulReferrals;
        document.getElementById('totalBonus').textContent = `${totalBonus}₺`;

    } catch (error) {
        console.error('Referral istatistikleri yükleme hatası:', error);
    }
}

copyReferralLink() {
    const linkInput = document.getElementById('referralLinkInput');
    if (!linkInput || !linkInput.value) {
        window.panelSystem.showAlert('Kopyalanacak link bulunamadı!', 'error');
        return;
    }

    linkInput.select();
    linkInput.setSelectionRange(0, 99999);

    try {
        navigator.clipboard.writeText(linkInput.value).then(() => {
            window.panelSystem.showAlert('Link panoya kopyalandı!', 'success');
        });
    } catch (err) {
        document.execCommand('copy');
        window.panelSystem.showAlert('Link panoya kopyalandı!', 'success');
    }
}

shareReferralLink(platform) {
    const linkInput = document.getElementById('referralLinkInput');
    if (!linkInput || !linkInput.value) {
        window.panelSystem.showAlert('Paylaşılacak link bulunamadı!', 'error');
        return;
    }

    const link = linkInput.value;
    const message = `🎉 Seni yemek sipariş uygulamasına davet ediyorum! Bu linkten kayıt ol ve ilk siparişinde özel indirimlerden yararlan: ${link}`;

    let shareUrl = '';

    switch (platform) {
        case 'whatsapp':
            shareUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
            break;
        case 'telegram':
            shareUrl = `https://t.me/share/url?url=${encodeURIComponent(link)}&text=${encodeURIComponent(message)}`;
            break;
        default:
            return;
    }

    window.open(shareUrl, '_blank', 'width=600,height=400');
}


// Global instance
if (typeof window.customerPanel === 'undefined') {
    window.customerPanel = null;
}
