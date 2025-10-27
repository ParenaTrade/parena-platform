// Supabase configuration
const SUPABASE_CONFIG = {
    url: "https://xliutvspwodhoaxvysks.supabase.co",
    key: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhsaXV0dnNwd29kaG9heHZ5c2tzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTgyOTksImV4cCI6MjA3MjkzNDI5OX0.Zodisa_ifP8t2Q4X0ecnB56RiR_Bg4QS5gvPn5ZLK_w"
};

// System constants
const SYSTEM_CONSTANTS = {
    ORDER_TIMEOUT: 10 * 60 * 1000, // 10 minutes
    MAX_DELIVERY_DISTANCE: 10, // km
    COMMISSION_RATE: 0.15, // 15%
    COURIER_BASE_FEE: 15.00
};

// Initialize Supabase client
const supabase = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.key);