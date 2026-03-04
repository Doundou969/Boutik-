/* =============================================
   BOUTIQUE — app.js
   ============================================= */

/* ---- Cart State ---- */
const Cart = {
  items: [],

  load() {
    try {
      const saved = localStorage.getItem('boutique_cart');
      this.items = saved ? JSON.parse(saved) : [];
    } catch { this.items = []; }
  },

  save() {
    localStorage.setItem('boutique_cart', JSON.stringify(this.items));
    this.updateUI();
  },

  add(product, qty = 1) {
    const existing = this.items.find(i => i.id === product.id);
    if (existing) {
      existing.qty += qty;
    } else {
      this.items.push({ ...product, qty });
    }
    this.save();
  },

  remove(id) {
    this.items = this.items.filter(i => i.id !== id);
    this.save();
  },

  updateQty(id, qty) {
    if (qty < 1) { this.remove(id); return; }
    const item = this.items.find(i => i.id === id);
    if (item) { item.qty = qty; this.save(); }
  },

  get count() {
    return this.items.reduce((sum, i) => sum + i.qty, 0);
  },

  get subtotal() {
    return this.items.reduce((sum, i) => sum + i.prix * i.qty, 0);
  },

  updateUI() {
    const badge = document.getElementById('cart-count');
    if (!badge) return;
    const n = this.count;
    badge.textContent = n;
    badge.classList.toggle('hidden', n === 0);
  }
};

/* ---- Toast Notification ---- */
function showToast(msg, icon = '✓') {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.innerHTML = `<span class="toast-icon">${icon}</span>${msg}`;
  toast.classList.add('show');
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ---- Format price ---- */
function formatPrice(n) {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(n);
}

/* ---- Fetch Products ---- */
async function fetchProducts() {
  const res = await fetch('data/products.json');
  return res.json();
}

/* ---- Nav active state ---- */
function setActiveNav() {
  const path = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(a => {
    const href = a.getAttribute('href');
    if (href === path || (path === '' && href === 'index.html')) {
      a.classList.add('active');
    }
  });
}

/* ---- Mobile menu ---- */
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', nav.classList.contains('open'));
  });
  document.addEventListener('click', e => {
    if (!toggle.contains(e.target) && !nav.contains(e.target)) {
      nav.classList.remove('open');
    }
  });
}

/* =============================================
   HOMEPAGE
   ============================================= */
async function initHomePage() {
  const grid = document.getElementById('featured-grid');
  if (!grid) return;

  const products = await fetchProducts();
  const featured = products.slice(0, 4);
  grid.innerHTML = featured.map(p => renderCard(p)).join('');
  bindCardEvents(grid);
}

/* =============================================
   PRODUCTS PAGE
   ============================================= */
async function initProductsPage() {
  const grid = document.getElementById('products-grid');
  const filterBar = document.getElementById('filter-bar');
  if (!grid) return;

  const products = await fetchProducts();
  let current = 'Tous';

  function render(list) {
    grid.innerHTML = list.map(p => renderCard(p)).join('');
    bindCardEvents(grid);
  }

  function filter(cat) {
    current = cat;
    document.querySelectorAll('.filter-btn').forEach(b =>
      b.classList.toggle('active', b.dataset.cat === cat));
    const list = cat === 'Tous' ? products : products.filter(p => p.categorie === cat);
    render(list);
  }

  // Build filter buttons
  const cats = ['Tous', ...new Set(products.map(p => p.categorie))];
  if (filterBar) {
    filterBar.innerHTML = cats.map(c =>
      `<button class="filter-btn${c === 'Tous' ? ' active' : ''}" data-cat="${c}">${c}</button>`
    ).join('');
    filterBar.addEventListener('click', e => {
      if (e.target.matches('.filter-btn')) filter(e.target.dataset.cat);
    });
  }

  render(products);
}

/* =============================================
   PRODUCT DETAIL PAGE
   ============================================= */
async function initProductPage() {
  const container = document.getElementById('product-detail');
  if (!container) return;

  const params = new URLSearchParams(window.location.search);
  const id = parseInt(params.get('id'));
  if (!id) { container.innerHTML = '<p>Produit introuvable.</p>'; return; }

  const products = await fetchProducts();
  const p = products.find(x => x.id === id);
  if (!p) { container.innerHTML = '<p>Produit introuvable.</p>'; return; }

  document.title = `${p.titre} — Boutique`;

  // Update breadcrumb
  const bcProduct = document.getElementById('breadcrumb-product');
  if (bcProduct) bcProduct.textContent = p.titre;

  container.innerHTML = `
    <div class="detail-image-wrap">
      <img src="${p.image}" alt="${p.titre}" width="600" height="450" loading="eager">
    </div>
    <div class="detail-body">
      <p class="detail-category">${p.categorie}</p>
      <h1 class="detail-title">${p.titre}</h1>
      <p class="detail-price">${formatPrice(p.prix)}</p>
      <div class="detail-divider"></div>
      <p class="detail-description">${p.description}</p>
      <p class="detail-label">Quantité</p>
      <div class="qty-control" role="group" aria-label="Quantité">
        <button class="qty-btn" id="qty-minus" aria-label="Diminuer">−</button>
        <input class="qty-input" type="number" id="qty-val" value="1" min="1" max="99" aria-label="Quantité">
        <button class="qty-btn" id="qty-plus" aria-label="Augmenter">+</button>
      </div>
      <button class="btn-add-detail" id="add-to-cart-btn">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
        Ajouter au panier
      </button>
    </div>
  `;

  // Qty controls
  const qtyInput = document.getElementById('qty-val');
  document.getElementById('qty-minus').addEventListener('click', () => {
    if (parseInt(qtyInput.value) > 1) qtyInput.value = parseInt(qtyInput.value) - 1;
  });
  document.getElementById('qty-plus').addEventListener('click', () => {
    qtyInput.value = parseInt(qtyInput.value) + 1;
  });

  document.getElementById('add-to-cart-btn').addEventListener('click', () => {
    Cart.add(p, parseInt(qtyInput.value) || 1);
    showToast(`${p.titre} ajouté au panier`);
  });
}

/* =============================================
   CART PAGE
   ============================================= */
function initCartPage() {
  const container = document.getElementById('cart-container');
  if (!container) return;
  renderCart();
}

function renderCart() {
  const container = document.getElementById('cart-container');
  if (!container) return;

  if (Cart.items.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <div class="cart-empty-icon">🛒</div>
        <h3>Votre panier est vide</h3>
        <p>Découvrez notre sélection et ajoutez vos articles préférés.</p>
        <a href="products.html" class="btn-continue">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
          Voir les produits
        </a>
      </div>`;
    return;
  }

  const itemsHTML = Cart.items.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <div class="cart-item-image">
        <img src="${item.image}" alt="${item.titre}" width="120" height="90" loading="lazy">
      </div>
      <div class="cart-item-body">
        <p class="cart-item-category">${item.categorie}</p>
        <p class="cart-item-title">${item.titre}</p>
        <div class="cart-item-footer">
          <span class="cart-item-price">${formatPrice(item.prix * item.qty)}</span>
          <div class="cart-qty" role="group" aria-label="Quantité">
            <button class="cart-qty-btn" data-action="dec" data-id="${item.id}" aria-label="Diminuer">−</button>
            <span class="cart-qty-val">${item.qty}</span>
            <button class="cart-qty-btn" data-action="inc" data-id="${item.id}" aria-label="Augmenter">+</button>
          </div>
          <button class="btn-remove" data-action="remove" data-id="${item.id}" aria-label="Retirer">✕</button>
        </div>
      </div>
    </div>
  `).join('');

  const livraison = Cart.subtotal >= 150 ? 0 : 9.9;
  const total = Cart.subtotal + livraison;

  const summaryHTML = `
    <aside class="cart-summary" aria-label="Résumé de la commande">
      <h2 class="summary-title">Résumé</h2>
      <div class="summary-line"><span>Sous-total</span><span>${formatPrice(Cart.subtotal)}</span></div>
      <div class="summary-line"><span>Livraison</span><span>${livraison === 0 ? 'Offerte' : formatPrice(livraison)}</span></div>
      ${livraison > 0 ? `<div class="summary-line" style="font-size:0.72rem;color:var(--stone)"><span>Livraison offerte dès 150 €</span><span></span></div>` : ''}
      <div class="summary-total">
        <span class="summary-total-label">Total</span>
        <span class="summary-total-price">${formatPrice(total)}</span>
      </div>
      <button class="btn-checkout" id="checkout-btn">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>
        Passer la commande
      </button>
      <p class="secure-note">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
        Paiement 100% sécurisé
      </p>
    </aside>
  `;

  container.innerHTML = `
    <div class="cart-layout">
      <div class="cart-items">${itemsHTML}</div>
      ${summaryHTML}
    </div>`;

  // Bind events
  container.addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    if (btn.dataset.action === 'inc') Cart.updateQty(id, (Cart.items.find(i => i.id === id)?.qty || 1) + 1);
    if (btn.dataset.action === 'dec') Cart.updateQty(id, (Cart.items.find(i => i.id === id)?.qty || 1) - 1);
    if (btn.dataset.action === 'remove') { Cart.remove(id); showToast('Article retiré', '✕'); }
    renderCart();
  });

  document.getElementById('checkout-btn')?.addEventListener('click', () => {
    showToast('Commande simulée — Merci !', '🎉');
  });
}

/* =============================================
   SHARED: render card HTML
   ============================================= */
function renderCard(p) {
  return `
    <article class="product-card" tabindex="0" aria-label="${p.titre}">
      <a href="product.html?id=${p.id}" class="card-image-wrap" tabindex="-1">
        <img src="${p.image}" alt="${p.titre}" width="400" height="300" loading="lazy">
        <span class="card-badge">${p.categorie}</span>
      </a>
      <div class="card-body">
        <p class="card-category">${p.categorie}</p>
        <h2 class="card-title">${p.titre}</h2>
        <p class="card-price">${formatPrice(p.prix)}</p>
        <div class="card-actions">
          <button class="btn-add" data-id="${p.id}" aria-label="Ajouter ${p.titre} au panier">Ajouter</button>
          <a href="product.html?id=${p.id}" class="btn-view" tabindex="0">Voir</a>
        </div>
      </div>
    </article>`;
}

function bindCardEvents(container) {
  container.addEventListener('click', async e => {
    const btn = e.target.closest('.btn-add');
    if (!btn) return;
    const id = parseInt(btn.dataset.id);
    const products = await fetchProducts();
    const p = products.find(x => x.id === id);
    if (!p) return;
    Cart.add(p, 1);
    btn.textContent = 'Ajouté ✓';
    btn.classList.add('added');
    setTimeout(() => { btn.textContent = 'Ajouter'; btn.classList.remove('added'); }, 1800);
    showToast(`${p.titre} ajouté au panier`);
  });
}

/* =============================================
   INIT
   ============================================= */
document.addEventListener('DOMContentLoaded', () => {
  Cart.load();
  Cart.updateUI();
  setActiveNav();
  initMobileMenu();
  initHomePage();
  initProductsPage();
  initProductPage();
  initCartPage();
});
