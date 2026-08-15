const state = {
  menu: [],
  category: 'All',
  cart: [],
  currentOrderId: null,
  statusPoller: null
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

async function initializeApp() {
  await loadMenu();
  renderFilters();
  renderMenu();
  renderCart();
  attachEvents();
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
