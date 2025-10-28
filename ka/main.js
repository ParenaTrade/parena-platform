// Global variables
window.authSystem = null;
window.panelSystem = null;
window.customerPanel = null;
window.sellerPanel = null;
window.courierPanel = null;
window.adminPanel = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Multivendor Sipariş Sistemi başlatılıyor...');
    
    // Sadece AuthSystem'i başlat - PanelSystem'i BAŞLATMA!
    window.authSystem = new AuthSystem();
    
    // PanelSystem zaten auth-system.js tarafından başlatılacak
    // BU SATIRI SİLİN: window.panelSystem = new PanelSystem();
    
    console.log('✅ Multivendor Sipariş Sistemi başlatıldı');
    
    // Container'ları ayarla
    setupContainers();
});

// Container ayarlama fonksiyonu
function setupContainers() {
    console.log('🏠 Containerlar ayarlanıyor...');
    
    // Login container'ını gizle
    const loginContainer = document.getElementById('loginContainer');
    if (loginContainer) {
        loginContainer.style.display = 'none';
        console.log('✅ Login container gizlendi');
    }
    
    // Panel container'ını göster
    const panelContainer = document.getElementById('panelContainer');
    if (panelContainer) {
        panelContainer.style.display = 'grid';
        console.log('✅ Panel container gösterildi');
    }
}
