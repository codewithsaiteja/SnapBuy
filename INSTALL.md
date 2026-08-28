# 📥 Installation Guide

## Prerequisites Check

Before starting, verify you have:

```powershell
# Check Node.js version (should be 16+)
node --version

# Check npm version
npm --version

# If not installed, download from: https://nodejs.org/
```

---

## Step-by-Step Installation

### 1. Install Backend Dependencies

```powershell
cd backend
npm install
```

**Expected packages:**
- express (Web framework)
- mongoose (MongoDB ODM)
- dotenv (Environment variables)
- cors (Cross-origin resource sharing)
- bcrypt (Password hashing)
- jsonwebtoken (JWT authentication)
- razorpay (Payment gateway)
- groq-sdk (AI integration)
- nodemon (Auto-reload dev server)

### 2. Install Frontend Dependencies

```powershell
cd ../frontend
npm install
```

**Expected packages:**
- react (UI library)
- react-dom (React DOM renderer)
- react-router-dom (Routing)
- axios (HTTP client)
- vite (Build tool)
- @vitejs/plugin-react (React plugin for Vite)

---

## Configuration

### Backend Configuration

Edit `backend/.env`:

```env
PORT=5000
MONGO_URI=your_mongodb_connection_string_here
JWT_SECRET=your_secret_key_here
GROQ_API_KEY=your_groq_api_key_here
RAZORPAY_KEY_ID=your_razorpay_key_id_here
RAZORPAY_KEY_SECRET=your_razorpay_secret_here
FRONTEND_URL=http://localhost:3000
```

### Frontend Configuration

Edit `frontend/.env`:

```env
VITE_RAZORPAY_KEY_ID=your_razorpay_key_id_here
VITE_API_URL=http://localhost:5000
```

---

## Database Setup

### Seed Products

```powershell
cd backend
npm run seed
```

**Expected output:**
```
📦 Connected to MongoDB
✅ Products seeded successfully!
```

---

## Running the Application

### Option 1: Automatic Start (Recommended)

From the `agentic-checkout` root folder:

```powershell
.\start-dev.ps1
```

This will open two PowerShell windows:
- Window 1: Backend server on port 5000
- Window 2: Frontend server on port 3000

### Option 2: Manual Start

**Terminal 1 (Backend):**
```powershell
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
cd frontend
npm run dev
```

---

## Verification

### Backend Running Successfully

You should see:
```
🚀 Server running on port 5000
✅ MongoDB Connected
```

### Frontend Running Successfully

You should see:
```
  VITE v4.x.x  ready in xxx ms

  ➜  Local:   http://localhost:3000/
  ➜  Network: use --host to expose
```

---

## Access URLs

| Service | URL | Description |
|---------|-----|-------------|
| Frontend | http://localhost:3000 | React application |
| Backend API | http://localhost:5000 | Express server |
| Health Check | http://localhost:5000/ | API status |

---

## Testing Installation

### 1. Test Backend

Open http://localhost:5000 in your browser.

**Expected response:**
```json
{
  "message": "Agentic Checkout Concierge API is running"
}
```

### 2. Test Frontend

Open http://localhost:3000 in your browser.

**Expected:** Login page should load with form fields.

### 3. Test Registration

1. Click "Register"
2. Fill in: Name, Email, Password
3. Click "Register" button
4. Should redirect to chat page

---

## Installation Issues

### Issue: "npm: command not found"

**Solution:** Install Node.js from https://nodejs.org/

### Issue: "Cannot find module"

**Solution:**
```powershell
# In backend or frontend folder
Remove-Item -Recurse -Force node_modules
npm install
```

### Issue: "Port 5000 already in use"

**Solution:**
```powershell
# Find and kill process on port 5000
Get-NetTCPConnection -LocalPort 5000 | Select-Object -Property OwningProcess
Stop-Process -Id <ProcessId> -Force
```

Or change the port in `backend/.env`:
```env
PORT=5001
```

### Issue: "MongoDB connection failed"

**Solutions:**
1. Check your internet connection
2. Verify MongoDB URI in `.env`
3. Whitelist your IP in MongoDB Atlas:
   - Go to Atlas → Network Access
   - Click "Add IP Address"
   - Add your current IP or "Allow Access from Anywhere" (0.0.0.0/0) for testing

### Issue: "Vite build failed"

**Solution:**
```powershell
cd frontend
Remove-Item -Recurse -Force node_modules
Remove-Item -Force package-lock.json
npm install
npm run dev
```

---

## Uninstall

To completely remove the project:

```powershell
# From project root
cd ..
Remove-Item -Recurse -Force agentic-checkout
```

To remove just dependencies (keep code):

```powershell
# Backend
cd backend
Remove-Item -Recurse -Force node_modules

# Frontend
cd ../frontend
Remove-Item -Recurse -Force node_modules
```

---

## Production Build

### Backend Production

```powershell
cd backend
npm start
```

### Frontend Production Build

```powershell
cd frontend
npm run build
npm run preview
```

The build output will be in `frontend/dist/` folder.

---

## Environment Setup Checklist

Before running, ensure:

- [x] Node.js installed (v16+)
- [x] npm installed
- [x] MongoDB Atlas account created
- [x] Groq API key obtained
- [x] Razorpay test account created
- [x] Backend dependencies installed
- [x] Frontend dependencies installed
- [x] Backend .env configured
- [x] Frontend .env configured
- [x] Database seeded with products
- [x] Both servers running

---

## Next Steps

After successful installation:

1. ✅ Open http://localhost:3000
2. ✅ Register a new account
3. ✅ Test the chat interface
4. ✅ Make a test payment
5. ✅ Read SETUP-GUIDE.md for detailed usage
6. ✅ Read QUICK-REFERENCE.md for API docs

---

## Support

If you encounter issues during installation:

1. Check this document for common solutions
2. Review the error messages in terminal
3. Verify all prerequisites are met
4. Check environment variables are set correctly
5. Ensure internet connection is stable

---

**Installation Complete! 🎉**

You're now ready to start using the Agentic Checkout Concierge!
