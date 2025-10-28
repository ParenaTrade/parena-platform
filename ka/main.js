// Multivendor Sipariş Sistemi
document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 Multivendor Sipariş Sistemi başlatıldı');
    
    // Container'ları ayarla
    const loginContainer = document.getElementById('loginContainer');
    const panelContainer = document.getElementById('panelContainer');
    
    if (loginContainer) loginContainer.style.display = 'none';
    if (panelContainer) panelContainer.style.display = 'grid';
    
    // SADECE AuthSystem'i başlat - PanelSystem'i BAŞLATMA!
    window.authSystem = new AuthSystem();
    
    // PanelSystem'i burada başlatma - auth-system.js zaten başlatıyor
    // window.panelSystem = new PanelSystem(); // BU SATIRI SİLİN VEYA YORUM YAPIN
});
