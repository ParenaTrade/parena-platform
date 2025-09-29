// payment-simple.js
class SimplePayment {
    constructor() {
        this.countryCode = 'TR';
        this.init();
    }

    init() {
        this.renderPaymentMethods();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Konum değişikliğini dinle
        const locationSelect = document.querySelector('.location-selector select');
        if (locationSelect) {
            locationSelect.addEventListener('change', (e) => {
                this.countryCode = e.target.value;
                this.renderPaymentMethods();
            });
        }

        // Mikrofon butonu
        const micButton = document.querySelector('.mic-button');
        if (micButton) {
            micButton.addEventListener('click', () => {
                this.activateVoiceSelection();
            });
        }
    }

    renderPaymentMethods() {
        const container = document.getElementById('paymentMethods');
        if (!container) return;

        const methods = getPaymentMethods(this.countryCode);
        
        let html = `
            <div class="payment-section">
                <h4>Ödeme Yöntemleri - ${methods.country}</h4>
                <div class="payment-methods-list">
        `;

        methods.methods.forEach(method => {
            html += `
                <div class="payment-method-item" data-type="${method.type}">
                    <div class="method-header">
                        <span class="method-logo">${method.logo}</span>
                        <div class="method-info">
                            <strong>${method.name}</strong>
                            <span class="method-desc">${method.description}</span>
                        </div>
                    </div>
            `;

            // Yemek kartları varsa göster
            if (method.cards && method.cards.length > 0) {
                html += `<div class="food-cards-list">`;
                method.cards.forEach(card => {
                    html += `
                        <div class="food-card-item">
                            <img src="${card.logo}" alt="${card.name}" onerror="this.style.display='none'">
                            <span>${card.name}</span>
                        </div>
                    `;
                });
                html += `</div>`;
            }

            html += `</div>`;
        });

        html += `</div></div>`;
        container.innerHTML = html;
    }

    activateVoiceSelection() {
        // Sesli seçim için basit implementasyon
        if (!('webkitSpeechRecognition' in window)) {
            alert('Tarayıcınız sesli aramayı desteklemiyor');
            return;
        }

        const recognition = new webkitSpeechRecognition();
        recognition.lang = 'tr-TR';
        recognition.start();

        recognition.onresult = (event) => {
            const command = event.results[0][0].transcript.toLowerCase();
            this.handleVoiceCommand(command);
        };
    }

    handleVoiceCommand(command) {
        const methods = getPaymentMethods(this.countryCode);
        let selectedMethod = null;

        // Sesli komutu işle
        if (command.includes('kredi') || command.includes('credit')) {
            selectedMethod = methods.methods.find(m => m.type === 'credit_card');
        } else if (command.includes('nakit') || command.includes('cash')) {
            selectedMethod = methods.methods.find(m => m.type === 'cash');
        } else if (command.includes('yemek') || command.includes('meal')) {
            selectedMethod = methods.methods.find(m => m.type === 'food_cards');
        }

        if (selectedMethod) {
            this.selectPaymentMethod(selectedMethod);
        }
    }

    selectPaymentMethod(method) {
        // Seçilen ödeme yöntemini işaretle
        const allMethods = document.querySelectorAll('.payment-method-item');
        allMethods.forEach(m => m.classList.remove('selected'));
        
        const selectedElement = document.querySelector(`[data-type="${method.type}"]`);
        if (selectedElement) {
            selectedElement.classList.add('selected');
        }

        console.log(`Seçilen ödeme yöntemi: ${method.name}`);
    }
}

// Global fonksiyon
function getPaymentMethods(countryCode) {
    // Burada API'ye istek atabilirsiniz veya sabit veriyi kullanabilirsiniz
    const methods = {
        TR: {
            country: "Türkiye",
            currency: "TRY",
            methods: [
                {
                    name: "Kredi Kartı",
                    type: "credit_card",
                    logo: "💳",
                    description: "Güvenli ödeme"
                },
                {
                    name: "Nakit (Kapıda)",
                    type: "cash",
                    logo: "💵", 
                    description: "Kapıda nakit ödeme"
                },
                {
                    name: "Yemek Kartları",
                    type: "food_cards",
                    logo: "🍽️",
                    description: "Setcard, Metropol, Sodexo",
                    cards: [
                        { name: "Setcard", logo: "/logos/setcard.png" },
                        { name: "Metropol", logo: "/logos/metropol.png" },
                        { name: "Sodexo", logo: "/logos/sodexo.png" }
                    ]
                }
            ]
        },
        GE: {
            country: "Gürcistan", 
            currency: "GEL",
            methods: [
                {
                    name: "Credit Card",
                    type: "credit_card",
                    logo: "💳",
                    description: "Secure payment"
                },
                {
                    name: "Cash (On Delivery)",
                    type: "cash", 
                    logo: "💵",
                    description: "Pay with cash on delivery"
                }
            ]
        }
    };
    
    return methods[countryCode] || methods.TR;
}

// Sayfa yüklendiğinde başlat
document.addEventListener('DOMContentLoaded', () => {
    new SimplePayment();
});