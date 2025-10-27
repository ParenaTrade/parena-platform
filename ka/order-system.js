// order-system.js - Yeni sipariş ve kurye yönetimi
class OrderSystem {
    constructor() {
        this.supabase = window.SUPABASE_CLIENT; // CONFIG'DEN
        this.config = window.CONFIG; // CONFIG'DEN
    }

    async createOrder(orderData) {
        // Sipariş oluşturma - courier_id OPSİYONEL
    }

    async assignCourierToOrder(orderId, courierId) {
        // Kurye atama - sonradan
    }
}
window.orderSystem = new OrderSystem();