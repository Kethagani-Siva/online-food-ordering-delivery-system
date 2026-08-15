const state = {
  menu: [],
  category: 'All',
  cart: [],
  currentOrderId: null,
  statusPoller: null,
  auth: {
    loggedIn: false,
    user: null
  }
};

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 2
});

const categoryOrder = ['All', 'Starters', 'Main Course', 'Desserts', 'Beverages'];

const menuGrid = document.getElementById('menu-grid');
const filterContainer = document.getElementById('category-filter');
const cartItemsContainer = document.getElementById('cart-items');
const subtotalElement = document.getElementById('subtotal');
const totalElement = document.getElementById('total');
const cartCountElement = document.getElementById('cart-count');
const checkoutForm = document.getElementById('checkout-form');
const trackingSection = document.getElementById('tracking-section');
const statusBadge = document.getElementById('status-badge');
const trackingOrderId = document.getElementById('tracking-order-id');
const trackingTotal = document.getElementById('tracking-total');
const refreshStatusButton = document.getElementById('refresh-status');
const progressFill = document.getElementById('progress-fill');
const progressSteps = document.querySelectorAll('.step');
const authToggleButton = document.getElementById('auth-toggle');
const authModal = document.getElementById('auth-modal');
const closeAuthModalButton = document.getElementById('close-auth-modal');
const authTabs = document.querySelectorAll('.auth-tab');
const loginForm = document.getElementById('login-form');
const signupForm = document.getElementById('signup-form');
const myOrdersSection = document.getElementById('my-orders-section');
const myOrdersList = document.getElementById('my-orders-list');
const loadMyOrdersButton = document.getElementById('load-my-orders');

async function initializeApp() {
  await loadMenu();
  renderFilters();
  renderMenu();
  renderCart();
  attachEvents();
  await checkCustomerAuth();
}

async function loadMenu() {
  try {
    const response = await fetch('/api/menu');
    const menu = await response.json();

    if (!response.ok) {
      throw new Error(menu.error || 'Unable to load menu.');
    }

    state.menu = menu;
  } catch (error) {
    menuGrid.innerHTML = `<p class="empty-cart">${error.message}</p>`;
  }
}

function attachEvents() {
  checkoutForm.addEventListener('submit', handleCheckout);
  refreshStatusButton.addEventListener('click', () => {
    if (state.currentOrderId) {
      refreshOrderStatus(state.currentOrderId);
    }
  });

  authToggleButton.addEventListener('click', () => {
    if (state.auth.loggedIn) {
      logoutCustomer();
      return;
    }

    openAuthModal();
  });

  closeAuthModalButton.addEventListener('click', closeAuthModal);
  authTabs.forEach((tab) => {
    tab.addEventListener('click', () => switchAuthView(tab.dataset.authView));
  });

  loginForm.addEventListener('submit', handleLogin);
  signupForm.addEventListener('submit', handleSignup);
  loadMyOrdersButton.addEventListener('click', () => {
    if (state.auth.loggedIn) {
      loadMyOrders();
    }
  });

  authModal.addEventListener('click', (event) => {
    if (event.target === authModal) {
      closeAuthModal();
    }
  });
}

function openAuthModal() {
  authModal.classList.remove('hidden');
}

function closeAuthModal() {
  authModal.classList.add('hidden');
}

function switchAuthView(view) {
  const isLogin = view === 'login';
  authTabs.forEach((tab) => {
    tab.classList.toggle('active', tab.dataset.authView === view);
  });
  loginForm.classList.toggle('hidden', !isLogin);
  signupForm.classList.toggle('hidden', isLogin);
}

async function checkCustomerAuth() {
  try {
    const response = await fetch('/api/auth/me');
    const data = await response.json();

    if (!response.ok || !data.loggedIn) {
      state.auth.loggedIn = false;
      state.auth.user = null;
      myOrdersSection.classList.add('hidden');
      authToggleButton.textContent = 'Login';
      return;
    }

    state.auth.loggedIn = true;
    state.auth.user = data.user;
    authToggleButton.textContent = `Hi, ${data.user.name.split(' ')[0]}`;
    populateCheckoutFields(data.user);
    myOrdersSection.classList.remove('hidden');
    await loadMyOrders();
  } catch (error) {
    console.error(error);
  }
}

function populateCheckoutFields(user) {
  if (!user) return;

  const nameInput = checkoutForm.querySelector('input[name="name"]');
  const phoneInput = checkoutForm.querySelector('input[name="phone"]');
  const addressInput = checkoutForm.querySelector('textarea[name="address"]');

  if (nameInput) nameInput.value = user.name || '';
  if (phoneInput) phoneInput.value = user.phone || '';
  if (addressInput) addressInput.value = user.address || '';
}

async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Login failed.');
    }

    closeAuthModal();
    loginForm.reset();
    await checkCustomerAuth();
  } catch (error) {
    alert(error.message);
  }
}

async function handleSignup(event) {
  event.preventDefault();

  const payload = {
    name: document.getElementById('signup-name').value.trim(),
    email: document.getElementById('signup-email').value.trim(),
    password: document.getElementById('signup-password').value,
    phone: document.getElementById('signup-phone').value.trim(),
    address: document.getElementById('signup-address').value.trim()
  };

  try {
    const response = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Signup failed.');
    }

    closeAuthModal();
    signupForm.reset();
    await checkCustomerAuth();
  } catch (error) {
    alert(error.message);
  }
}

async function logoutCustomer() {
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to logout.');
    }

    state.auth.loggedIn = false;
    state.auth.user = null;
    authToggleButton.textContent = 'Login';
    myOrdersSection.classList.add('hidden');
    myOrdersList.innerHTML = '';
    checkoutForm.reset();
    alert(data.message);
  } catch (error) {
    alert(error.message);
  }
}

async function loadMyOrders() {
  if (!state.auth.loggedIn) {
    myOrdersSection.classList.add('hidden');
    return;
  }

  try {
    const response = await fetch('/api/orders/mine');
    const orders = await response.json();

    if (!response.ok) {
      throw new Error(orders.error || 'Unable to load your orders.');
    }

    if (!orders.length) {
      myOrdersList.innerHTML = '<div class="empty-cart">You have no past orders yet.</div>';
      myOrdersSection.classList.remove('hidden');
      return;
    }

    myOrdersList.innerHTML = orders
      .map(
        (order) => `
          <div class="order-history-item">
            <div class="order-history-header">
              <strong>${order.id}</strong>
              <span class="status-badge ${order.status.toLowerCase().replace(/\s+/g, '-')}">${order.status}</span>
            </div>
            <div class="order-history-meta">
              <span>${new Date(order.createdAt).toLocaleString()}</span>
              <span>${currency.format(order.total)}</span>
            </div>
            <ul>
              ${order.items
                .map((item) => `<li>${item.name} × ${item.quantity}</li>`)
                .join('')}
            </ul>
          </div>
        `
      )
      .join('');

    myOrdersSection.classList.remove('hidden');
  } catch (error) {
    myOrdersList.innerHTML = `<div class="empty-cart">${error.message}</div>`;
    myOrdersSection.classList.remove('hidden');
  }
}

function renderFilters() {
  filterContainer.innerHTML = categoryOrder
    .map(
      (category) => `
        <button
          type="button"
          class="filter-btn ${state.category === category ? 'active' : ''}"
          data-category="${category}"
        >
          ${category}
        </button>
      `
    )
    .join('');

  filterContainer.querySelectorAll('.filter-btn').forEach((button) => {
    button.addEventListener('click', () => {
      state.category = button.dataset.category;
      renderFilters();
      renderMenu();
    });
  });
}

function renderMenu() {
  const filteredItems =
    state.category === 'All'
      ? state.menu
      : state.menu.filter((item) => item.category === state.category);

  if (!filteredItems.length) {
    menuGrid.innerHTML = '<div class="empty-cart">No menu items available in this category.</div>';
    return;
  }

  const template = document.getElementById('menu-item-template');
  menuGrid.innerHTML = '';

  filteredItems.forEach((item) => {
    const card = template.content.cloneNode(true);
    const image = card.querySelector('.menu-image');
    const name = card.querySelector('.menu-name');
    const price = card.querySelector('.menu-price');
    const description = card.querySelector('.menu-description');
    const addButton = card.querySelector('.add-btn');

    image.dataset.category = item.category;
    image.textContent = getEmojiForCategory(item.category);
    name.textContent = item.name;
    price.textContent = currency.format(item.price);
    description.textContent = item.description;
    addButton.addEventListener('click', () => addToCart(item));
    menuGrid.appendChild(card);
  });
}

function getEmojiForCategory(category) {
  const emojiMap = {
    Starters: '🥗',
    'Main Course': '🍛',
    Desserts: '🍰',
    Beverages: '🥤'
  };

  return emojiMap[category] || '🍽️';
}

function addToCart(item) {
  const existingItem = state.cart.find((cartItem) => cartItem.id === item.id);

  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    state.cart.push({ ...item, quantity: 1 });
  }

  renderCart();
}

function updateCartItem(itemId, change) {
  const itemIndex = state.cart.findIndex((cartItem) => cartItem.id === itemId);

  if (itemIndex === -1) {
    return;
  }

  const item = state.cart[itemIndex];
  item.quantity += change;

  if (item.quantity <= 0) {
    state.cart.splice(itemIndex, 1);
  }

  renderCart();
}

function renderCart() {
  if (!state.cart.length) {
    cartItemsContainer.innerHTML = '<div class="empty-cart">Your cart is empty. Add a few delicious items.</div>';
    subtotalElement.textContent = currency.format(0);
    totalElement.textContent = currency.format(0);
    cartCountElement.textContent = '0 items';
    return;
  }

  const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  cartItemsContainer.innerHTML = state.cart
    .map(
      (item) => `
        <div class="cart-item">
          <div>
            <h4>${item.name}</h4>
            <p>${currency.format(item.price)} each</p>
          </div>

          <div class="item-actions">
            <button type="button" class="qty-btn" data-action="decrease" data-id="${item.id}">−</button>
            <span>${item.quantity}</span>
            <button type="button" class="qty-btn" data-action="increase" data-id="${item.id}">+</button>
            <span class="item-total">${currency.format(item.price * item.quantity)}</span>
          </div>
        </div>
      `
    )
    .join('');

  cartCountElement.textContent = `${state.cart.reduce((count, item) => count + item.quantity, 0)} items`;
  subtotalElement.textContent = currency.format(subtotal);
  totalElement.textContent = currency.format(subtotal);

  cartItemsContainer.querySelectorAll('.qty-btn').forEach((button) => {
    button.addEventListener('click', () => {
      const itemId = Number(button.dataset.id);
      const action = button.dataset.action;
      updateCartItem(itemId, action === 'increase' ? 1 : -1);
    });
  });
}

async function handleCheckout(event) {
  event.preventDefault();

  if (!state.cart.length) {
    alert('Please add at least one item to the cart before checkout.');
    return;
  }

  const formData = new FormData(checkoutForm);
  const payload = {
    customer: {
      name: formData.get('name').trim(),
      phone: formData.get('phone').trim(),
      address: formData.get('address').trim()
    },
    items: state.cart.map((item) => ({
      id: item.id,
      name: item.name,
      price: item.price,
      quantity: item.quantity
    }))
  };

  try {
    const response = await fetch('/api/orders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to place order.');
    }

    state.currentOrderId = data.id;
    state.cart = [];
    renderCart();
    checkoutForm.reset();
    showTracking(data);
    refreshOrderStatus(data.id);
    startPolling(data.id);

    if (state.auth.loggedIn) {
      await loadMyOrders();
    }
  } catch (error) {
    alert(error.message);
  }
}

function showTracking(order) {
  trackingSection.classList.remove('hidden');
  trackingOrderId.textContent = order.id;
  trackingTotal.textContent = currency.format(order.total);
  updateStatusDisplay(order.status);
}

async function refreshOrderStatus(orderId) {
  try {
    const response = await fetch(`/api/orders/${orderId}`);
    const order = await response.json();

    if (!response.ok) {
      throw new Error(order.error || 'Unable to fetch order status.');
    }

    trackingOrderId.textContent = order.id;
    trackingTotal.textContent = currency.format(order.total);
    updateStatusDisplay(order.status);
  } catch (error) {
    console.error(error);
  }
}

function updateStatusDisplay(status) {
  const statusKey = status.toLowerCase().replace(/\s+/g, '-');
  statusBadge.textContent = status;
  statusBadge.className = `status-badge ${statusKey}`;

  const indexMap = {
    placed: 0,
    preparing: 1,
    'out-for-delivery': 2,
    delivered: 3
  };

  const activeStepIndex = indexMap[statusKey] ?? 0;
  const progress = ((activeStepIndex + 1) / progressSteps.length) * 100;
  progressFill.style.width = `${progress}%`;

  progressSteps.forEach((step, index) => {
    step.classList.toggle('active', index <= activeStepIndex);
  });
}

function startPolling(orderId) {
  if (state.statusPoller) {
    clearInterval(state.statusPoller);
  }

  state.statusPoller = setInterval(() => {
    refreshOrderStatus(orderId);
  }, 5000);
}

initializeApp();
