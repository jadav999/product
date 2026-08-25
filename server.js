// ReelVault Backend v2 — multiple products, cart-based orders, automatic
// email delivery once you verify a payment.

const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const nodemailer = require("nodemailer");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

const ADMIN_KEY = process.env.ADMIN_KEY || "change-this-secret-key";
const PRODUCTS_FILE = path.join(__dirname, "products.json");
const ORDERS_FILE = path.join(__dirname, "orders.json");

if (!fs.existsSync(ORDERS_FILE)) {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify([], null, 2));
}

app.use(cors());
app.use(express.json());

// ---------- helpers ----------
function readJSON(file) {
  return JSON.parse(fs.readFileSync(file, "utf-8"));
}
function writeJSON(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}

// Email transporter — uses Gmail + an App Password (see README for setup)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD,
  },
});

async function sendAccessEmail(order) {
  const products = readJSON(PRODUCTS_FILE);
  const purchasedItems = order.items.map((item) => {
    const product = products.find((p) => p.id === item.id);
    return { title: product ? product.title : item.id, downloadUrl: product ? product.downloadUrl : "#" };
  });

  const linksHtml = purchasedItems
    .map((p) => `<li style="margin-bottom:10px;"><strong>${p.title}</strong><br><a href="${p.downloadUrl}" style="color:#0a7d3d;">Click here to download</a></li>`)
    .join("");

  const html = `
    <div style="font-family:Arial,sans-serif; max-width:520px; margin:0 auto; padding:20px;">
      <div style="background:#e8f5ee; padding:24px; border-radius:8px; text-align:center;">
        <div style="width:56px;height:56px;background:#22c55e;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;color:#fff;font-size:28px;">&#10003;</div>
        <h2 style="margin:14px 0 4px;">Your purchase was successful!</h2>
        <p style="color:#555;">You now have access to your products</p>
      </div>
      <div style="margin-top:20px;">
        <h3>Your downloads</h3>
        <ul style="padding-left:18px;">${linksHtml}</ul>
      </div>
      <table style="width:100%; margin-top:20px; border-collapse:collapse; font-size:14px;">
        <tr><td style="padding:8px; border:1px solid #eee; color:#777;">Order ID</td><td style="padding:8px; border:1px solid #eee;">${order.orderId}</td></tr>
        <tr><td style="padding:8px; border:1px solid #eee; color:#777;">Amount</td><td style="padding:8px; border:1px solid #eee;">₹${order.total}</td></tr>
        <tr><td style="padding:8px; border:1px solid #eee; color:#777;">Date</td><td style="padding:8px; border:1px solid #eee;">${new Date(order.createdAt).toLocaleDateString()}</td></tr>
      </table>
      <p style="margin-top:20px; font-size:12px; color:#999;">Thank you for your purchase!</p>
    </div>
  `;

  await transporter.sendMail({
    from: `"ReelVault" <${process.env.EMAIL_USER}>`,
    to: order.email,
    subject: `Your purchase was successful ✅ | ReelVault`,
    html,
  });
}

// ---------- routes ----------
app.get("/", (req, res) => {
  res.json({ status: "ok", message: "ReelVault backend v2 running" });
});

// GET /api/products — used by the frontend to render the product grid
app.get("/api/products", (req, res) => {
  res.json(readJSON(PRODUCTS_FILE));
});

// POST /api/order — cart checkout
// body: { items: [{id, qty}], name, email, phone, transactionId }
app.post("/api/order", (req, res) => {
  const { items, name, email, phone, transactionId } = req.body;

  if (!items || !items.length || !name || !email || !phone) {
    return res.status(400).json({ success: false, error: "Missing required fields" });
  }

  const products = readJSON(PRODUCTS_FILE);
  let total = 0;
  const orderItems = [];

  for (const item of items) {
    const product = products.find((p) => p.id === item.id);
    if (!product) continue;
    const qty = item.qty || 1;
    total += product.price * qty;
    orderItems.push({ id: product.id, title: product.title, price: product.price, qty });
  }

  if (!orderItems.length) {
    return res.status(400).json({ success: false, error: "No valid products in cart" });
  }

  const order = {
    orderId: "RV" + Date.now(),
    items: orderItems,
    total,
    name: String(name).trim(),
    email: String(email).trim(),
    phone: String(phone).trim(),
    transactionId: transactionId ? String(transactionId).trim() : "",
    status: transactionId ? "pending_verification" : "pending",
    createdAt: new Date().toISOString(),
  };

  const orders = readJSON(ORDERS_FILE);
  orders.push(order);
  writeJSON(ORDERS_FILE, orders);

  console.log("New order:", order.orderId, order.email, "₹" + order.total);
  res.json({ success: true, orderId: order.orderId, total: order.total });
});

// GET /api/orders?key=ADMIN_KEY — admin view
app.get("/api/orders", (req, res) => {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }
  const orders = readJSON(ORDERS_FILE);
  res.json({ success: true, count: orders.length, orders });
});

// POST /api/orders/:orderId/verify?key=ADMIN_KEY
// body: { status: "verified" | "rejected" }
// Automatically emails the customer their download links when verified.
app.post("/api/orders/:orderId/verify", async (req, res) => {
  if (req.query.key !== ADMIN_KEY) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  const { status } = req.body;
  if (!["verified", "rejected"].includes(status)) {
    return res.status(400).json({ success: false, error: "status must be 'verified' or 'rejected'" });
  }

  const orders = readJSON(ORDERS_FILE);
  const order = orders.find((o) => o.orderId === req.params.orderId);
  if (!order) {
    return res.status(404).json({ success: false, error: "Order not found" });
  }

  order.status = status;
  writeJSON(ORDERS_FILE, orders);

  if (status === "verified") {
    try {
      await sendAccessEmail(order);
      console.log("Access email sent to", order.email);
    } catch (err) {
      console.error("Failed to send email:", err.message);
      return res.json({ success: true, order, emailSent: false, emailError: err.message });
    }
  }

  res.json({ success: true, order, emailSent: status === "verified" });
});

app.listen(PORT, () => {
  console.log(`ReelVault backend v2 running on port ${PORT}`);
});
