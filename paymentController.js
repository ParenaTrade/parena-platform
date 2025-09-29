// paymentController.js - Basit versiyon
const paymentMethods = {
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
                    { name: "Sodexo", logo: "/logos/sodexo.png" },
                    { name: "Multinet", logo: "/logos/multinet.png" }
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
            // Gürcistan'da yemek kartı yok
        ]
    },
    US: {
        country: "United States",
        currency: "USD", 
        methods: [
            {
                name: "Credit Card",
                type: "credit_card",
                logo: "💳",
                description: "Secure payment"
            },
            {
                name: "Cash on Delivery", 
                type: "cash",
                logo: "💵",
                description: "Pay with cash on delivery"
            },
            {
                name: "Meal Cards",
                type: "food_cards",
                logo: "🍽️",
                description: "MealPal, Ticket Restaurant",
                cards: [
                    { name: "MealPal", logo: "/logos/mealpal.png" },
                    { name: "Ticket Restaurant", logo: "/logos/ticket-restaurant.png" }
                ]
            }
        ]
    }
};

// Ödeme yöntemlerini getir
const getPaymentMethods = (countryCode = 'TR') => {
    return paymentMethods[countryCode] || paymentMethods.TR;
};

// Desteklenen ülkeleri getir
const getSupportedCountries = () => {
    return Object.keys(paymentMethods).map(code => ({
        code,
        name: paymentMethods[code].country,
        currency: paymentMethods[code].currency
    }));
};

module.exports = {
    getPaymentMethods,
    getSupportedCountries
};
