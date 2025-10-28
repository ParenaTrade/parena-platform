// Multivendor Sipariş Sistemi - Ana Uygulama
class MultivendorApp {
    constructor() {
        this.isInitialized = false;
        console.log('🚀 Multivendor Uygulaması oluşturuluyor...');
    }

    initialize() {
        if (this.isInitialized) {
            console.log('⚠️ Uygulama zaten başlatılmış');
            return;
        }

        console.log('🏗️ Multivendor Sipariş Sistemi başlatılıyor...');
        
        // Container'ları ayarla
        this.setupContainers();
        
        // Sistemleri başlat
        this.initializeSystems();
        
        this.isInitialized = true;
        console.log('✅ Multivendor Sipariş Sistemi başlatıldı');
    }

    setupContainers() {
        console.log('🏠 Containerlar ayarlanıyor...');
        
        const loginContainer = document.getElementById('loginContainer');
        const panelContainer = document.getElementById('panelContainer');
        
        if (loginContainer) {
            loginContainer.style.display = 'none';
            console.log('✅ Login container gizlendi');
        }
        
        if (panelContainer) {
            panelContainer.style.display = 'grid';
            console.log('✅ Panel container gösterildi');
        }
    }

    initializeSystems() {
        console.log('🔧 Sistemler başlatılıyor...');
        
        // Sadece AuthSystem'i başlat
        // PanelSystem auth-system.js tarafından otomatik başlatılacak
        window.authSystem = new AuthSystem();
        
        // PanelSystem'i burada başlatma - auth-system.js yapacak
        // window.panelSystem = new PanelSystem();
    }
}

// Global instance
window.multivendorApp = new MultivendorApp();

// DOM hazır olduğunda başlat
document.addEventListener('DOMContentLoaded', function() {
    window.multivendorApp.initialize();
});
