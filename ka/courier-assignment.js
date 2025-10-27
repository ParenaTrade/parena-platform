class CourierAssignmentSystem {
    constructor() {
        this.availableCouriers = [];
    }

    // Otomatik kurye atama algoritması
    async assignBestCourier(orderId, sellerLocation) {
        try {
            // Müsait kuryeleri getir
            await this.loadAvailableCouriers(sellerLocation);
            
            if (this.availableCouriers.length === 0) {
                console.log('Müsait kurye bulunamadı');
                return null;
            }

            // En uygun kuryeyi seç
            const bestCourier = await this.selectBestCourier(orderId, sellerLocation);
            
            if (bestCourier) {
                await this.assignCourierToOrder(orderId, bestCourier.id);
                return bestCourier;
            }

            return null;

        } catch (error) {
            console.error('Kurye atama hatası:', error);
            return null;
        }
    }

    async loadAvailableCouriers(sellerLocation) {
        const { data: couriers, error } = await supabase
            .from('couriers')
            .select(`
                *,
                location:courier_locations(latitude, longitude)
            `)
            .eq('is_online', true)
            .eq('status', 'active')
            .lt('current_deliveries', 5); // Maksimum 5 aktif teslimat

        if (!error) {
            this.availableCouriers = couriers || [];
            
            // Konuma göre sırala (en yakından en uzağa)
            if (sellerLocation && sellerLocation.latitude && sellerLocation.longitude) {
                this.availableCouriers = this.sortCouriersByDistance(
                    this.availableCouriers, 
                    sellerLocation
                );
            }
        }
    }

    sortCouriersByDistance(couriers, sellerLocation) {
        return couriers.map(courier => {
            let distance = 999; // Varsayılan büyük mesafe
            
            if (courier.location && courier.location.latitude && courier.location.longitude) {
                distance = this.calculateDistance(
                    sellerLocation.latitude,
                    sellerLocation.longitude,
                    courier.location.latitude,
                    courier.location.longitude
                );
            }
            
            return { ...courier, distance };
        }).sort((a, b) => a.distance - b.distance);
    }

    calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Dünya yarıçapı km
        const dLat = this.deg2rad(lat2 - lat1);
        const dLon = this.deg2rad(lon2 - lon1);
        
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        const distance = R * c; // km cinsinden mesafe
        
        return distance;
    }

    deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    async selectBestCourier(orderId, sellerLocation) {
        // Kuryeleri puanla
        const scoredCouriers = await Promise.all(
            this.availableCouriers.map(async courier => ({
                courier,
                score: await this.calculateCourierScore(courier, orderId, sellerLocation)
            }))
        );

        // En yüksek puanlı kuryeyi seç
        const bestCourier = scoredCouriers
            .sort((a, b) => b.score - a.score)
            .map(item => item.courier)[0];

        return bestCourier;
    }

    async calculateCourierScore(courier, orderId, sellerLocation) {
        let score = 0;

        // 1. Mesafe puanı (%40)
        if (courier.distance !== undefined) {
            const distanceScore = Math.max(0, 100 - (courier.distance * 10)); // 10km'ye kadar tam puan
            score += distanceScore * 0.4;
        }

        // 2. Performans puanı (%30)
        const performanceScore = this.calculatePerformanceScore(courier);
        score += performanceScore * 0.3;

        // 3. İş yükü puanı (%20)
        const workloadScore = this.calculateWorkloadScore(courier);
        score += workloadScore * 0.2;

        // 4. Deneyim puanı (%10)
        const experienceScore = this.calculateExperienceScore(courier);
        score += experienceScore * 0.1;

        return score;
    }

    calculatePerformanceScore(courier) {
        // Rating'e göre puanlama
        const rating = courier.rating || 5.0;
        return (rating / 5) * 100;
    }

    calculateWorkloadScore(courier) {
        // Aktif teslimat sayısına göre puanlama
        const currentDeliveries = courier.current_deliveries || 0;
        const maxDeliveries = 5; // Maksimum teslimat
        
        if (currentDeliveries >= maxDeliveries) return 0;
        return ((maxDeliveries - currentDeliveries) / maxDeliveries) * 100;
    }

    calculateExperienceScore(courier) {
        // Toplam teslimat sayısına göre puanlama
        const totalDeliveries = courier.total_deliveries || 0;
        
        if (totalDeliveries >= 100) return 100;
        return (totalDeliveries / 100) * 100;
    }

    async assignCourierToOrder(orderId, courierId) {
        try {
            const { error } = await supabase
                .from('orders')
                .update({ 
                    courier_id: courierId,
                    status: 'assigned',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            // Kuryenin aktif teslimat sayısını güncelle
            await this.updateCourierDeliveryCount(courierId, 'increment');

            console.log(`Kurye atandı: Order ${orderId} -> Courier ${courierId}`);
            return true;

        } catch (error) {
            console.error('Kurye atama hatası:', error);
            return false;
        }
    }

    async updateCourierDeliveryCount(courierId, operation) {
        const { data: courier } = await supabase
            .from('couriers')
            .select('current_deliveries')
            .eq('id', courierId)
            .single();

        if (courier) {
            let newCount = courier.current_deliveries || 0;
            
            if (operation === 'increment') {
                newCount += 1;
            } else if (operation === 'decrement' && newCount > 0) {
                newCount -= 1;
            }

            await supabase
                .from('couriers')
                .update({ 
                    current_deliveries: newCount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', courierId);
        }
    }

    // Manuel kurye atama
    async assignCourierManually(orderId, courierId) {
        return await this.assignCourierToOrder(orderId, courierId);
    }

    // Kurye atamasını kaldır
    async removeCourierAssignment(orderId) {
        try {
            const { data: order } = await supabase
                .from('orders')
                .select('courier_id')
                .eq('id', orderId)
                .single();

            if (order && order.courier_id) {
                // Kuryenin teslimat sayısını azalt
                await this.updateCourierDeliveryCount(order.courier_id, 'decrement');
            }

            const { error } = await supabase
                .from('orders')
                .update({ 
                    courier_id: null,
                    status: 'ready',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            return true;

        } catch (error) {
            console.error('Kurye ataması kaldırma hatası:', error);
            return false;
        }
    }
}

// Global instance
if (typeof window.courierAssignmentSystem === 'undefined') {
    window.courierAssignmentSystem = new CourierAssignmentSystem();
}