// Kurye paneli - Konum takibi (latitude/longitude ile)
class CourierPanel extends BasePanel {
    constructor() {
        super();
        this.locationWatchId = null;
    }

    initializeRoleSpecificFeatures() {
        super.initializeRoleSpecificFeatures();
        this.loadCourierData();
        this.initializeLocationTracking();
        this.setupCourierUI();
    }

    async loadCourierData() {
        if (this.userProfile.courier_id) {
            const { data: courier, error } = await supabase
                .from('couriers')
                .select('*')
                .eq('id', this.userProfile.courier_id)
                .single();

            if (courier && !error) {
                this.currentCourier = courier;
                this.populateCourierForm(courier);
                this.updateOnlineStatus(courier.is_online);
            }
        }
    }

    setupCourierUI() {
        // Online/Offline butonu
        const onlineToggle = document.getElementById('onlineToggle');
        if (onlineToggle) {
            onlineToggle.addEventListener('click', () => {
                this.toggleOnlineStatus();
            });
        }
    }

    async toggleOnlineStatus() {
        const newStatus = !this.currentCourier.is_online;
        
        try {
            const { error } = await supabase
                .from('couriers')
                .update({ 
                    is_online: newStatus,
                    status: newStatus ? 'active' : 'offline'
                })
                .eq('id', this.userProfile.courier_id);

            if (error) throw error;

            this.currentCourier.is_online = newStatus;
            this.updateOnlineStatus(newStatus);

            if (newStatus) {
                this.startLocationTracking();
                this.showAlert('Çevrimiçi duruma geçildi. Teslimatlar bekleniyor...', 'success');
            } else {
                this.stopLocationTracking();
                this.showAlert('Çevrimdışı duruma geçildi.', 'info');
            }

        } catch (error) {
            console.error('Çevrimiçi durum güncelleme hatası:', error);
            this.showAlert('Durum güncellenirken hata oluştu.', 'error');
        }
    }

    updateOnlineStatus(isOnline) {
        const onlineToggle = document.getElementById('onlineToggle');
        const statusBadge = document.getElementById('courierStatusBadge');
        
        if (onlineToggle) {
            onlineToggle.innerHTML = isOnline ? 
                '<i class="fas fa-toggle-on"></i> Çevrimiçi' : 
                '<i class="fas fa-toggle-off"></i> Çevrimdışı';
            onlineToggle.className = `btn ${isOnline ? 'btn-success' : 'btn-secondary'}`;
        }
        
        if (statusBadge) {
            statusBadge.textContent = isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
            statusBadge.className = `status-badge ${isOnline ? 'status-active' : 'status-inactive'}`;
        }
    }

    initializeLocationTracking() {
        // Eğer kurye çevrimiçiyse konum takibini başlat
        if (this.currentCourier?.is_online) {
            this.startLocationTracking();
        }
    }

    startLocationTracking() {
        if (!navigator.geolocation) {
            this.showAlert('Konum servisi desteklenmiyor.', 'error');
            return;
        }

        this.locationWatchId = navigator.geolocation.watchPosition(
            (position) => {
                this.updateCourierLocation(position);
            },
            (error) => {
                console.error('Konum takip hatası:', error);
                this.showAlert('Konum takip edilemiyor.', 'error');
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );

        console.log('Konum takibi başlatıldı');
    }

    stopLocationTracking() {
        if (this.locationWatchId) {
            navigator.geolocation.clearWatch(this.locationWatchId);
            this.locationWatchId = null;
            console.log('Konum takibi durduruldu');
        }
    }

    async updateCourierLocation(position) {
        const { latitude, longitude } = position.coords;
        
        try {
            const { error } = await supabase
                .from('couriers')
                .update({
                    latitude: latitude,
                    longitude: longitude,
                    updated_at: new Date().toISOString()
                })
                .eq('id', this.userProfile.courier_id);

            if (error) throw error;

            // UI'da konumu göster (opsiyonel)
            this.updateLocationUI(latitude, longitude);

        } catch (error) {
            console.error('Konum güncelleme hatası:', error);
        }
    }

    updateLocationUI(lat, lng) {
        const locationElement = document.getElementById('currentLocation');
        if (locationElement) {
            locationElement.textContent = `Enlem: ${lat.toFixed(6)}, Boylam: ${lng.toFixed(6)}`;
        }
    }

    populateCourierForm(courierData) {
        // Kurye bilgilerini forma doldur
        const elements = {
            'courierFullName': courierData.full_name,
            'courierPhone': courierData.phone,
            'courierEmail': courierData.email,
            'courierVehicleType': courierData.vehicle_type,
            'courierVehiclePlate': courierData.vehicle_plate,
            'courierIdentity': courierData.identity_number
        };

        Object.keys(elements).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                element.value = elements[id] || '';
            }
        });

        // Rating göster
        const ratingElement = document.getElementById('courierRating');
        if (ratingElement && courierData.rating) {
            ratingElement.innerHTML = this.generateStarRating(courierData.rating);
        }

        // İstatistikleri göster
        this.updateCourierStats(courierData);
    }

    generateStarRating(rating) {
        const fullStars = Math.floor(rating);
        const halfStar = rating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (halfStar ? 1 : 0);

        let stars = '';
        
        // Tam yıldızlar
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star" style="color: gold;"></i>';
        }
        
        // Yarım yıldız
        if (halfStar) {
            stars += '<i class="fas fa-star-half-alt" style="color: gold;"></i>';
        }
        
        // Boş yıldızlar
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star" style="color: gold;"></i>';
        }
        
        return stars + ` <small>(${rating})</small>`;
    }

    updateCourierStats(courierData) {
        const stats = {
            'totalDeliveries': courierData.total_deliveries || 0,
            'totalEarnings': courierData.earned_amount || 0,
            'completedToday': 0, // Bugünkü teslimatlar için ayrı sorgu gerekir
            'earnedToday': 0
        };

        Object.keys(stats).forEach(id => {
            const element = document.getElementById(id);
            if (element) {
                if (id.includes('Earnings')) {
                    element.textContent = this.formatMoney(stats[id]);
                } else {
                    element.textContent = stats[id];
                }
            }
        });
    }

    formatMoney(amount) {
        return new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
        }).format(amount);
    }

    showAlert(message, type) {
        // Alert gösterme fonksiyonu
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 15px 20px;
            background: ${type === 'success' ? '#d4edda' : type === 'error' ? '#f8d7da' : '#d1ecf1'};
            color: ${type === 'success' ? '#155724' : type === 'error' ? '#721c24' : '#0c5460'};
            border: 1px solid ${type === 'success' ? '#c3e6cb' : type === 'error' ? '#f5c6cb' : '#bee5eb'};
            border-radius: 5px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        alertDiv.textContent = message;
        
        document.body.appendChild(alertDiv);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // Panel kapatıldığında konum takibini durdur
    destroy() {
        this.stopLocationTracking();
        super.destroy();
    }
}