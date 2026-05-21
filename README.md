# Ecommerce Backend API

An Express and MongoDB-based backend for an e-commerce platform. It provides the core server-side capabilities needed to run an online storefront, including authentication, product management, cart and order workflows, payments, coupons, reviews, and analytics.

The service is designed as a modular REST API with route separation, controller-driven business logic, JWT cookie-based authentication, and integrations for Cloudinary, Firebase, Stripe, and email verification. It is meant to power a frontend application while keeping the backend responsibilities isolated, scalable, and easy to extend.

---

## Key Features

- **Authentication and account flows** - Register, log in, verify email addresses, log out, and support Google-based authentication.
- **Product catalog management** - Create, browse, search, filter, paginate, and soft-delete products, including image uploads and seller association.
- **Shopping cart and order support** - Handle cart operations, checkout-related flows, and order lifecycle endpoints.
- **Payments and coupons** - Integrate Stripe-based payment processing and coupon handling for promotional logic.
- **Reviews and engagement** - Support product reviews plus user actions such as likes and favorites.
- **Analytics endpoints** - Expose reporting-oriented routes for administrative or operational insight.
- **Cloud-backed media and identity services** - Use Cloudinary for image storage and Firebase Admin for Google token verification.
- **Cookie-based JWT sessions** - Store signed auth tokens in HTTP-only cookies for a simpler browser-based login experience.

---

## Tech Stack

| Area | Technology |
| --- | --- |
| Runtime | Node.js |
| API Framework | Express.js |
| Database | MongoDB with Mongoose |
| Authentication | JSON Web Tokens, HTTP-only cookies, bcrypt |
| Validation | Joi |
| File Uploads | Multer, Cloudinary |
| Payments | Stripe |
| Email | Nodemailer |
| Third-Party Auth | Firebase Admin |
| CORS / Cookies | cors, cookie-parser |
| Development Tooling | nodemon |

---

## Getting Started

### Prerequisites

Before you start, make sure you have the following installed:

- **Node.js** 18.x or later
- **npm** 9.x or later
- **MongoDB** running locally or a MongoDB Atlas connection string
- **Cloudinary** account credentials for image uploads
- **Stripe** secret key for payment integration
- **Gmail account** or another SMTP-compatible sender for email verification
- **Firebase Admin service account JSON** for Google authentication

### Installation

```bash
git clone <repository-url>
cd Ecommerce-Backend
npm install
```

### Environment Variables

Create a `.env` file in the project root and define the required values. A typical configuration looks like this:

```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>/<database>
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=development

MAIL_SENDER_EMAIL=your-email@gmail.com
MAIL_PASSWORD=your-gmail-app-password

CLOUDINARY_CLOUD_NAME=your-cloudinary-cloud-name
CLOUDINARY_API_KEY=your-cloudinary-api-key
CLOUDINARY_API_SECRET=your-cloudinary-api-secret

STRIPE_SECRET_KEY=sk_test_or_live_key_here
```

For Firebase authentication, place your service account file at:

```text
utils/serviceAccountKey.json
```

Keep that file out of version control if it contains real credentials.

---

## Usage

### Run the server

The application boots from [index.js](index.js), which starts the Express server on port `5000`.

```bash
node index.js
```

If you want automatic restarts during development, run nodemon against the same entry point:

```bash
npx nodemon index.js
```

### Available npm script

The current `package.json` includes:

```bash
npm run dev
```

If you use that script as-is, make sure it targets the correct entry file. The active server bootstrap in this repository is [index.js](index.js).

### API base paths

The main router registry mounts the following prefixes:

- `/api/auth`
- `/api/password`
- `/api/products`
- `/api/users`
- `/api/reviews`
- `/api/cart`
- `/api/payments`
- `/api/coupons`
- `/api/orders`
- `/api/analytics`

### Common local workflow

1. Start MongoDB.
2. Add the `.env` file.
3. Start the API with `node index.js` or `npx nodemon index.js`.
4. Connect a frontend app on `http://localhost:5173`, which is the allowed CORS origin in the current server config.

---

## Project Structure

```text
Ecommerce-Backend/
├── index.js                  # Express app bootstrap and MongoDB connection
├── start/
│   └── routes.js             # Central router registration
├── Controllers/              # Request handlers and business logic
├── routes/                   # Route definitions for each API area
├── Models/                   # Mongoose schemas and models
├── middleware/               # Auth, token, error handling, and upload middleware
├── utils/                    # Cloudinary, Stripe, Firebase, and email helpers
├── Validation/               # Joi validation rules
├── images/                   # Local image assets / upload staging area
└── DB_SHAPE.json             # Database shape reference
```

---

## API Overview

The backend is organized by domain rather than by transport concerns. The current codebase includes controllers and routes for:

- **Authentication** - registration, login, email verification, logout, and Google auth
- **Users** - user account operations
- **Products** - listing, creation, seller-specific queries, favorites, likes, and image uploads
- **Reviews** - product review management
- **Cart** - shopping cart operations
- **Orders** - order creation and management
- **Payments** - Stripe payment flows
- **Coupons** - promotional code handling
- **Analytics** - metrics and reporting
- **Password recovery** - reset and recovery flows

---

## Notes

- The server enables credentials-based CORS for `http://localhost:5173`, which suggests a separate frontend application is expected to run alongside this API.
- Authentication is cookie-based, so client requests should include credentials when calling protected endpoints.
- Product creation depends on multipart form uploads and Cloudinary-backed image storage.

---

## License

This project is currently distributed under the ISC license as declared in [package.json](package.json).