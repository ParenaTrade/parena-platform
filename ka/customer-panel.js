// Customer Panel - Müşteri Paneli Yönetimi
class CustomerPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.customerData = null;
        this.orders = [];
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

            // Customers tablosundan müşteri bilgilerini yükle
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
        
        // Veri yüklenene kadar bekle
        if (!this.isDataLoaded) {
            console.log('⏳ Veri yükleniyor, bekleniyor...');
            await this.waitForData();
        }
        
        // Supabase kontrolü
        if (!this.supabase) {
            console.error('❌ Supabase client yok, section yüklenemiyor');
            this.showError(sectionName, 'Sistem hazır değil');
            return;
        }
        
        // customerData kontrolü
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
            case 'customerAddresses':
                await this.loadCustomerAddresses();
                break;
            case 'customerSupport':
                await this.loadCustomerSupport();
                break;
        }
    }

    // Veri yüklenene kadar bekleyen yardımcı metod
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

    // Hata durumunda gösterilecek mesaj
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

        // Müşteri adını güvenli şekilde al
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
            
            // Güvenlik kontrolleri
            if (!this.supabase) {
                console.error('❌ Supabase client yok!');
                return;
            }

            if (!this.customerData || !this.customerData.id) {
                console.error('❌ Müşteri ID yok!');
                return;
            }

            console.log(`🔍 Siparişler aranıyor, Müşteri ID: ${this.customerData.id}`);

            // Sipariş istatistiklerini yükle
            const { data: orders, error } = await this.supabase
                .from('orders')
                .select('id, status')
                .eq('customer_id', this.customerData.id);

            if (error) {
                console.error('❌ İstatistik sorgu hatası:', error);
                this.showDemoStats();
                return;
            }

            // UI güncelleme
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

    // Demo istatistikleri göster
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
            <div class="card-header">
                <h3>Kişisel Bilgiler</h3>
            </div>
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

    // Form submit eventini ekle
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
            
            // Yerel veriyi güncelle
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
        
        // Filtre event listener'ları
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

        // DÜZELTİLMİŞ SORGU - courier ilişkisi opsiyonel
        const { data: orders, error } = await this.supabase
            .from('orders')
            .select(`
                *,
                order_details(*),
                seller:seller_profiles(business_name, phone),
                courier:couriers(full_name, phone)
            `)
            .eq('customer_id', this.customerData.id)
            .order('created_at', { ascending: false });

        if (error) {
            console.error('❌ Siparişler sorgu hatası:', error);
            
            // Eğer hala ilişki hatası veriyorsa, alternatif sorgu
            const { data: ordersAlt, error: errorAlt } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    order_details(*),
                    seller:seller_profiles(business_name, phone)
                `)
                .eq('customer_id', this.customerData.id)
                .order('created_at', { ascending: false });
                
            if (errorAlt) {
                throw errorAlt;
            }
            
            this.orders = ordersAlt || [];
        } else {
            this.orders = orders || [];
        }

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

    container.innerHTML = orders.map(order => `
        <div class="order-card" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 20px; margin-bottom: 15px;">
            <div class="order-header" style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 15px;">
                <div>
                    <strong style="font-size: 16px;">Sipariş #${order.id.slice(-8)}</strong>
                    <div style="color: #666; font-size: 14px; margin-top: 5px;">
                        ${order.seller?.business_name || 'Satıcı'}
                    </div>
                    ${order.delivery_address ? `
                        <div style="color: #666; font-size: 12px; margin-top: 2px;">
                            <i class="fas fa-map-marker-alt"></i> ${order.delivery_address}
                        </div>
                    ` : ''}
                </div>
                <div style="text-align: right;">
                    <span class="status-badge status-${order.status}">
                        ${this.getStatusText(order.status)}
                    </span>
                    <div style="margin-top: 5px; font-size: 14px; font-weight: bold; color: var(--primary);">
                        ${parseFloat(order.total_amount || 0).toFixed(2)} ₺
                    </div>
                </div>
            </div>
            
            ${order.order_details && order.order_details.length > 0 ? `
                <div class="order-items" style="margin-bottom: 15px;">
                    ${order.order_details.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: #f8f9fa; border-radius: 4px; margin-bottom: 5px;">
                            <div>
                                <span style="font-weight: 500;">${item.product_name}</span>
                                <div style="font-size: 12px; color: #666;">
                                    ${item.quantity} adet × ${parseFloat(item.unit_price || 0).toFixed(2)} ₺
                                    ${item.discount > 0 ? `(-${parseFloat(item.discount).toFixed(2)} ₺ indirim)` : ''}
                                </div>
                            </div>
                            <div style="font-weight: bold;">
                                ${parseFloat(item.total_price || 0).toFixed(2)} ₺
                            </div>
                        </div>
                    `).join('')}
                </div>
            ` : ''}
            
            <div class="order-footer" style="display: flex; justify-content: space-between; align-items: center; padding-top: 15px; border-top: 1px solid #e1e5e9;">
                <div style="color: #666; font-size: 14px;">
                    <div>${new Date(order.created_at).toLocaleString('tr-TR')}</div>
                    ${order.courier ? `
                        <div>
                            <i class="fas fa-motorcycle"></i> Kurye: ${order.courier.full_name}
                        </div>
                    ` : order.courier_name ? `
                        <div>
                            <i class="fas fa-motorcycle"></i> Kurye: ${order.courier_name}
                        </div>
                    ` : `
                        <div>
                            <i class="fas fa-clock"></i> Kurye atanacak
                        </div>
                    `}
                    ${order.payment_method ? `
                        <div>Ödeme: ${this.getPaymentMethodText(order.payment_method)}</div>
                    ` : ''}
                </div>
                <div class="order-actions">
                    ${order.status === 'delivered' ? `
                        <button class="btn btn-sm btn-success" onclick="customerPanel.rateOrder('${order.id}')">
                            <i class="fas fa-star"></i> Değerlendir
                        </button>
                    ` : ''}
                    ${['pending', 'confirmed'].includes(order.status) ? `
                        <button class="btn btn-sm btn-danger" onclick="customerPanel.cancelOrder('${order.id}')">
                            <i class="fas fa-times"></i> İptal Et
                        </button>
                    ` : ''}
                </div>
            </div>
            
            ${order.customer_notes ? `
                <div style="margin-top: 10px; padding: 10px; background: #fff3cd; border-radius: 5px; font-size: 14px;">
                    <strong>Notunuz:</strong> ${order.customer_notes}
                </div>
            ` : ''}
        </div>
    `).join('');
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

        // Sadece customers tablosundaki ana adresi göster
        const mainAddress = {
            id: 'main',
            title: 'Ana Adresim',
            address: this.customerData.address || '',
            city: this.customerData.city || '',
            district: this.customerData.district || '',
            is_default: true,
            type: 'main'
        };

        this.renderCustomerAddresses([mainAddress]);
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
    // Mevcut adres bilgilerini al
    const currentAddress = this.customerData.address || '';
    const currentCity = this.customerData.city || '';
    const currentDistrict = this.customerData.district || '';

    // Basit prompt yerine daha kullanıcı dostu bir modal gösterilebilir
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

        // Yerel veriyi güncelle
        this.customerData.address = newAddress;
        this.customerData.city = newCity;
        this.customerData.district = newDistrict;

        window.panelSystem.showAlert('Adres bilgileriniz güncellendi!', 'success');
        
        // Adresleri yeniden yükle
        await this.loadCustomerAddressesData();

    } catch (error) {
        console.error('Adres güncelleme hatası:', error);
        window.panelSystem.showAlert('Adres güncellenemedi!', 'error');
    }
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

// AddAddress fonksiyonunu da güncelle - artık sadece düzenleme yapacak
showAddAddressModal() {
    this.editAddress(this.customerData.id);
}

// DeleteAddress fonksiyonunu kaldır veya gizle
deleteAddress(addressId) {
    // Customers tablosunda sadece bir adres olduğu için silme işlemi yapılmıyor
    // Sadece adres bilgilerini temizleme seçeneği sunulabilir
    if (confirm('Adres bilgilerinizi temizlemek istediğinizden emin misiniz?')) {
        this.clearAddress();
    }
}

async clearAddress() {
    try {
        const { error } = await this.supabase
            .from('customers')
            .update({
                address: null,
                city: null,
                district: null,
                updated_at: new Date().toISOString()
            })
            .eq('id', this.customerData.id);

        if (error) throw error;

        // Yerel veriyi güncelle
        this.customerData.address = null;
        this.customerData.city = null;
        this.customerData.district = null;

        window.panelSystem.showAlert('Adres bilgileriniz temizlendi!', 'success');
        await this.loadCustomerAddressesData();

    } catch (error) {
        console.error('Adres temizleme hatası:', error);
        window.panelSystem.showAlert('Adres temizlenemedi!', 'error');
    }
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
            'credit_card': 'Kredi Kartı',
            'online': 'Online Ödeme'
        };
        return methodMap[method] || method;
    }

    // Sipariş iptal etme
    async cancelOrder(orderId) {
        if (!confirm('Bu siparişi iptal etmek istediğinizden emin misiniz?')) {
            return;
        }

        try {
            const reason = prompt('İptal nedeni:');
            if (!reason) return;

            const { error } = await this.supabase
                .from('orders')
                .update({
                    status: 'cancelled',
                    cancellation_reason: reason,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert('Sipariş iptal edildi.', 'success');
            await this.loadAllCustomerOrders();

        } catch (error) {
            console.error('Sipariş iptal hatası:', error);
            window.panelSystem.showAlert('Sipariş iptal edilemedi!', 'error');
        }
    }

    // Sipariş değerlendirme
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

    // Adres yönetimi metodları
    showAddAddressModal() {
        alert('Adres ekleme özelliği yakında eklenecek!');
    }

    editAddress(addressId) {
        alert(`Adres düzenleme (ID: ${addressId}) yakında eklenecek!`);
    }

    deleteAddress(addressId) {
        if (confirm('Bu adresi silmek istediğinizden emin misiniz?')) {
            alert(`Adres silindi (ID: ${addressId})`);
            this.loadCustomerAddressesData();
        }
    }
}

// Global instance
if (typeof window.customerPanel === 'undefined') {
    window.customerPanel = null;
}
