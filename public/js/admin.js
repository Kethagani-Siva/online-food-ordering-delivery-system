const menuTableBody = document.getElementById('menu-table-body');
const ordersTableBody = document.getElementById('orders-table-body');
const menuForm = document.getElementById('menu-form');
const menuIdInput = document.getElementById('menu-id');
const menuNameInput = document.getElementById('menu-name');
const menuPriceInput = document.getElementById('menu-price');
const menuCategoryInput = document.getElementById('menu-category');
const menuImageInput = document.getElementById('menu-image');
const menuDescriptionInput = document.getElementById('menu-description');
const cancelEditButton = document.getElementById('cancel-edit-btn');

const STATUS_FLOW = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];

async function initializeAdmin() {
  await loadMenuItems();
  await loadOrders();
  attachEventHandlers();
}

async function loadMenuItems() {
  try {
    const response = await fetch('/api/menu');
    const menu = await response.json();

    if (!response.ok) {
      throw new Error(menu.error || 'Unable to load menu items.');
    }

    renderMenuTable(menu);
  } catch (error) {
    menuTableBody.innerHTML = `<tr><td colspan="4">${error.message}</td></tr>`;
  }
}

async function loadOrders() {
  try {
    const response = await fetch('/api/orders');
    const orders = await response.json();

    if (!response.ok) {
      throw new Error(orders.error || 'Unable to load orders.');
    }

    renderOrdersTable(orders);
  } catch (error) {
    ordersTableBody.innerHTML = `<tr><td colspan="5">${error.message}</td></tr>`;
  }
}

function attachEventHandlers() {
  menuForm.addEventListener('submit', handleMenuSubmit);
  cancelEditButton.addEventListener('click', resetMenuForm);
}

function renderMenuTable(menuItems) {
  if (!menuItems.length) {
    menuTableBody.innerHTML = '<tr><td colspan="4">No menu items found.</td></tr>';
    return;
  }

  menuTableBody.innerHTML = menuItems
    .map(
      (item) => `
        <tr>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>₹${Number(item.price).toFixed(2)}</td>
          <td>
            <button type="button" class="action-btn edit" data-action="edit" data-id="${item.id}">Edit</button>
            <button type="button" class="action-btn delete" data-action="delete" data-id="${item.id}">Delete</button>
          </td>
        </tr>
      `
    )
    .join('');

  menuTableBody.querySelectorAll('.action-btn').forEach((button) => {
    button.addEventListener('click', async () => {
      const itemId = Number(button.dataset.id);
      const action = button.dataset.action;

      if (action === 'edit') {
        const item = menuItems.find((entry) => Number(entry.id) === itemId);
        if (item) {
          populateMenuForm(item);
        }
      }

      if (action === 'delete') {
        await deleteMenuItem(itemId);
      }
    });
  });
}

function renderOrdersTable(orders) {
  if (!orders.length) {
    ordersTableBody.innerHTML = '<tr><td colspan="5">No orders have been placed yet.</td></tr>';
    return;
  }

  ordersTableBody.innerHTML = orders
    .map(
      (order) => `
        <tr>
          <td>${order.id}</td>
          <td>
            ${order.customer.name}<br />
            ${order.customer.phone}<br />
            ${order.customer.address}
          </td>
          <td>
            ${order.items
              .map((item) => `${item.name} x${item.quantity}`)
              .join('<br />')}
          </td>
          <td>₹${Number(order.total).toFixed(2)}</td>
          <td>
            <select class="inline-status" data-id="${order.id}" data-status="${order.status}">
              ${STATUS_FLOW.map(
                (status) => `<option value="${status}" ${status === order.status ? 'selected' : ''}>${status}</option>`
              ).join('')}
            </select>
          </td>
        </tr>
      `
    )
    .join('');

  ordersTableBody.querySelectorAll('.inline-status').forEach((select) => {
    select.addEventListener('change', async (event) => {
      const orderId = event.target.dataset.id;
      const nextStatus = event.target.value;
      await updateOrderStatus(orderId, nextStatus);
    });
  });
}

async function handleMenuSubmit(event) {
  event.preventDefault();

  const payload = {
    name: menuNameInput.value.trim(),
    price: Number(menuPriceInput.value),
    category: menuCategoryInput.value,
    image: menuImageInput.value.trim() || 'placeholder.png',
    description: menuDescriptionInput.value.trim()
  };

  const menuId = menuIdInput.value;

  try {
    const response = await fetch(menuId ? `/api/menu/${menuId}` : '/api/menu', {
      method: menuId ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to save menu item.');
    }

    resetMenuForm();
    await loadMenuItems();
  } catch (error) {
    alert(error.message);
  }
}

function populateMenuForm(item) {
  menuIdInput.value = item.id;
  menuNameInput.value = item.name;
  menuPriceInput.value = item.price;
  menuCategoryInput.value = item.category;
  menuImageInput.value = item.image || '';
  menuDescriptionInput.value = item.description;
  cancelEditButton.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function resetMenuForm() {
  menuForm.reset();
  menuIdInput.value = '';
  cancelEditButton.hidden = true;
}

async function deleteMenuItem(itemId) {
  try {
    const response = await fetch(`/api/menu/${itemId}`, {
      method: 'DELETE'
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to delete item.');
    }

    await loadMenuItems();
  } catch (error) {
    alert(error.message);
  }
}

async function updateOrderStatus(orderId, status) {
  try {
    const response = await fetch(`/api/orders/${orderId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'Unable to update order status.');
    }

    await loadOrders();
  } catch (error) {
    alert(error.message);
  }
}

initializeAdmin();
