const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');

const app = express();
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const MENU_PATH = path.join(DATA_DIR, 'menu.json');
const ORDERS_PATH = path.join(DATA_DIR, 'orders.json');
const USERS_PATH = path.join(DATA_DIR, 'users.json');
const RESTAURANT_PATH = path.join(DATA_DIR, 'restaurant.json');
const VALID_STATUSES = ['Placed', 'Preparing', 'Out for Delivery', 'Delivered'];
const ADMIN_USERNAME = 'admin';
const SESSION_SECRET = process.env.SESSION_SECRET || 'foodiecart-secret';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin@123';
const ADMIN_PASSWORD_HASH = bcrypt.hashSync(ADMIN_PASSWORD, 10);

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      sameSite: 'lax'
    }
  })
);

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

function ensureDataFiles() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(USERS_PATH)) {
    writeJson(USERS_PATH, []);
  }

  if (!fs.existsSync(RESTAURANT_PATH)) {
    writeJson(RESTAURANT_PATH, {
      name: 'Foodie Cart Kitchen',
      address: '22 Market Street, Bengaluru, India',
      phone: '+91 98765 43210',
      openingHours: 'Mon-Sun: 10:00 AM - 11:30 PM'
    });
  }
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
  return items
    .map((item) => ({
      id: Number(item.id),
      name: sanitizeText(item.name),
      price: Number(item.price),
      quantity: Number(item.quantity)
    }))
    .filter((item) => item.id && item.name && item.quantity > 0 && item.price > 0);
}

function requireCustomerAuth(req, res, next) {
  if (!req.session || !req.session.user) {
    return sendError(res, 401, 'Customer authentication required.');
  }

  next();
}

function requireAdminAuth(req, res, next) {
  if (!req.session || !req.session.adminAuthenticated) {
    return sendError(res, 401, 'Admin authentication required.');
  }

  next();
}

function buildUserResponse(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    address: user.address
  };
}

ensureDataFiles();
app.use(express.static(PUBLIC_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
});

app.get('/admin', (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get(['/adimin', '/adimin/'], (req, res) => {
  res.sendFile(path.join(PUBLIC_DIR, 'admin.html'));
});

app.get('/api/auth/me', (req, res) => {
  if (!req.session || !req.session.user) {
    return res.json({ loggedIn: false, user: null });
  }

  return res.json({
    loggedIn: true,
    user: buildUserResponse(req.session.user)
  });
});

app.get('/api/admin/me', (req, res) => {
  if (!req.session || !req.session.adminAuthenticated) {
    return res.json({ loggedIn: false, username: null });
  }

  res.json({ loggedIn: true, username: ADMIN_USERNAME });
});

app.post('/api/auth/signup', (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body || {};
    const cleanName = sanitizeText(name);
    const cleanEmail = sanitizeText(email).toLowerCase();
    const cleanPhone = sanitizeText(phone);
    const cleanAddress = sanitizeText(address);
    const cleanPassword = typeof password === 'string' ? password : '';

    if (!cleanName || !cleanEmail || !cleanPassword || !cleanPhone || !cleanAddress) {
      return sendError(res, 400, 'Name, email, password, phone, and address are required.');
    }

    if (cleanPassword.length < 6) {
      return sendError(res, 400, 'Password must be at least 6 characters long.');
    }

    const users = readJson(USERS_PATH);
    const existingUser = users.find((user) => user.email.toLowerCase() === cleanEmail);

    if (existingUser) {
      return sendError(res, 409, 'An account with this email already exists.');
    }

    const newUser = {
      id: Date.now(),
      name: cleanName,
      email: cleanEmail,
      hashedPassword: bcrypt.hashSync(cleanPassword, 10),
      phone: cleanPhone,
      address: cleanAddress,
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    writeJson(USERS_PATH, users);

    req.session.user = buildUserResponse(newUser);
    return res.status(201).json({
      message: 'Signup successful.',
      user: buildUserResponse(newUser)
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body || {};
    const cleanEmail = sanitizeText(email).toLowerCase();
    const cleanPassword = typeof password === 'string' ? password : '';

    if (!cleanEmail || !cleanPassword) {
      return sendError(res, 400, 'Email and password are required.');
    }

    const users = readJson(USERS_PATH);
    const user = users.find((entry) => entry.email.toLowerCase() === cleanEmail);

    if (!user || !bcrypt.compareSync(cleanPassword, user.hashedPassword)) {
      return sendError(res, 401, 'Invalid email or password.');
    }

    req.session.user = buildUserResponse(user);
    return res.json({
      message: 'Login successful.',
      user: buildUserResponse(user)
    });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.post('/api/auth/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((error) => {
      if (error) {
        return sendError(res, 500, 'Unable to log out.');
      }

      return res.json({ message: 'Logout successful.' });
    });
    return;
  }

  return res.json({ message: 'Logout successful.' });
});

app.post('/api/admin/login', (req, res) => {
  const { username, password } = req.body || {};
  const cleanUsername = sanitizeText(username);
  const cleanPassword = typeof password === 'string' ? password : '';

  if (!cleanUsername || !cleanPassword) {
    return sendError(res, 400, 'Username and password are required.');
  }

  if (cleanUsername !== ADMIN_USERNAME) {
    return sendError(res, 401, 'Invalid admin credentials.');
  }

  const isValidAdmin = bcrypt.compareSync(cleanPassword, ADMIN_PASSWORD_HASH);

  if (!isValidAdmin) {
    return sendError(res, 401, 'Invalid admin credentials.');
  }

  req.session.adminAuthenticated = true;
  req.session.admin = { username: ADMIN_USERNAME };
  return res.json({ message: 'Admin login successful.' });
});

app.post('/api/admin/logout', (req, res) => {
  if (req.session) {
    req.session.destroy((error) => {
      if (error) {
        return sendError(res, 500, 'Unable to log out.');
      }

      return res.json({ message: 'Admin logout successful.' });
    });
    return;
  }

  return res.json({ message: 'Admin logout successful.' });
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

app.post('/api/menu', requireAdminAuth, (req, res) => {
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
    return res.status(201).json(newItem);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.put('/api/menu/:id', requireAdminAuth, (req, res) => {
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
    return res.json(menu[menuIndex]);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.delete('/api/menu/:id', requireAdminAuth, (req, res) => {
  try {
    const menu = readJson(MENU_PATH);
    const itemIndex = menu.findIndex((item) => Number(item.id) === Number(req.params.id));

    if (itemIndex === -1) {
      return sendError(res, 404, 'Menu item not found.');
    }

    const removedItem = menu.splice(itemIndex, 1)[0];
    writeJson(MENU_PATH, menu);
    return res.json({ message: 'Menu item deleted successfully.', deletedItem: removedItem });
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.get('/api/orders', (req, res) => {
  try {
    const orders = readJson(ORDERS_PATH);
    return res.json(orders);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.get('/api/orders/mine', requireCustomerAuth, (req, res) => {
  try {
    const orders = readJson(ORDERS_PATH);
    const userId = req.session.user.id;
    const email = req.session.user.email;

    const myOrders = orders
      .filter((order) => {
        const matchesUserId = Number(order.userId) === Number(userId);
        const matchesEmail = order.customer && order.customer.email === email;
        return matchesUserId || matchesEmail;
      })
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    return res.json(myOrders);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.get('/api/orders/:id', (req, res) => {
  try {
    const orders = readJson(ORDERS_PATH);
    const order = orders.find((entry) => String(entry.id) === String(req.params.id));

    if (!order) {
      return sendError(res, 404, 'Order not found.');
    }

    return res.json(order);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.post('/api/orders', (req, res) => {
  try {
    const { customer, items } = req.body;
    const name = sanitizeText(customer && customer.name);
    const phone = sanitizeText(customer && customer.phone);
    const address = sanitizeText(customer && customer.address);
    const loggedUser = req.session && req.session.user ? req.session.user : null;

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
      userId: loggedUser ? Number(loggedUser.id) : null,
      customer: {
        name,
        phone,
        address,
        email: loggedUser ? loggedUser.email : null
      },
      items: sanitizedItems,
      total: Number(total.toFixed(2)),
      status: 'Placed',
      createdAt: new Date().toISOString()
    };

    orders.push(newOrder);
    writeJson(ORDERS_PATH, orders);
    return res.status(201).json(newOrder);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.put('/api/orders/:id/status', requireAdminAuth, (req, res) => {
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
    return res.json(orders[orderIndex]);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.get('/api/restaurant', (req, res) => {
  try {
    const restaurant = readJson(RESTAURANT_PATH);
    return res.json(restaurant);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.put('/api/restaurant', requireAdminAuth, (req, res) => {
  try {
    const restaurant = readJson(RESTAURANT_PATH);
    const { name, address, phone, openingHours } = req.body || {};

    const nextRestaurant = {
      ...restaurant,
      name: sanitizeText(name) || restaurant.name,
      address: sanitizeText(address) || restaurant.address,
      phone: sanitizeText(phone) || restaurant.phone,
      openingHours: sanitizeText(openingHours) || restaurant.openingHours
    };

    writeJson(RESTAURANT_PATH, nextRestaurant);
    return res.json(nextRestaurant);
  } catch (error) {
    return sendError(res, 500, error.message);
  }
});

app.use((req, res) => {
  sendError(res, 404, 'Route not found.');
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && error.status === 400 && 'body' in error) {
    return sendError(res, 400, 'Invalid JSON payload.');
  }

  console.error('Server error:', error);
  sendError(res, 500, 'Internal server error.');
});
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
