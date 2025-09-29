// paymentController.js
const getPaymentMethodsByCountry = async (countryCode) => {
    const methods = await db.query(`
        SELECT 
            pm.name,
            pm.type,
            cpm.logo_url,
            pm.is_global
        FROM country_payment_methods cpm
        JOIN payment_methods pm ON cpm.payment_method_id = pm.id
        JOIN countries c ON cpm.country_id = c.id
        WHERE c.code = ? OR pm.is_global = true
        ORDER BY pm.is_global DESC, cpm.display_order ASC
    `, [countryCode]);
    
    return methods;
};

// API Route
app.get('/api/payment-methods/:countryCode', async (req, res) => {
    try {
        const methods = await getPaymentMethodsByCountry(req.params.countryCode);
        res.json(methods);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});