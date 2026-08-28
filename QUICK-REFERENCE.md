# 🚀 Quick Reference Guide

## Commands Cheat Sheet

### Backend Commands
```powershell
cd backend

# Install dependencies
npm install

# Seed database with products
npm run seed

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start
```

### Frontend Commands
```powershell
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Quick Start (All-in-One)
```powershell
# From agentic-checkout folder
.\start-dev.ps1
```

---

## Environment Variables

### Backend (backend/.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `MONGO_URI` | MongoDB connection string | `mongodb+srv://user:pass@cluster.mongodb.net/db` |
| `JWT_SECRET` | Secret for JWT tokens | `your_secret_key_here` |
| `GROQ_API_KEY` | Groq AI API key | `gsk_xxxxxxxxxxxx` |
| `RAZORPAY_KEY_ID` | Razorpay public key | `rzp_test_xxxx` |
| `RAZORPAY_KEY_SECRET` | Razorpay secret key | `xxxxxxxxxxxx` |
| `FRONTEND_URL` | Frontend URL for CORS | `http://localhost:3000` |

### Frontend (frontend/.env)
| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_RAZORPAY_KEY_ID` | Razorpay public key | `rzp_test_xxxx` |
| `VITE_API_URL` | Backend API URL | `http://localhost:5000` |

---

## API Endpoints Reference

### Authentication Endpoints
```
POST /api/auth/register
Body: { name, email, password }
Response: { token, user }

POST /api/auth/login
Body: { email, password }
Response: { token, user }
```

### Order Endpoints (Requires Authentication)
```
POST /api/chat
Headers: Authorization: Bearer <token>
Body: { message }
Response: Streaming text response with order details

POST /api/create-razorpay-order
Headers: Authorization: Bearer <token>
Body: { orderId }
Response: { razorpayOrderId, amount, currency, keyId }

POST /api/verify-payment
Headers: Authorization: Bearer <token>
Body: { razorpay_order_id, razorpay_payment_id, razorpay_signature }
Response: { success, message }

POST /api/retry-payment
Headers: Authorization: Bearer <token>
Body: { orderId }
Response: { razorpayOrderId, amount, currency, keyId }

GET /api/orders/me
Headers: Authorization: Bearer <token>
Response: { orders }

POST /api/webhook
Headers: x-razorpay-signature
Body: Razorpay webhook payload
Response: { success }
```

---

## Product Catalog

| Product | Price (INR) | AI Keywords |
|---------|-------------|-------------|
| Coffee | ₹499 | coffee, java, brew |
| Mouse | ₹799 | mouse, mice |
| USB-C Cable | ₹299 | usb, cable, usb-c |
| Notebook | ₹150 | notebook, notepad, journal |
| Desk Lamp | ₹1200 | lamp, light, desk lamp |

---

## Razorpay Test Cards

### Success Cards
```
Card Number: 4111 1111 1111 1111
CVV: Any 3 digits
Expiry: Any future date
```

### Failure Cards
```
Card Number: 4000 0000 0000 0002
CVV: Any 3 digits
Expiry: Any future date
```

### Other Test Cards
- **Authorization Failed**: `4000 0000 0000 9995`
- **Insufficient Funds**: `4000 0025 0000 3155`

---

## Order Status Flow

```
PENDING → ORDER_CREATED → PAID
                ↓
            FAILED → RETRY_GENERATED → PAID
```

| Status | Description |
|--------|-------------|
| `PENDING` | Initial order created |
| `ORDER_CREATED` | Razorpay order created, awaiting payment |
| `PAID` | Payment successful |
| `FAILED` | Payment failed |
| `RETRY_GENERATED` | New order created for retry |

---

## Useful MongoDB Queries

```javascript
// View all users
db.users.find()

// View all products
db.products.find()

// View all orders
db.orders.find()

// View orders for specific user
db.orders.find({ userId: ObjectId("user_id_here") })

// View paid orders
db.orders.find({ status: "PAID" })

// View failed orders
db.orders.find({ status: "FAILED" })

// Count total orders
db.orders.countDocuments()

// Get total revenue
db.orders.aggregate([
  { $match: { status: "PAID" } },
  { $group: { _id: null, total: { $sum: "$totalAmount" } } }
])
```

---

## Troubleshooting Quick Fixes

### Backend won't start
```powershell
cd backend
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

### Frontend won't start
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
npm install
npm run dev
```

### Port already in use
```powershell
# Kill process on port 5000
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess | Stop-Process -Force

# Or change port in .env
```

### MongoDB connection issues
- Whitelist your IP in MongoDB Atlas
- Check username/password in connection string
- Ensure database name is correct

### Razorpay issues
- Verify using test keys (starting with `rzp_test_`)
- Check both key_id and key_secret are correct
- Ensure frontend .env has the same key_id

---

## File Structure

```
agentic-checkout/
├── backend/
│   ├── models/
│   │   ├── User.js
│   │   ├── Product.js
│   │   ├── Order.js
│   │   └── AuditLog.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   └── orderRoutes.js
│   ├── server.js
│   ├── seed.js
│   ├── package.json
│   └── .env
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   │   ├── Login.jsx
│   │   │   ├── Login.css
│   │   │   ├── Chat.jsx
│   │   │   └── Chat.css
│   │   ├── utils/
│   │   │   └── razorpay.js
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── main.jsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.js
│   ├── package.json
│   └── .env
├── README.md
├── SETUP-GUIDE.md
├── QUICK-REFERENCE.md
├── start-dev.ps1
└── .gitignore
```

---

## Testing Scenarios

### Test 1: Simple Order
```
User: "I want 1 Coffee"
Bot: Asks for address
User: "123 Main Street, NYC"
Bot: Creates order with Pay Now button
```

### Test 2: Multiple Items
```
User: "I need 2 Mouse and 3 USB-C Cable, deliver to 456 Park Ave"
Bot: Creates order directly with total amount
```

### Test 3: Payment Success
```
1. Click Pay Now
2. Enter test card: 4111 1111 1111 1111
3. Complete payment
4. See success message
```

### Test 4: Payment Failure & Retry
```
1. Click Pay Now
2. Enter failure card: 4000 0000 0000 0002
3. Payment fails
4. Click retry
5. Use success card
6. Payment succeeds
```

---

## Performance Tips

- Keep MongoDB indexes on frequently queried fields
- Use Redis for session management in production
- Implement rate limiting on API endpoints
- Use PM2 for backend process management
- Enable gzip compression
- Implement CDN for frontend assets

---

## Security Checklist

✅ Passwords hashed with bcrypt  
✅ JWT tokens for authentication  
✅ Razorpay signature verification  
✅ Webhook signature validation  
✅ Environment variables for secrets  
✅ CORS configured properly  
✅ Input validation on all endpoints  
✅ SQL injection prevention (using Mongoose)  

---

## Next Features to Build

- [ ] Order history page
- [ ] Admin dashboard
- [ ] Email notifications
- [ ] SMS notifications
- [ ] Product images upload
- [ ] Discount codes
- [ ] Inventory management
- [ ] Analytics dashboard
- [ ] Multi-language support
- [ ] Dark mode

---

Happy Building! 🚀
