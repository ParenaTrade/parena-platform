// İki nokta arası mesafe hesaplama (Haversine formülü)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Dünya'nın yarıçapı (km)
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // km cinsinden mesafe
    return distance;
}

// Kurye ile satıcı arasındaki mesafeyi kontrol et
async function checkCourierSellerDistance(courierId, sellerId) {
    try {
        // Kurye konumunu al
        const { data: courier, error: courierError } = await supabase
            .from('couriers')
            .select('latitude, longitude')
            .eq('id', courierId)
            .single();

        if (courierError) throw courierError;

        // Satıcı konumunu al
        const { data: seller, error: sellerError } = await supabase
            .from('seller_profiles')
            .select('latitude, longitude')
            .eq('id', sellerId)
            .single();

        if (sellerError) throw sellerError;

        // Mesafe hesapla
        if (courier.latitude && courier.longitude && seller.latitude && seller.longitude) {
            const distance = calculateDistance(
                courier.latitude, courier.longitude,
                seller.latitude, seller.longitude
            );
            return distance;
        }

        return null; // Konum bilgisi yoksa

    } catch (error) {
        console.error('Mesafe hesaplama hatası:', error);
        return null;
    }
}