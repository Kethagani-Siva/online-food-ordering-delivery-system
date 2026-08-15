<<<<<<< HEAD
# online-food-ordering-delivery-system
A full-stack web app for browsing menus, placing orders, and tracking deliveries in real time — built with HTML, CSS, JavaScript (DOM manipulation) and a Node.js/Express server. College internship project (Full Stack Development).
=======
# Online Food Ordering & Delivery Management System

A full-stack internship project that simulates a restaurant ordering workflow online. Customers can browse the menu, add food items to a cart, place an order, and track delivery status. Restaurant staff can manage the menu and update order progress from an admin dashboard.

## Tech Stack

- Frontend: HTML5, CSS3, Vanilla JavaScript
- Backend: Node.js + Express
- Data Storage: JSON files in the data folder
- Version Control: Git

## Project Structure

```text
food-delivery-app/
├── server.js
├── package.json
├── .gitignore
├── data/
│   ├── menu.json
│   └── orders.json
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
- Submit customer details and place an order
- Track order status from Placed to Delivered
- Poll fresh status updates without reloading the page

### Admin Features
- View all orders in one dashboard
- Update status progression for each order
- Add new menu items
- Edit existing items
- Delete menu items

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

## Notes

This project uses a lightweight local storage approach with JSON files so it can run without any external database. It is designed to be easy to demonstrate in a college internship review or classroom presentation.
>>>>>>> 4c51918 (Scaffold project structure)
