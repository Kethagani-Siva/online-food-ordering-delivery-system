const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const MENU_PATH = path.join(DATA_DIR, 'menu.json');
const ORDERS_PATH = path.join(DATA_DIR, 'orders.json');
const VALID_STATUSES = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));

function readJson(filePath) {
  try {
    const fileContent = fs.readFileSync(filePath, 'utf8');
    return fileContent ? JSON.parse(fileContent) : [];
  } catch (error) {
    throw new Error(`Unable to read ${filePath}: ${error.message}`);
  }
}

function writeJson(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
  } catch (error) {
    throw new Error(`Unable to write ${filePath}: ${error.message}`);
  }
}

function sendError(res, statusCode, message) {
  return res.status(statusCode).json({ error: message });
}

function sanitizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function validateMenuPayload(payload) {
  const name = sanitizeText(payload.name);
  const description = sanitizeText(payload.description);
  const category = sanitizeText(payload.category);
  const image = sanitizeText(payload.image) || 'placeholder.png';
  const price = Number(payload.price);

  if (!name || !description || !category) {
    return 'Name, description, and category are required.';
  }

  if (!Number.isFinite(price) || price <= 0) {
    return 'Price must be a valid number greater than zero.';
  }

  return {
    name,
    description,
    category,
    image,
    price
  };
}

function buildOrderSummary(items) {
  return items.map((item) => ({
    id: Number(item.id),
    name: sanitizeText(item.name),
    price: Number(item.price),
    quantity: Number(item.quantity)
  })).filter((item) => item.id && item.name && item.quantity > 0 && item.price > 0);
}

app.use(express.static(PUBLIC_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/api/menu', (req, res) => {
  try {
    const menu = readJson(MENU_PATH);
    res.json(menu);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get('/api/menu/:id', (req, res) => {
  try {
    const menu = readJson(MENU_PATH);
    const item = menu.find((entry) => Number(entry.id) === Number(req.params.id));

    if (!item) {
      return sendError(res, 404, 'Menu item not found.');
    }

    res.json(item);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.post('/api/menu', (req, res) => {
  try {
    const validated = validateMenuPayload(req.body);

    if (validated === 'Name, description, and category are required.' || validated === 'Price must be a valid number greater than zero.') {
      return sendError(res, 400, validated);
    }

    const menu = readJson(MENU_PATH);
    const newItem = {
      id: Date.now(),
      ...validated
    };

    menu.push(newItem);
    writeJson(MENU_PATH, menu);
    res.status(201).json(newItem);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.put('/api/menu/:id', (req, res) => {
  try {
    const validated = validateMenuPayload(req.body);

    if (validated === 'Name, description, and category are required.' || validated === 'Price must be a valid number greater than zero.') {
      return sendError(res, 400, validated);
    }

    const menu = readJson(MENU_PATH);
    const menuIndex = menu.findIndex((item) => Number(item.id) === Number(req.params.id));

    if (menuIndex === -1) {
      return sendError(res, 404, 'Menu item not found.');
    }

    menu[menuIndex] = {
      ...menu[menuIndex],
      ...validated,
      id: Number(req.params.id)
    };

    writeJson(MENU_PATH, menu);
    res.json(menu[menuIndex]);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.delete('/api/menu/:id', (req, res) => {
  try {
    const menu = readJson(MENU_PATH);
    const itemIndex = menu.findIndex((item) => Number(item.id) === Number(req.params.id));

    if (itemIndex === -1) {
      return sendError(res, 404, 'Menu item not found.');
    }

    const removedItem = menu.splice(itemIndex, 1)[0];
    writeJson(MENU_PATH, menu);
    res.json({ message: 'Menu item deleted successfully.', deletedItem: removedItem });
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const orders = readJson(ORDERS_PATH);
    res.json(orders);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const orders = readJson(ORDERS_PATH);
    const order = orders.find((entry) => String(entry.id) === String(req.params.id));

    if (!order) {
      return sendError(res, 404, 'Order not found.');
    }

    res.json(order);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const { customer, items } = req.body;
    const name = sanitizeText(customer && customer.name);
    const phone = sanitizeText(customer && customer.phone);
    const address = sanitizeText(customer && customer.address);

    if (!name || !phone || !address) {
      return sendError(res, 400, 'Customer name, phone number, and address are required.');
    }

    if (!Array.isArray(items) || items.length === 0) {
      return sendError(res, 400, 'Please add at least one menu item to the cart.');
    }

    const sanitizedItems = buildOrderSummary(items);

    if (sanitizedItems.length === 0) {
      return sendError(res, 400, 'Cart contains invalid or missing menu items.');
    }

    const total = sanitizedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const orders = readJson(ORDERS_PATH);
    const newOrder = {
      id: `ORD-${Date.now()}`,
      customer: {
        name,
        phone,
        address
      },
      items: sanitizedItems,
      total: Number(total.toFixed(2)),
      status: 'Placed',
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    writeJson(ORDERS_PATH, orders);
    res.status(201).json(newOrder);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.put('/api/orders/:id/status', (req, res) => {
  try {
    const { status } = req.body;
    const normalizedStatus = sanitizeText(status);

    if (!VALID_STATUSES.includes(normalizedStatus)) {
      return sendError(res, 400, 'Status must be one of: Placed, Preparing, Out for Delivery, Delivered.');
    }

    const orders = readJson(ORDERS_PATH);
    const orderIndex = orders.findIndex((order) => String(order.id) === String(req.params.id));

    if (orderIndex === -1) {
      return sendError(res, 404, 'Order not found.');
    }

    orders[orderIndex].status = normalizedStatus;
    writeJson(ORDERS_PATH, orders);
    res.json(orders[orderIndex]);
  } catch (error) {
    sendError(res, 500, error.message);
  }
});

app.use((req, res) => {
  sendError(res, 404, 'Route not found.');
});

app.use((error, req, res, next) => {
  console.error('Server error:', error);
  sendError(res, 500, 'Internal server error.');
});

app.listen(PORT, () => {
  console.log('Server running on http://localhost:3000');
});
