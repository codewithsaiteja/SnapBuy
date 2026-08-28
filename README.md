# 🛒 Agentic Checkout Concierge

An AI-powered conversational commerce platform built with the MERN stack, integrating Groq AI for natural language processing and Razorpay for secure payments.

## 🏗️ Project Structure

```
agentic-checkout/
├── backend/               # Node.js/Express server
│   ├── models/           # MongoDB schemas
│   ├── routes/           # API routes
│   ├── controllers/      # Business logic
│   ├── middleware/       # Auth & validation
│   ├── server.js         # Entry point
│   ├── seed.js           # Database seeder
│   └── .env              # Environment variables
│
└── frontend/             # React/Vite app
    ├── src/
    │   ├── components/   # Reusable components
    │   ├── pages/        # Login & Chat pages
    │   ├── utils/        # Razorpay utility
    │   ├── App.jsx       # Main app component
    │   └── main.jsx      # Entry point
    └── .env              # Frontend env variables
```

## 🚀 Features

- **AI-Powered Checkout**: Natural language processing using Groq AI
- **Conversational Commerce**: Chat-based product ordering
- **Secure Payments**: Razorpay integration with retry logic
- **Real-time Streaming**: Letter-by-letter AI responses
- **Webhook Support**: Automatic payment status updates
- **Order Management**: Track all orders with detailed logs
- **User Authentication**: JWT-based secure authentication

## 📋 Prerequisites

Before you begin, ensure you have the following installed:

- Node.js (v16 or higher)
- npm or yarn
- MongoDB Atlas account (or local MongoDB)
- Groq API key
- Razorpay test account

## 🔧 Setup Instructions

### Step 1: Get Your API Keys

1. **MongoDB Atlas**:
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a cluster and get your connection string

2. **Groq API**:
   - Sign up at [Groq Console](https://console.groq.com)
   - Generate an API key

3. **Razorpay**:
   - Sign up at [Razorpay](https://razorpay.com)
   - Get your test `key_id` and `key_secret` from Dashboard → Settings → API Keys

### Step 2: Backend Setup

1. Navigate to the backend folder:
   ```powershell
   cd backend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Update the `.env` file with your actual credentials:
   ```env
   PORT=5000
   MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/agentic_checkout
   JWT_SECRET=your_super_secret_jwt_key_here
   GROQ_API_KEY=gsk_your_actual_groq_key
   RAZORPAY_KEY_ID=rzp_test_your_key_id
   RAZORPAY_KEY_SECRET=your_key_secret
   FRONTEND_URL=http://localhost:3000
   ```

4. Seed the database with products:
   ```powershell
   npm run seed
   ```

5. Start the backend server:
   ```powershell
   npm run dev
   ```

### Step 3: Frontend Setup

1. Open a new terminal and navigate to the frontend folder:
   ```powershell
   cd frontend
   ```

2. Install dependencies:
   ```powershell
   npm install
   ```

3. Update the `.env` file with your Razorpay key:
   ```env
   VITE_RAZORPAY_KEY_ID=rzp_test_your_key_id
   VITE_API_URL=http://localhost:5000
   ```

4. Start the frontend development server:
   ```powershell
   npm run dev
   ```

### Step 4: Access the Application

- Frontend: http://localhost:3000
- Backend API: http://localhost:5000

## 🎯 How to Use

1. **Register**: Create a new account with name, email, and password
2. **Login**: Sign in with your credentials
3. **Chat**: Tell the AI what you want to buy and where to deliver
   - Example: "I want 2 Coffee and 1 Mouse, deliver to 123 Main Street, NYC"
4. **Pay**: Click the "Pay Now" button to complete your order
5. **Track**: View your order history

## 📦 Available Products

- Coffee - ₹499
- Mouse - ₹799
- USB-C Cable - ₹299
- Notebook - ₹150
- Desk Lamp - ₹1200

## 🔐 Security Features

- Password hashing with bcrypt
- JWT authentication
- Razorpay signature verification
- Webhook signature validation
- Raw body parsing for secure webhooks

## 🛠️ API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Orders
- `POST /api/chat` - AI-powered chat interface
- `POST /api/create-razorpay-order` - Create payment order
- `POST /api/verify-payment` - Verify payment signature
- `POST /api/retry-payment` - Retry failed payment
- `GET /api/orders/me` - Get user's orders
- `POST /api/webhook` - Razorpay webhook handler

## ⚠️ Important Notes

### Webhook Setup (Critical!)

The webhook route in `server.js` needs special handling for signature verification. Make sure you have:

```javascript
// Store raw body for webhook verification
app.use(express.json({ 
  verify: (req, res, buf) => {
    req.rawBody = buf.toString();
  }
}));
```

### Payment Retry Flow

If a payment fails or is cancelled:
1. User is prompted to retry
2. New Razorpay order is created
3. User can attempt payment again
4. Webhook automatically updates order status

## 🐛 Troubleshooting

### Backend Issues

1. **MongoDB Connection Error**:
   - Verify your connection string
   - Check network access settings in MongoDB Atlas
   - Ensure your IP is whitelisted

2. **Groq API Error**:
   - Verify your API key is correct
   - Check your Groq API quota

3. **Razorpay Error**:
   - Make sure you're using test keys (starting with `rzp_test_`)
   - Verify both key_id and key_secret are correct

### Frontend Issues

1. **CORS Error**:
   - Backend has CORS enabled, but check if running on correct ports
   - Backend: 5000, Frontend: 3000

2. **Payment Modal Not Opening**:
   - Check browser console for errors
   - Verify Razorpay script is loaded
   - Ensure VITE_RAZORPAY_KEY_ID is set correctly

## 📝 Testing the App

1. **Register a new user**
2. **Start a conversation**: "I want 1 Coffee"
3. **Provide address**: "Deliver to 123 Test Street"
4. **Click Pay Now**
5. **Use Razorpay test cards**:
   - Success: `4111 1111 1111 1111`
   - Failure: `4000 0000 0000 0002`
   - CVV: Any 3 digits
   - Expiry: Any future date

## 🚀 Deployment Tips

- Use environment variables for all secrets
- Enable MongoDB IP whitelist for production
- Use Razorpay live keys for production
- Set up proper webhook URLs in Razorpay dashboard
- Use HTTPS for webhook endpoints
- Implement rate limiting for APIs

## 📄 License

MIT License - feel free to use this project for learning and development!

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

---

Built with ❤️ using MERN Stack, Groq AI, and Razorpay
