# ReelVault Website — Full Setup Guide

Ye website video wale reference (Superprofile store) jaisi hai: product grid,
cart, checkout, aur payment ke baad automatic email jisme download links hon.

**Maine ye poora test karke banaya hai** — cart, checkout, order creation,
sab kaam kar raha hai. Sirf 3 cheezein tumhe set karni hain: products, email,
aur QR code.

---

## Part 1 — Products add/edit karo

`backend/products.json` file kholo, isme apne actual products daalo:

```json
{
  "id": "reels-600k",
  "title": "600K+ Viral Reels Bundle",
  "price": 299,
  "originalPrice": 1999,
  "downloadUrl": "https://drive.google.com/your-real-link"
}
```

- `downloadUrl` me apni Google Drive folder ka **share link** daalo (jaha
  actual reels files hain). Drive folder ko "Anyone with the link can view"
  par set karna mat bhoolna.
- Jitne chaho utne products is list me add kar sakte ho, bas comma se separate
  karke.

## Part 2 — Email automatically bhejne ke liye (Gmail setup)

Jab tum kisi order ko "verified" mark karoge, customer ko automatically email
jayega (bilkul us Superprofile wale jaisa) — iske liye Gmail App Password
chahiye:

1. https://myaccount.google.com/apppasswords par jao (apne Gmail account se
   login karke). Agar 2-Step Verification on nahi hai, pehle wo on karo
   (Google isko zaroori banata hai App Password ke liye).
2. "App name" me kuch bhi likho jaise "ReelVault" aur "Create" dabao.
3. Google tumhe 16-character ka password dega jaisa `abcd efgh ijkl mnop`
   — ise copy kar lo (spaces hata dena).
4. `backend/.env.example` file ko copy karke `backend/.env` naam se save karo,
   aur usme:
   ```
   EMAIL_USER=your-gmail@gmail.com
   EMAIL_APP_PASSWORD=abcdefghijklmnop
   ADMIN_KEY=koi-bhi-secret-password
   ```

## Part 3 — Apna UPI QR code lagao

1. GPay/PhonePe/Paytm app se apna QR code image download karo.
2. Usko `frontend/qr-code.png` naam se save karo (frontend folder me,
   index.html ke saath).
3. `frontend/index.html` me "UPI ID: your-upi-id@bank" wali line dhoondke
   apni real UPI ID daal do.

---

## Part 4 — Deploy karo

### Backend (Render.com — free)

1. GitHub par naya repo banao, `backend` folder ki saari files usme daalo
   (`.env` file mat daalna — wo already `.gitignore` me hai, safe hai).
2. https://render.com par GitHub se sign in karo → "New +" → "Web Service".
3. Apna repo select karo. Settings:
   - Build Command: `npm install`
   - Start Command: `node server.js`
4. "Environment" section me ye 3 variables add karo (apni `.env` file se):
   - `EMAIL_USER`
   - `EMAIL_APP_PASSWORD`
   - `ADMIN_KEY`
5. Deploy hone ke baad tumhe URL milega jaisa:
   `https://reelvault-backend.onrender.com`

### Frontend (GitHub Pages — free)

1. `frontend/index.html` file kholo, sabse neeche `<script>` tag me ye line
   dhoondo:
   ```javascript
   const API_URL = "https://reelvault-backend.onrender.com";
   ```
   Isko apne **actual Render URL** se replace karo (jo Part 4 me mila).
2. Naya GitHub repo banao (jaise `reelvault-site`), `index.html` aur
   `qr-code.png` dono usme upload karo.
3. Repo Settings → Pages → Branch: `main` → Save.
4. 1-2 minute me live URL milega: `https://username.github.io/reelvault-site/`

---

## Part 5 — Orders manage karna (daily use)

**Sab orders dekhne ke liye**, browser me ye kholo:
```
https://reelvault-backend.onrender.com/api/orders?key=YOUR_ADMIN_KEY
```

**Jab koi order aaye**, apna UPI app kholke check karo transaction ID (UTR)
match kar raha hai aur paisa aaya hai. Confirm hone ke baad, ye API call karo
(Postman app use kar sakte ho, ya main tumhe ek simple admin webpage bhi bana
sakta hun jisse button dabake verify ho jaye — bata dena):

```
POST https://reelvault-backend.onrender.com/api/orders/RV1234567890/verify?key=YOUR_ADMIN_KEY
Body (JSON): { "status": "verified" }
```

Ye call hote hi customer ko **automatically email chala jayega** uske
download links ke saath.

---

## ⚠️ Important baatein

1. **Manual verification** — koi bhi galat UTR number daal sakta hai. Hamesha
   apna UPI app check karo before verifying, warna free me product de doge.
2. **Google Drive links** — agar bahut zyada downloads honge, Drive
   "too many requests" error de sakta hai. Bade audience ke liye Google Drive
   ki jagah services jaise Bunny.net ya AWS S3 better rahenge (batana agar
   zarurat pade).
3. **Real payment gateway (Razorpay)** — jab tumhara Razorpay account approve
   ho jaye, bata dena — us QR-code wale manual system ki jagah main Razorpay
   ka real checkout (Card/UPI/NetBanking selector, bilkul video jaisa) jod
   dunga. Baaki sab (products, cart, email) same rahega, sirf payment part
   badlega.
4. Is bundle me jo reel content becha ja raha hai, uske rights/resell-rights
   tumhare paas hone chahiye — content ka source clear rakhna business ke
   liye zaroori hai.
