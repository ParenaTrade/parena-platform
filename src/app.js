// app.js
// Voice.js buraya komutları yollar

// Ürün listesi (örnek)
const products = {
  domates: 40,
  sogan: 20,
  patlican: 30,
  zeytin: 100,
  peynir: 120,
  mandalina: 35,
  ekmek: 10
};

// Voice.js → handleVoiceCommand çağırıyor
function handleVoiceCommand(normalized, transcript) {
  const messagesEl = document.getElementById("messages");

  // Kullanıcının dediğini ekrana yaz
  const p = document.createElement("p");
  p.textContent = "🎙️ " + transcript;
  messagesEl.appendChild(p);

  // Kelimeleri ayır
  const words = normalized.split(" ");
  let quantity = 1;
  let product = null;

  // Rakamları çöz
  words.forEach(w => {
    if (!isNaN(parseInt(w))) {
      quantity = parseInt(w);
    }
  });

  // Ürünü bul
  Object.keys(products).forEach(key => {
    if (normalized.includes(key)) {
      product = key;
    }
  });

  if (product) {
    const price = products[product];
    addToCart(product, quantity, price);

    const ok = document.createElement("p");
    ok.textContent = `✅ ${quantity} kilo ${product} sepete eklendi (${price * quantity} TL)`;
    messagesEl.appendChild(ok);
  } else {
    const err = document.createElement("p");
    err.textContent = "❌ Ürün bulunamadı, tekrar deneyin efendim.";
    messagesEl.appendChild(err);
  }
}
