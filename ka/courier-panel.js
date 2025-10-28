class CourierPanel {
    constructor(userProfile) {
        this.userProfile = userProfile;
        this.courierData = null;
        this.currentDeliveries = [];
        this.supabase = window.SUPABASE_CLIENT;
        
        this.init();
    }

    async init() {
        await this.loadCourierData();
        await this.loadCurrentDeliveries();
    }

    // Kurye verilerini yükle
    async loadCourierData() {
        try {
            const { data, error } = await this.supabase
                .from('couriers')
                .select('*')
                .eq('phone', this.userProfile.phone)
                .single();

            if (error) throw error;
            this.courierData = data;

        } catch (error) {
            console.error('Kurye verisi yükleme hatası:', error);
        }
    }

    // Aktif teslimatları getir
    async loadCurrentDeliveries() {
        try {
            const { data: orders, error } = await this.supabase
                .from('orders')
                .select(`
                    *,
                    customer:customers(name, phone),
                    seller:seller_profiles(business_name, address)
                `)
                .eq('courier_id', this.courierData.id)
                .in('status', ['on_the_way', 'ready'])
                .order('created_at', { ascending: true });

            if (error) throw error;
            this.currentDeliveries = orders || [];

        } catch (error) {
            console.error('Teslimatları yükleme hatası:', error);
        }
    }

    // Teslimat durumunu güncelle
    async updateDeliveryStatus(orderId, newStatus) {
        try {
            const { error } = await this.supabase
                .from('orders')
                .update({
                    status: newStatus,
                    updated_at: new Date().toISOString(),
                    ...(newStatus === 'delivered' && {
                        actual_delivery_time: new Date().toISOString()
                    })
                })
                .eq('id', orderId);

            if (error) throw error;

            // Eğer teslimat tamamlandıysa, kuryenin teslimat sayısını azalt
            if (newStatus === 'delivered') {
                await window.orderSystem.updateCourierDeliveryCount(this.courierData.id, -1);
            }

            window.panelSystem.showAlert(`Teslimat durumu güncellendi: ${this.getStatusText(newStatus)}`, 'success');
            await this.loadCurrentDeliveries();

        } catch (error) {
            console.error('Teslimat durumu güncelleme hatası:', error);
            window.panelSystem.showAlert('Durum güncellenemedi!', 'error');
        }
    }

    // Çevrimiçi/çevrimdışı durumu
    async toggleOnlineStatus(isOnline) {
        try {
            const { error } = await this.supabase
                .from('couriers')
                .update({
                    is_online: isOnline,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.courierData.id);

            if (error) throw error;

            this.courierData.is_online = isOnline;
            window.panelSystem.showAlert(
                isOnline ? 'Çevrimiçi oldunuz!' : 'Çevrimdışı oldunuz!', 
                'success'
            );

        } catch (error) {
            console.error('Durum güncelleme hatası:', error);
            window.panelSystem.showAlert('Durum güncellenemedi!', 'error');
        }
    }

    async loadSectionData(sectionName) {
        const section = document.getElementById(sectionName + 'Section');
        
        switch (sectionName) {
            case 'courierDashboard':
                await this.loadCourierDashboard();
                break;
            case 'courierInfo':
                await this.loadCourierInfo();
                break;
            case 'courierDeliveries':
                await this.loadCourierDeliveries();
                break;
            case 'courierEarnings':
                await this.loadCourierEarnings();
                break;
        }
    }

    async loadCourierDashboard() {
        const section = document.getElementById('courierDashboardSection');
        section.innerHTML = `
            <h1>Kurye Paneli</h1>
            <p class="subtitle">Teslimatlarınız ve kazançlarınız</p>
            
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon primary">
                        <i class="fas fa-truck"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="todayDeliveries">0</h3>
                        <p>Bugünkü Teslimat</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon success">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="todayEarnings">0 ₺</h3>
                        <p>Bugünkü Kazanç</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon warning">
                        <i class="fas fa-clock"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="activeDeliveries">0</h3>
                        <p>Aktif Teslimat</p>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon danger">
                        <i class="fas fa-star"></i>
                    </div>
                    <div class="stat-info">
                        <h3 id="courierRating">${this.courierData?.rating || '0.0'}</h3>
                        <p>Puanım</p>
                    </div>
                </div>
            </div>

            <div class="online-toggle-container" style="text-align: center; margin: 30px 0;">
                <button class="btn btn-lg ${this.courierData?.is_online ? 'btn-success' : 'btn-secondary'}" 
                        id="onlineToggle" style="padding: 15px 30px; font-size: 18px;">
                    <i class="fas fa-${this.courierData?.is_online ? 'toggle-on' : 'toggle-off'}"></i>
                    <span>${this.courierData?.is_online ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
                </button>
            </div>

            <div class="content-row">
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>Atanan Teslimatlar</h3>
                        </div>
                        <div class="card-body">
                            <div id="assignedDeliveries">
                                <div class="loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Teslimatlar yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="content-col">
                    <div class="card">
                        <div class="card-header">
                            <h3>Bugünkü Teslimatlarım</h3>
                        </div>
                        <div class="card-body">
                            <div id="todayDeliveriesList">
                                <div class="loading-spinner">
                                    <i class="fas fa-spinner fa-spin"></i>
                                    <p>Teslimatlar yükleniyor...</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        await this.loadCourierStats();
        await this.loadAssignedDeliveries();
        await this.loadTodayDeliveries();

        // Online toggle event
        document.getElementById('onlineToggle').addEventListener('click', () => {
            this.toggleOnlineStatus();
        });
    }

    async loadCourierStats() {
        const today = new Date().toISOString().split('T')[0];
        
        // Bugünkü teslimatlar
        const { data: todayDeliveries, error } = await supabase
            .from('orders')
            .select('id, courier_fee, status')
            .eq('courier_id', this.courierData?.id)
            .gte('created_at', today)
            .neq('status', 'cancelled');

        if (!error) {
            document.getElementById('todayDeliveries').textContent = todayDeliveries.length;
            
            const todayEarnings = todayDeliveries.reduce((sum, order) => 
                sum + parseFloat(order.courier_fee || 0), 0);
            document.getElementById('todayEarnings').textContent = 
                todayEarnings.toFixed(2) + ' ₺';
        }

        // Aktif teslimatlar
        const { data: activeDeliveries, error: activeError } = await supabase
            .from('orders')
            .select('id')
            .eq('courier_id', this.courierData?.id)
            .in('status', ['assigned', 'ready', 'on_the_way']);

        if (!activeError) {
            document.getElementById('activeDeliveries').textContent = activeDeliveries.length;
        }
    }

    async loadAssignedDeliveries() {
        const { data: deliveries, error } = await supabase
            .from('orders')
            .select(`
                *,
                seller:seller_profiles(business_name, address, phone),
                customer:customers(name, phone)
            `)
            .eq('courier_id', this.courierData?.id)
            .in('status', ['assigned', 'ready'])
            .order('created_at', { ascending: true });

        const container = document.getElementById('assignedDeliveries');
        
        if (error || !deliveries.length) {
            container.innerHTML = '<p class="text-muted">Atanmış teslimatınız bulunmuyor.</p>';
            return;
        }

        container.innerHTML = deliveries.map(delivery => `
            <div class="delivery-card" style="border: 1px solid #e1e5e9; border-radius: 8px; padding: 15px; margin-bottom: 10px;">
                <div class="delivery-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                    <strong>Teslimat #${delivery.id.slice(-8)}</strong>
                    <span class="status-badge status-${delivery.status}">
                        ${this.getStatusText(delivery.status)}
                    </span>
                </div>
                <div class="delivery-details" style="color: #666; font-size: 14px;">
                    <div><strong>Müşteri:</strong> ${delivery.customer?.name || delivery.customer_name}</div>
                    <div><strong>Satıcı:</strong> ${delivery.seller?.business_name}</div>
                    <div><strong>Adres:</strong> ${delivery.delivery_address}</div>
                    <div><strong>Ücret:</strong> ${parseFloat(delivery.courier_fee).toFixed(2)} ₺</div>
                </div>
                <div class="delivery-actions" style="margin-top: 10px; display: flex; gap: 10px;">
                    ${delivery.status === 'ready' ? `
                        <button class="btn btn-success btn-sm" onclick="courierPanel.updateDeliveryStatus('${delivery.id}', 'on_the_way')">
                            <i class="fas fa-play"></i> Teslimata Başla
                        </button>
                    ` : ''}
                    ${delivery.status === 'on_the_way' ? `
                        <button class="btn btn-primary btn-sm" onclick="courierPanel.completeDelivery('${delivery.id}')">
                            <i class="fas fa-check"></i> Teslim Et
                        </button>
                    ` : ''}
                    <button class="btn btn-info btn-sm" onclick="courierPanel.viewDeliveryDetails('${delivery.id}')">
                        <i class="fas fa-info"></i> Detaylar
                    </button>
                </div>
            </div>
        `).join('');
    }

    async loadTodayDeliveries() {
        const today = new Date().toISOString().split('T')[0];
        
        const { data: deliveries, error } = await supabase
            .from('orders')
            .select(`
                id,
                status,
                created_at,
                total_amount,
                courier_fee,
                customer:customers(name),
                seller:seller_profiles(business_name)
            `)
            .eq('courier_id', this.courierData?.id)
            .gte('created_at', today)
            .order('created_at', { ascending: false });

        const container = document.getElementById('todayDeliveriesList');
        
        if (error || !deliveries.length) {
            container.innerHTML = '<p class="text-muted">Bugünkü teslimatınız bulunmuyor.</p>';
            return;
        }

        container.innerHTML = deliveries.map(delivery => `
            <div class="delivery-item" style="border-bottom: 1px solid #eee; padding: 10px 0;">
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <div>
                        <div style="font-weight: 500;">${delivery.seller?.business_name}</div>
                        <div style="font-size: 12px; color: #666;">
                            ${delivery.customer?.name} • ${parseFloat(delivery.courier_fee).toFixed(2)} ₺
                        </div>
                    </div>
                    <span class="status-badge status-${delivery.status}">
                        ${this.getStatusText(delivery.status)}
                    </span>
                </div>
                <div style="font-size: 12px; color: #999; margin-top: 5px;">
                    ${new Date(delivery.created_at).toLocaleTimeString('tr-TR')}
                </div>
            </div>
        `).join('');
    }

    async toggleOnlineStatus() {
        const newStatus = !this.courierData?.is_online;
        
        try {
            const { error } = await supabase
                .from('couriers')
                .update({ 
                    is_online: newStatus,
                    status: newStatus ? 'active' : 'offline',
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.courierData.id);

            if (error) throw error;

            // Update local data
            this.courierData.is_online = newStatus;
            this.courierData.status = newStatus ? 'active' : 'offline';

            // Update UI
            const toggleBtn = document.getElementById('onlineToggle');
            toggleBtn.className = `btn btn-lg ${newStatus ? 'btn-success' : 'btn-secondary'}`;
            toggleBtn.innerHTML = `
                <i class="fas fa-${newStatus ? 'toggle-on' : 'toggle-off'}"></i>
                <span>${newStatus ? 'Çevrimiçi' : 'Çevrimdışı'}</span>
            `;

            window.panelSystem.showAlert(
                newStatus ? 'Çevrimiçi duruma geçildi' : 'Çevrimdışı duruma geçildi', 
                'success'
            );

        } catch (error) {
            console.error('Durum güncelleme hatası:', error);
            window.panelSystem.showAlert('Durum güncellenemedi!', 'error');
        }
    }

    async updateDeliveryStatus(orderId, newStatus) {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ 
                    status: newStatus,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            window.panelSystem.showAlert(`Teslimat durumu güncellendi: ${this.getStatusText(newStatus)}`, 'success');
            
            // Reload deliveries
            await this.loadAssignedDeliveries();
            await this.loadTodayDeliveries();

        } catch (error) {
            console.error('Teslimat durumu güncelleme hatası:', error);
            window.panelSystem.showAlert('Teslimat durumu güncellenemedi!', 'error');
        }
    }

    async completeDelivery(orderId) {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ 
                    status: 'delivered',
                    actual_delivery_time: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            // Create earning record
            const order = await this.getOrderDetails(orderId);
            if (order) {
                await supabase
                    .from('courier_earnings')
                    .insert([{
                        courier_id: this.courierData.id,
                        order_id: orderId,
                        amount: order.courier_fee,
                        fee_type: 'delivery_fee',
                        status: 'pending',
                        created_at: new Date().toISOString()
                    }]);
            }

            window.panelSystem.showAlert('Teslimat tamamlandı!', 'success');
            
            // Reload data
            await this.loadAssignedDeliveries();
            await this.loadTodayDeliveries();
            await this.loadCourierStats();

        } catch (error) {
            console.error('Teslimat tamamlama hatası:', error);
            window.panelSystem.showAlert('Teslimat tamamlanamadı!', 'error');
        }
    }

    async getOrderDetails(orderId) {
        const { data, error } = await supabase
            .from('orders')
            .select('courier_fee')
            .eq('id', orderId)
            .single();

        return data;
    }

    async loadCourierInfo() {
        const section = document.getElementById('courierInfoSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>Profil Bilgilerim</h2>
            </div>
            <div class="card">
                <div class="card-body">
                    <form id="courierInfoForm">
                        <div class="form-row">
                            <div class="form-group">
                                <label for="courierFullName">Ad Soyad</label>
                                <input type="text" id="courierFullName" class="form-control" value="${this.courierData?.full_name || ''}">
                            </div>
                            <div class="form-group">
                                <label for="courierPhone">Telefon</label>
                                <input type="text" id="courierPhone" class="form-control" value="${this.courierData?.phone || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="courierEmail">E-posta</label>
                                <input type="email" id="courierEmail" class="form-control" value="${this.courierData?.email || ''}">
                            </div>
                            <div class="form-group">
                                <label for="courierIdentity">TC Kimlik No</label>
                                <input type="text" id="courierIdentity" class="form-control" value="${this.courierData?.identity_number || ''}">
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label for="vehicleType">Araç Tipi</label>
                                <select id="vehicleType" class="form-control">
                                    <option value="motorcycle" ${this.courierData?.vehicle_type === 'motorcycle' ? 'selected' : ''}>Motosiklet</option>
                                    <option value="car" ${this.courierData?.vehicle_type === 'car' ? 'selected' : ''}>Araba</option>
                                    <option value="bicycle" ${this.courierData?.vehicle_type === 'bicycle' ? 'selected' : ''}>Bisiklet</option>
                                    <option value="foot" ${this.courierData?.vehicle_type === 'foot' ? 'selected' : ''}>Yaya</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label for="vehiclePlate">Plaka</label>
                                <input type="text" id="vehiclePlate" class="form-control" value="${this.courierData?.vehicle_plate || ''}">
                            </div>
                        </div>
                        <button type="submit" class="btn btn-primary">
                            <i class="fas fa-save"></i> Bilgileri Güncelle
                        </button>
                    </form>
                </div>
            </div>
        `;

        // Form submit event
        document.getElementById('courierInfoForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            await this.updateCourierInfo();
        });
    }

    async updateCourierInfo() {
        const formData = {
            full_name: document.getElementById('courierFullName').value,
            phone: document.getElementById('courierPhone').value,
            email: document.getElementById('courierEmail').value,
            identity_number: document.getElementById('courierIdentity').value,
            vehicle_type: document.getElementById('vehicleType').value,
            vehicle_plate: document.getElementById('vehiclePlate').value,
            updated_at: new Date().toISOString()
        };

        try {
            const { error } = await supabase
                .from('couriers')
                .update(formData)
                .eq('id', this.courierData.id);

            if (error) throw error;

            window.panelSystem.showAlert('Profil bilgileri güncellendi!', 'success');
            await this.loadCourierData(); // Reload data

        } catch (error) {
            console.error('Profil güncelleme hatası:', error);
            window.panelSystem.showAlert('Profil güncellenemedi!', 'error');
        }
    }

    async loadCourierDeliveries() {
        const section = document.getElementById('courierDeliveriesSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>Teslimatlarım</h2>
                <div class="header-actions">
                    <select id="deliveryStatusFilter" class="form-control">
                        <option value="">Tüm Teslimatlar</option>
                        <option value="assigned">Atanmış</option>
                        <option value="ready">Hazır</option>
                        <option value="on_the_way">Yolda</option>
                        <option value="delivered">Teslim Edildi</option>
                    </select>
                    <input type="date" id="deliveryDate" class="form-control">
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="table-responsive">
                        <table class="data-table" id="courierDeliveriesTable">
                            <thead>
                                <tr>
                                    <th>Teslimat No</th>
                                    <th>Müşteri</th>
                                    <th>Adres</th>
                                    <th>Ücret</th>
                                    <th>Durum</th>
                                    <th>Tarih</th>
                                    <th>İşlemler</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="7" class="text-center">
                                        <div class="loading-spinner">
                                            <i class="fas fa-spinner fa-spin"></i>
                                            <p>Teslimatlar yükleniyor...</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        await this.loadAllCourierDeliveries();
    }

    async loadAllCourierDeliveries() {
        const { data: deliveries, error } = await supabase
            .from('orders')
            .select(`
                *,
                customer:customers(name, phone),
                seller:seller_profiles(business_name)
            `)
            .eq('courier_id', this.courierData?.id)
            .order('created_at', { ascending: false });

        const tbody = document.querySelector('#courierDeliveriesTable tbody');
        
        if (error || !deliveries.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="7" class="text-center">
                        <p class="text-muted">Henüz teslimatınız bulunmuyor.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = deliveries.map(delivery => `
            <tr>
                <td>${delivery.id.slice(-8)}</td>
                <td>
                    <div>${delivery.customer?.name || delivery.customer_name}</div>
                    <div style="font-size: 12px; color: #666;">${delivery.customer?.phone || delivery.customer_phone}</div>
                </td>
                <td>${delivery.delivery_address}</td>
                <td>${parseFloat(delivery.courier_fee).toFixed(2)} ₺</td>
                <td>
                    <span class="status-badge status-${delivery.status}">
                        ${this.getStatusText(delivery.status)}
                    </span>
                </td>
                <td>${new Date(delivery.created_at).toLocaleDateString('tr-TR')}</td>
                <td>
                    <div style="display: flex; gap: 5px;">
                        <button class="btn btn-sm btn-info" onclick="courierPanel.viewDeliveryDetails('${delivery.id}')">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${delivery.status === 'ready' ? `
                            <button class="btn btn-sm btn-success" onclick="courierPanel.updateDeliveryStatus('${delivery.id}', 'on_the_way')">
                                <i class="fas fa-play"></i>
                            </button>
                        ` : ''}
                        ${delivery.status === 'on_the_way' ? `
                            <button class="btn btn-sm btn-primary" onclick="courierPanel.completeDelivery('${delivery.id}')">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `).join('');
    }

    async loadCourierEarnings() {
        const section = document.getElementById('courierEarningsSection');
        section.innerHTML = `
            <div class="section-header">
                <h2>Kazançlarım</h2>
                <div class="header-actions">
                    <input type="month" id="earningMonth" class="form-control">
                    <button class="btn btn-primary" id="viewEarningsBtn">
                        <i class="fas fa-search"></i> Göster
                    </button>
                </div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="earnings-summary">
                        <div class="earning-item">
                            <span>Toplam Kazanç:</span>
                            <strong id="totalEarnings">0 ₺</strong>
                        </div>
                        <div class="earning-item">
                            <span>Bu Ay:</span>
                            <strong id="monthlyEarnings">0 ₺</strong>
                        </div>
                        <div class="earning-item">
                            <span>Ödenen:</span>
                            <strong id="paidEarnings">0 ₺</strong>
                        </div>
                        <div class="earning-item">
                            <span>Bekleyen:</span>
                            <strong id="pendingEarnings">0 ₺</strong>
                        </div>
                    </div>
                    <div class="table-responsive">
                        <table class="data-table" id="earningsTable">
                            <thead>
                                <tr>
                                    <th>Tarih</th>
                                    <th>Teslimat No</th>
                                    <th>Tutar</th>
                                    <th>Tür</th>
                                    <th>Durum</th>
                                    <th>Açıklama</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td colspan="6" class="text-center">
                                        <div class="loading-spinner">
                                            <i class="fas fa-spinner fa-spin"></i>
                                            <p>Kazançlar yükleniyor...</p>
                                        </div>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;

        await this.loadEarningsData();
        
        // Filter event
        document.getElementById('viewEarningsBtn').addEventListener('click', () => {
            this.filterEarnings();
        });
    }

    async loadEarningsData() {
        const { data: earnings, error } = await supabase
            .from('courier_earnings')
            .select(`
                *,
                order:orders(id, customer_name)
            `)
            .eq('courier_id', this.courierData?.id)
            .order('created_at', { ascending: false });

        if (!error && earnings) {
            this.renderEarningsTable(earnings);
            this.updateEarningsSummary(earnings);
        }
    }

    renderEarningsTable(earnings) {
        const tbody = document.querySelector('#earningsTable tbody');
        
        if (!earnings.length) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="text-center">
                        <p class="text-muted">Henüz kazancınız bulunmuyor.</p>
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = earnings.map(earning => `
            <tr>
                <td>${new Date(earning.created_at).toLocaleDateString('tr-TR')}</td>
                <td>${earning.order?.id.slice(-8) || '-'}</td>
                <td>${parseFloat(earning.amount).toFixed(2)} ₺</td>
                <td>
                    <span class="badge badge-${earning.fee_type === 'delivery_fee' ? 'primary' : 'success'}">
                        ${earning.fee_type === 'delivery_fee' ? 'Teslimat' : 'Bonus'}
                    </span>
                </td>
                <td>
                    <span class="status-badge status-${earning.status}">
                        ${earning.status === 'pending' ? 'Bekliyor' : earning.status === 'paid' ? 'Ödendi' : 'İptal'}
                    </span>
                </td>
                <td>${earning.description || '-'}</td>
            </tr>
        `).join('');
    }

    updateEarningsSummary(earnings) {
        const totalEarnings = earnings.reduce((sum, earning) => sum + parseFloat(earning.amount || 0), 0);
        document.getElementById('totalEarnings').textContent = totalEarnings.toFixed(2) + ' ₺';

        const thisMonth = new Date().getMonth();
        const monthlyEarnings = earnings
            .filter(earning => new Date(earning.created_at).getMonth() === thisMonth)
            .reduce((sum, earning) => sum + parseFloat(earning.amount || 0), 0);
        document.getElementById('monthlyEarnings').textContent = monthlyEarnings.toFixed(2) + ' ₺';

        const paidEarnings = earnings
            .filter(earning => earning.status === 'paid')
            .reduce((sum, earning) => sum + parseFloat(earning.amount || 0), 0);
        document.getElementById('paidEarnings').textContent = paidEarnings.toFixed(2) + ' ₺';

        const pendingEarnings = earnings
            .filter(earning => earning.status === 'pending')
            .reduce((sum, earning) => sum + parseFloat(earning.amount || 0), 0);
        document.getElementById('pendingEarnings').textContent = pendingEarnings.toFixed(2) + ' ₺';
    }

    async filterEarnings() {
        const month = document.getElementById('earningMonth').value;
        // Filtreleme işlemi burada yapılacak
        window.panelSystem.showAlert('Filtreleme özelliği yakında eklenecek!', 'info');
    }

    async viewDeliveryDetails(orderId) {
        window.panelSystem.showAlert('Teslimat detayları yakında eklenecek!', 'info');
    }

    getStatusText(status) {
        const statusMap = {
            'pending': 'Bekliyor',
            'confirmed': 'Onaylandı',
            'preparing': 'Hazırlanıyor',
            'ready': 'Hazır',
            'assigned': 'Atandı',
            'on_the_way': 'Yolda',
            'delivered': 'Teslim Edildi',
            'cancelled': 'İptal Edildi'
        };
        return statusMap[status] || status;
    }
}

// Global instance
if (typeof window.courierPanel === 'undefined') {
    window.courierPanel = null;
}
