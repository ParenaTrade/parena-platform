// Configuration File - Vercel Environment Variables için optimize
const CONFIG = {
    // Supabase configuration - Vercel env variables
    SUPABASE: {
        // Vercel'de process.env, browser'da ise fallback değerler kullanılacak
        url: typeof process !== 'undefined' && process.env ? process.env.SUPABASE_URL : "https://xliutvspwodhoaxvysks.supabase.co",
        key: typeof process !== 'undefined' && process.env ? process.env.SUPABASE_KEY : "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXV0dnNwd29kaG9heHZ5c2tzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1ODI5OSwiZXhwIjoyMDcyOTM0Mjk5fQ.WQ8gtJD1hRUGL0L7uQ9ApfKFEyhDUZjQ8Vs0A7g6udo"
    },
    
    // System constants
    SYSTEM: {
        ORDER_TIMEOUT: 10 * 60 * 1000,
        MAX_DELIVERY_DISTANCE: 10,
        COMMISSION_RATE: 0.15,
        COURIER_BASE_FEE: 15.00,
        CURRENCY: 'TRY',
        AUTO_ASSIGN_COURIER: true,
        NOTIFICATION_SOUND: true
    },
    
    ORDER_STATUS: {
        PENDING: 'pending',
        CONFIRMED: 'confirmed',
        PREPARING: 'preparing',
        READY: 'ready',
        ON_THE_WAY: 'on_the_way',
        DELIVERED: 'delivered',
        CANCELLED: 'cancelled'
    },
    
    ROLES: {
        ADMIN: 'admin',
        SELLER: 'seller',
        COURIER: 'courier',
        CUSTOMER: 'customer',
        MEMBER: 'üye'
    },
    
    PAYMENT_METHODS: {
        CASH: 'cash',
        CREDIT_CARD: 'credit_card',
        ONLINE: 'online'
    }
};

// Browser ortamı kontrolü
function isBrowser() {
    return typeof window !== 'undefined';
}

// Vercel environment detection
function getEnvironment() {
    if (isBrowser()) {
        // Browser'da URL'den kontrol
        const hostname = window.location.hostname;
        if (hostname.includes('vercel.app') || hostname.includes('localhost')) {
            return hostname.includes('localhost') ? 'development' : 'production';
        }
    }
    return 'production';
}

// Supabase client initialization
function initializeSupabase() {
    try {
        const environment = getEnvironment();
        console.log(`🌍 Ortam: ${environment}`);
        
        // Supabase SDK kontrolü
        if (typeof window.supabase === 'undefined') {
            console.error('❌ Supabase SDK bulunamadı!');
            return null;
        }

        // URL ve key'leri al
        const supabaseUrl = CONFIG.SUPABASE.url;
        const supabaseKey = CONFIG.SUPABASE.key;
        
        console.log(`🔗 Supabase URL: ${supabaseUrl ? '✅' : '❌'}`);
        console.log(`🔑 Supabase Key: ${supabaseKey ? '✅' : '❌'}`);

        if (!supabaseUrl || !supabaseKey) {
            console.error('❌ Supabase URL veya Key bulunamadı!');
            return null;
        }

        const client = window.supabase.createClient(supabaseUrl, supabaseKey, {
            auth: {
                persistSession: true,
                autoRefreshToken: true,
                detectSessionInUrl: true
            },
            global: {
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'apikey': supabaseKey
                }
            }
        });

        console.log('✅ Supabase client başarıyla başlatıldı');
        
        // Test connection
        testConnection(client);
        
        return client;
        
    } catch (error) {
        console.error('❌ Supabase client başlatma hatası:', error);
        return null;
    }
}

// Bağlantı testi
async function testConnection(client) {
    try {
        const { data, error } = await client.from('profiles').select('count').limit(1);
        if (error) {
            console.warn('⚠️ Bağlantı testi hatası:', error.message);
        } else {
            console.log('🔌 Bağlantı testi başarılı');
        }
    } catch (testError) {
        console.warn('⚠️ Bağlantı testi başarısız:', testError.message);
    }
}

// Sayfa yüklendiğinde başlat
if (isBrowser()) {
    document.addEventListener('DOMContentLoaded', function() {
        console.log('🚀 DOM hazır, Supabase başlatılıyor...');
        window.CONFIG = CONFIG;
        window.SUPABASE_CLIENT = initializeSupabase();
        
        // Global değişkenleri kontrol et
        if (!window.SUPABASE_CLIENT) {
            console.warn('⚠️ İlk başlatma başarısız, 2. deneme yapılıyor...');
            setTimeout(() => {
                window.SUPABASE_CLIENT = initializeSupabase();
                if (window.SUPABASE_CLIENT) {
                    console.log('✅ 2. deneme başarılı');
                } else {
                    console.error('❌ Supabase başlatılamadı!');
                }
            }, 2000);
        }
    });
} else {
    // Node.js ortamı (Vercel build sırasında)
    console.log('🔨 Build ortamı - Config export ediliyor');
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = { CONFIG };
    }
}
