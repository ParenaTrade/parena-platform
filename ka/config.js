// Configuration File - Tüm sistem ayarları burada
const CONFIG = {
    // Supabase configuration
    SUPABASE: {
        url: "https://xliutvspwodhoaxvysks.supabase.co",
        key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXV0dnNwd29kaG9heHZ5c2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTgyOTksImV4cCI6MjA3MjkzNDI5OX0.Zodisa_ifP8t2Q4X0ecnB56RiR_Bg4QS5gvPn5ZLK_w"
    },
    
    // System constants
    SYSTEM: {
        ORDER_TIMEOUT: 10 * 60 * 1000, // 10 minutes
        MAX_DELIVERY_DISTANCE: 10, // km
        COMMISSION_RATE: 0.15, // 15%
        COURIER_BASE_FEE: 15.00,
        CURRENCY: 'TRY',
        AUTO_ASSIGN_COURIER: true,
        NOTIFICATION_SOUND: true
    },
    
    // Order status constants
    ORDER_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        PREPARING: 'preparing',
        READY: 'ready',
        ON_THE_WAY: 'on_the_way',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled'
    },
    
    // User roles
    ROLES: {
        ADMIN: 'admin',
        SELLER: 'seller',
        COURIER: 'courier',
        CUSTOMER: 'customer',
        MEMBER: 'üye'
    },
    
    // Payment methods
    PAYMENT_METHODS: {
        CASH: 'cash',
        CREDIT_CARD: 'credit_card',
        ONLINE: 'online'
    }
};

// Supabase client initialization - DOM hazır olduğunda
function initializeSupabase() {
    try {
        // Supabase SDK'nın yüklü olduğundan emin ol
        if (typeof window.supabase !== 'undefined') {
            const client = window.supabase.createClient(CONFIG.SUPABASE.url, CONFIG.SUPABASE.key, {
                auth: {
                    persistSession: true,
                    autoRefreshToken: true
                },
                global: {
                    headers: {
                        'Accept': 'application/json',
                        'Content-Type': 'application/json',
                        'apikey': CONFIG.SUPABASE.key
                    }
                }
            });
            
            window.SUPABASE_CLIENT = client;
            window.CONFIG = CONFIG;
            
            console.log('✅ Supabase client başarıyla başlatıldı');
            return client;
        } else {
            console.error('❌ Supabase SDK bulunamadı! CDN yüklü mü?');
            return null;
        }
    } catch (error) {
        console.error('❌ Supabase client başlatma hatası:', error);
        return null;
    }
}

// Sayfa yüklendiğinde otomatik başlat
document.addEventListener('DOMContentLoaded', function() {
    const client = initializeSupabase();
    
    if (!client) {
        // 2. deneme - kısa bir gecikmeyle
        setTimeout(() => {
            const retryClient = initializeSupabase();
            if (!retryClient) {
                console.error('❌ Supabase client başlatılamadı!');
            }
        }, 500);
    }
});

// Hemen çalıştır (DOMContentLoaded beklemek istemiyorsanız)
window.SUPABASE_CLIENT = initializeSupabase();
window.CONFIG = CONFIG;
