# 📖 Complete Setup Guide

## Quick Start (5 Minutes)

### 1️⃣ Install Dependencies

Open PowerShell in the `agentic-checkout` folder and run:

```powershell
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

cd ..
```

### 2️⃣ Configure Environment Variables

#### Backend Configuration (`backend/.env`)

Replace the placeholder values with your actual credentials:

```env
PORT=5000
MONGO_URI=mongodb+srv://yourusername:yourpassword@cluster0.xxxxx.mongodb.net/agentic_checkout
JWT_SECRET=change_this_to_a_long_random_string_abc123xyz789
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxx
FRONTEND_URL=http://localhost:3000
```

**How to get these:**

- **MONGO_URI**: 
  1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
  2. Create free cluster → Click "Connect" → Choose "Connect your application"
  3. Copy the connection string and replace `<password>` with your database password

- **GROQ_API_KEY**:
  1. Visit [Groq Console](https://console.groq.com)
  2. Sign up/login → Go to API Keys → Create new key

- **RAZORPAY_KEY_ID & SECRET**:
  1. Sign up at [Razorpay](https://dashboard.razorpay.com/signup)
  2. Go to Settings → API Keys → Generate Test Keys

#### Frontend Configuration (`frontend/.env`)

```env
VITE_RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxx
VITE_API_URL=http://localhost:5000
```

Use the same Razorpay key ID from backend.

### 3️⃣ Seed the Database

```powershell
cd backend
npm run seed
```

You should see: ✅ Products seeded successfully!

### 4️⃣ Start the Servers

**Option A: Automatic (Recommended)**

```powershell
# From the agentic-checkout folder
.\start-dev.ps1
```

This will open both servers in separate windows.

**Option B: Manual**

Open two separate PowerShell windows:

**Window 1 (Backend):**
```powershell
cd backend
npm run dev
```

**Window 2 (Frontend):**
```powershell
cd frontend
npm run dev
```

### 5️⃣ Open the App

Visit http://localhost:3000 in your browser!

---

## 🧪 Testing the Application

### 1. Register a New Account
- Click "Register"
- Enter: Name, Email, Password
- Click "Register" button

### 2. Start Chatting
Try these example messages:

```
"I want 2 Coffee"
```

```
"I need 1 Mouse and 1 USB-C Cable, deliver to 123 Main St, NYC"
```

```
"Send me 3 Notebooks to 456 Park Avenue, California"
```

### 3. Make a Test Payment

When the "Pay Now" button appears:

1. Click it to open Razorpay modal
2. Use test card: `4111 1111 1111 1111`
3. CVV: Any 3 digits (e.g., `123`)
4. Expiry: Any future date (e.g., `12/25`)
5. Click "Pay"

**Other test cards:**
- Success: `4111 1111 1111 1111`
- Failure: `4000 0000 0000 0002`

---

## 🔍 Verification Checklist

✅ MongoDB Atlas connected (check backend console for "MongoDB Connected")  
✅ Products seeded (5 products in database)  
✅ Backend running on port 5000  
✅ Frontend running on port 3000  
✅ Can register new user  
✅ Can login  
✅ Chat interface loads  
✅ AI responds to messages  
✅ Razorpay modal opens  
✅ Payment completes  

---

## 🚨 Common Issues & Solutions

### Issue 1: "MongoDB Connection Error"

**Solution:**
- Check if your IP is whitelisted in MongoDB Atlas
- Go to Atlas → Network Access → Add IP Address → Add Current IP
- Verify username/password in connection string

### Issue 2: "Groq API Error"

**Solution:**
- Verify API key is correct (starts with `gsk_`)
- Check you have credits/quota remaining
- Test key at [Groq Playground](https://console.groq.com/playground)

### Issue 3: "Cannot find module 'express'"

**Solution:**
```powershell
cd backend
Remove-Item -Recurse -Force node_modules
npm install
```

### Issue 4: "Port 5000 already in use"

**Solution:**
```powershell
# Find what's using port 5000
Get-Process -Id (Get-NetTCPConnection -LocalPort 5000).OwningProcess

# Kill the process (replace PID with actual process ID)
Stop-Process -Id PID -Force

# Or change the port in backend/.env
PORT=5001
```

### Issue 5: "Razorpay modal not opening"

**Solution:**
- Check browser console for errors
- Verify `VITE_RAZORPAY_KEY_ID` in frontend/.env
- Clear browser cache and reload
- Ensure you're using test keys (starting with `rzp_test_`)

### Issue 6: "CORS Error"

**Solution:**
- Make sure backend is running on port 5000
- Make sure frontend is running on port 3000
- Check that CORS is enabled in backend/server.js

---

## 📊 Database Schema

### Users Collection
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  createdAt: Date
}
```

### Products Collection
```javascript
{
  name: String,
  price: Number,
  image: String
}
```

### Orders Collection
```javascript
{
  userId: ObjectId,
  items: [{ name, qty, price }],
  totalAmount: Number,
  address: String,
  razorpayOrderId: String,
  razorpayPaymentId: String,
  status: Enum ['PENDING', 'ORDER_CREATED', 'PAID', 'FAILED', 'RETRY_GENERATED'],
  createdAt: Date,
  updatedAt: Date
}
```

---

## 🎯 Next Steps

1. **Test all features** using the test scenarios above
2. **Customize products** by editing the seed data in `backend/models/Product.js`
3. **Add more products** or change prices
4. **Style customization** in frontend CSS files
5. **Deploy** to production (see deployment guide in README)

---

## 📞 Need Help?

If you encounter issues:
1. Check the browser console for errors
2. Check backend terminal for error logs
3. Verify all environment variables are set correctly
4. Ensure all dependencies are installed
5. Try restarting both servers

---

## 🎉 Success!

If you can complete a test purchase, congratulations! Your AI-powered checkout system is working perfectly.

Next, customize it to fit your needs:
- Add more products
- Customize the AI prompts
- Add order history page
- Implement admin panel
- Add email notifications

Happy coding! 🚀
