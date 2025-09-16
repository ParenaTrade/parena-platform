// cart.js
// Sepet modülü

let cart = [];
let totalPrice = 0;

// Sepete ürün ekle
function addToCart(product, quantity, price) {
  const existing = cart.find(item => item.product === product);

  if (existing) {
    existing.quantity += quantity;
  } else {
    cart.push({ product, quantity, price });
  }

  totalPrice += quantity * price;
  renderCart();
}

// Sepeti ekrana bas
function renderCart() {
  const cartEl = document.getElementById("cart");
  const totalEl = document.getElementById("total");

  cartEl.innerHTML = "";
  cart.forEach(item => {
    const li = document.createElement("li");
    li.textContent = `${item.product} - ${item.quantity} kg - ${item.price * item.quantity} TL`;
    cartEl.appendChild(li);
  });

  totalEl.textContent = totalPrice + " TL";
}
