<<<<<<< HEAD
# online-food-ordering-delivery-system
A full-stack web app for browsing menus, placing orders, and tracking deliveries in real time — built with HTML, CSS, JavaScript (DOM manipulation) and a Node.js/Express server. College internship project (Full Stack Development).
=======
# Online Food Ordering & Delivery Management System

A full-stack internship project that simulates a restaurant ordering workflow online. Customers can browse the menu, add food items to a cart, place an order, and track delivery status. Restaurant staff can manage the menu, update order progress, and maintain restaurant details from an admin dashboard.

## Tech Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js + Express
- Authentication: Express Session + bcrypt for hashing passwords
- Data Storage: Local JSON files in the data folder
- Version Control: Git

## Project Structure

```text
food-delivery-app/
├── server.js
├── package.json
├── .gitignore
├── data/
│   ├── menu.json
│   ├── orders.json
│   ├── users.json
│   └── restaurant.json
├── public/
│   ├── index.html
│   ├── admin.html
│   ├── css/
│   │   └── styles.css
│   ├── js/
│   │   ├── app.js
│   │   └── admin.js
│   └── images/
├── README.md
└── .git/
```

## Features

### Customer Features
- Browse menu items grouped by category
- Filter by category
- Add items to the cart and adjust quantities
- Show live subtotal and total
- Sign up or log in for a faster repeat-order experience
- Checkout as a guest or as a logged-in customer
- Track order status from Placed to Delivered
- View a personal order history when logged in

### Admin Features
- Admin-only dashboard login
- View all orders in one dashboard
- Update status progression for each order
- Add new menu items
- Edit existing items
- Delete menu items
- View and update restaurant profile details

## Authentication Flow

### Customer signup and login
- Customers can create an account from the customer page modal.
- Passwords are never stored in plain text; bcrypt hashes them before saving.
- The app uses server-side sessions with express-session.
- After login, customer checkout fields are pre-filled with the saved profile, while still allowing manual editing before each order.
- Guest checkout continues to work without login.

### Admin login
- The admin dashboard is protected by a separate login screen.
- The app uses one hardcoded admin account with the username `admin`.
- The admin password is loaded from the `ADMIN_PASSWORD` environment variable when available.
- If not set, a default demo password is used for easier local testing: `Admin@123`.

## Environment Variables

Create a `.env` file in the project root if needed for production-style configuration:

```bash
SESSION_SECRET=your-session-secret
ADMIN_PASSWORD=your-secure-admin-password
```

For the first admin login, use:

- Username: `admin`
- Password: the value from `ADMIN_PASSWORD` or the demo fallback `Admin@123`

## Installation

1. Open the project folder in the terminal.
2. Run:

```bash
npm install
```

## Run the Application

Start the server:

```bash
npm start
```

Use nodemon during development:

```bash
npm run dev
```

## Access the App

- Customer site: http://localhost:3000/
- Admin dashboard: http://localhost:3000/admin

## Known Limitations

- No real payment gateway is integrated.
- No live GPS tracking is implemented for delivery riders.
- This project uses JSON files for persistence instead of a production database.
- The authentication flow is demonstration-ready for a college internship project, not a production-grade secure system.

## Notes

This project uses a lightweight local storage approach with JSON files so it can run without any external database. It is designed to be easy to demonstrate in a college internship review or classroom presentation.
>>>>>>> 4c51918 (Scaffold project structure)
