// Configuration File - Vercel Environment Variables ile
const CONFIG = {
    // Supabase configuration - Vercel env variables
    SUPABASE: {
        url: process.env.SUPABASE_URL || "https://xliutvspwodhoaxvysks.supabase.co",
        key: process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXV0dnNwd29kaG9heHZ5c2tzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1ODI5OSwiZXhwIjoyMDcyOTM0Mjk5fQ.WQ8gtJD1hRUGL0L7uQ9ApfKFEyhDUZjQ8Vs0A7g6udo"
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

// Vercel environment detection
function getVercelEnvironment() {
    return process.env.NODE_ENV || 'development';
}

// Supabase client initialization for Vercel
function initializeSupabase() {
    try {
        const environment = getVercelEnvironment();
        console.log(`🚀 ${environment} ortamında başlatılıyor...`);
        
        // Supabase SDK kontrolü
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase SDK bulunamadı!');
            return null;
        }

        const client = window.supabase.createClient(CONFIG.SUPABASE.url, CONFIG.SUPABASE.key, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            },
            global: {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'apikey': CONFIG.SUPABASE.key
                }
            }
        });

        console.log('✅ Supabase client başarıyla başlatıldı');
        console.log('📍 URL:', CONFIG.SUPABASE.url);
        console.log('🔐 Ortam:', environment);
        
        return client;
        
    } catch (error) {
        console.error('❌ Supabase client başlatma hatası:', error);
        return null;
    }
}

// Global değişkenleri ayarla
window.CONFIG = CONFIG;
window.SUPABASE_CLIENT = initializeSupabase();

// Hata durumu için fallback
if (!window.SUPABASE_CLIENT) {
    console.warn('⚠️ İlk başlatma başarısız, 2. deneme yapılıyor...');
    setTimeout(() => {
        window.SUPABASE_CLIENT = initializeSupabase();
    }, 1000);
}
