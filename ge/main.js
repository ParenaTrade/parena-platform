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
    
    // Make panels globally available
    window.customerPanel = customerPanel;
    window.sellerPanel = sellerPanel;
    window.courierPanel = courierPanel;
    window.adminPanel = adminPanel;
    
    console.log('Multivendor Sipariş Sistemi başlatıldı');
});