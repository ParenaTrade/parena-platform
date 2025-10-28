class OrderSystem {
    constructor() {
        this.supabase = window.SUPABASE_CLIENT;
    }

    // Yeni sipariş oluştur (courier_id OPSİYONEL)
    async createOrder(orderData) {
        try {
            const orderPayload = {
                customer_id: orderData.customer_id,
                seller_id: orderData.seller_id,
                total_amount: orderData.total_amount,
                status: 'pending',
                payment_method: orderData.payment_method,
                delivery_address: orderData.delivery_address,
                customer_name: orderData.customer_name,
                customer_phone: orderData.customer_phone,
                // courier_id: null, // Başlangıçta null - sonradan atanacak
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: order, error } = await this.supabase
                .from('orders')
                .insert([orderPayload])
                .select()
                .single();

            if (error) throw error;

            // Order details ekle
            if (orderData.items && orderData.items.length > 0) {
                await this.addOrderDetails(order.id, orderData.items);
            }

            console.log('✅ Sipariş oluşturuldu:', order.id);
            return order;

        } catch (error) {
            console.error('❌ Sipariş oluşturma hatası:', error);
            throw error;
        }
    }

    // Kurye ata (sipariş hazır olduğunda)
    async assignCourierToOrder(orderId, courierId) {
        try {
            const { error } = await this.supabase
                .from('orders')
                .update({
                    courier_id: courierId,
                    status: 'on_the_way',
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId);

            if (error) throw error;

            // Kuryenin aktif teslimat sayısını güncelle
            await this.updateCourierDeliveryCount(courierId, 1);

            console.log(`✅ Kurye atandı: Order ${orderId} -> Courier ${courierId}`);
            return true;

        } catch (error) {
            console.error('❌ Kurye atama hatası:', error);
            throw error;
        }
    }

    // Otomatik kurye ata
    async assignCourierAutomatically(orderId, sellerLocation) {
        try {
            // Müsait kuryeleri getir
            const availableCouriers = await this.getAvailableCouriers(sellerLocation);
            
            if (availableCouriers.length === 0) {
                console.log('⚠️ Müsait kurye bulunamadı');
                return null;
            }

            // En uygun kuryeyi seç (en az teslimatı olan)
            const bestCourier = availableCouriers[0];
            
            // Kuryeyi ata
            await this.assignCourierToOrder(orderId, bestCourier.id);
            
            return bestCourier;

        } catch (error) {
            console.error('❌ Otomatik kurye atama hatası:', error);
            throw error;
        }
    }

    // Müsait kuryeleri getir
    async getAvailableCouriers(sellerLocation = null) {
        try {
            let query = this.supabase
                .from('couriers')
                .select('*')
                .eq('is_online', true)
                .eq('status', 'active')
                .lt('current_deliveries', 5) // Maksimum 5 teslimat
                .order('current_deliveries', { ascending: true });

            // Konum bazlı filtreleme (opsiyonel)
            if (sellerLocation) {
                // Burada konum bazlı algoritma eklenebilir
                console.log('📍 Konum bazlı kurye arama:', sellerLocation);
            }

            const { data: couriers, error } = await query;

            if (error) throw error;
            return couriers || [];

        } catch (error) {
            console.error('❌ Kurye listeleme hatası:', error);
            return [];
        }
    }

    // Kurye teslimat sayısını güncelle
    async updateCourierDeliveryCount(courierId, change) {
        try {
            // Mevcut teslimat sayısını al
            const { data: courier, error } = await this.supabase
                .from('couriers')
                .select('current_deliveries')
                .eq('id', courierId)
                .single();

            if (error) throw error;

            const newCount = Math.max(0, (courier.current_deliveries || 0) + change);

            const { error: updateError } = await this.supabase
                .from('couriers')
                .update({
                    current_deliveries: newCount,
                    updated_at: new Date().toISOString()
                })
                .eq('id', courierId);

            if (updateError) throw updateError;

            console.log(`✅ Kurye teslimat sayısı güncellendi: ${courierId} -> ${newCount}`);

        } catch (error) {
            console.error('❌ Kurye güncelleme hatası:', error);
            throw error;
        }
    }
}

// Global instance
window.orderSystem = new OrderSystem();
