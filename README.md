
#  Logistics Supply Chain Management System

A full-stack logistics supply chain application where products pass securely between a **seller**, **multiple middlemen**, and a **buyer**, with each handoff authenticated using an **OTP verification system**.

---

## 📌 Features

- 🔐**Secure OTP-based Transfer** between supply chain nodes.
- 👥 **Role-based Users**: Seller, Middlemen, Delivery Admin, Buyer.
- 📦 **Product Lifecycle Tracking** from creation to final delivery.
- 🛠️ **Delivery Admin Panel** for assigning middlemen.
- 🔄 Real-time **status updates** on product transfers.
- 🌐 Frontend built with **React**, Backend with **Node.js + Express**, and MongoDB for data storage.

---

## ⚙️ Tech Stack

| Layer         | Technology              |
|---------------|--------------------------|
| Frontend      | React.js, Tailwind CSS   |
| Backend       | Node.js, Express.js      |
| Database      | MongoDB (Mongoose)       |
| Auth & OTP    | Cookie-based Auth + OTP Logic |
| File Storage  | Pinata (IPFS integration) |

---

## 🛤️ User Roles and Flow

### 👨‍💼 Seller
- Adds product.
- Initiates transfer to first middleman using OTP.

### 🚛 Middleman (one or many)
- Sees product in transactions.
- Verifies OTP to receive product.
- Generates OTP to give to next middleman/buyer.

### 🧑‍💼 Delivery Admin
- Uploads product (optional).
- Assigns middlemen for orders.

### 🧍 Buyer
- Verifies OTP to receive final product.

---

## 🔐 OTP Flow Logic

1. **Generate OTP**: Sender calls `/order/generateTransferOTP` with `orderId`.
2. **Verify OTP**: Receiver enters OTP via `/order/verifyOtp` endpoint.
3. **Confirm Transfer**: Receiver calls `/order/confirmTransfer` to complete handoff.
4. Statuses are updated in the `track[]` array:
   - `give_status` of sender → `true`
   - `recieve_status` of receiver → `true`

---

## 📁 Project Structure

```
backend/
├── controllers/
│   └── orderController.js
├── models/
│   ├── Order.js
│   ├── Product.js
│   └── User.js
├── routes/
│   └── orderRoutes.js
└── utils/
    ├── OTPGenerator.js
    └── PinataHandling.js

frontend/
├── pages/
│   ├── LoginPage.js
│   ├── OrdersPage.js
│   └── TransactionsPage.js
├── components/
│   └── OTPInput.js
└── App.js
```

---

## 📦 Installation

### Prerequisites
- Node.js
- MongoDB running locally or via cloud
- Pinata account (optional, for file uploads)

### Backend Setup

```bash
cd backend
npm install
npm run dev
```

### Frontend Setup

```bash
cd frontend
npm install
npm start
```

---

## 🔑 .env Configuration

```env
# Backend .env
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
PINATA_API_KEY=your_pinata_api_key
PINATA_SECRET_API_KEY=your_pinata_secret_key
```

---

## 🧪 API Endpoints

| Method | Endpoint                         | Description                         |
|--------|----------------------------------|-------------------------------------|
| POST   | `/order/generateTransferOTP`     | Generates OTP for next transfer     |
| POST   | `/order/verifyOtp`               | Verifies OTP from receiver          |
| POST   | `/order/confirmTransfer`         | Confirms order handoff              |
| GET    | `/order/orders_to_deliver`       | Get orders assigned to current user |
| GET    | `/order/my-orders`               | Get orders related to current user  |
| POST   | `/product/add`                   | Seller adds product                 |

---

## ✅ Future Enhancements

- Notification system on OTP handoff
- QR code-based OTP scanning
- Analytics for admin panel
- Blockchain-based transfer logs

---

## 👨‍💻 Author

**Harshit Singh Baghel**  
[GitHub](https://github.com/) | [LinkedIn](https://linkedin.com/) | [Email](mailto:your.email@example.com)

---

## 📄 License

MIT License
