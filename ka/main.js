// Global variables
window.authSystem = null;
window.panelSystem = null;
window.customerPanel = null;
window.sellerPanel = null;
window.courierPanel = null;
window.adminPanel = null;

// Initialize application
document.addEventListener('DOMContentLoaded', function() {
    // Initialize systems
    window.authSystem = new AuthSystem();
    window.panelSystem = new PanelSystem();
    
    console.log('Multivendor Sipariş Sistemi başlatıldı');
});
