# Amazon Analytics — MongoDB Aggregation Framework

A full-stack academic demonstration of MongoDB Aggregation Framework concepts using an Amazon-style e-commerce dataset. This is an independent educational simulation; it is not affiliated with Amazon and does not use Amazon internal/customer data.

## Features

- Responsive React dashboard with revenue, order, customer and category summaries.
- Orders, products and customers pages.
- Aggregation Lab with seven ready-made MongoDB aggregation pipelines.
- Custom pipeline runner for `$match`, `$group`, `$unwind`, `$project`, `$sort`, `$sample`, `$limit`, `$skip`, `$lookup`, `$count`, `$sortByCount`, `$addFields`, `$set` and `$unset` (MongoDB Atlas mode supports MongoDB's native aggregation operators).
- Database collection overview, index setup and explain-plan endpoint.
- Demo mode works immediately without a MongoDB connection; connect Atlas for persistent storage and native MongoDB execution.
- CSV export for order and aggregation results.

## Stack

- React + Vite + Recharts + Lucide React
- Node.js + Express
- MongoDB Atlas + Mongoose

## Run locally (demo mode)

Requirements: Node.js 18.18+ or 20+, npm.

```bash
npm install
npm run dev
```

Open http://localhost:5173. The API runs on http://localhost:5000. If `MONGODB_URI` is not set, the app uses its built-in sample dataset so you can test the UI immediately.

For a production-style local build:

```bash
npm run build
npm start
```

Open http://localhost:5000.

## Connect MongoDB Atlas

1. Create a free MongoDB Atlas cluster at https://www.mongodb.com/cloud/atlas.
2. Create a database user and allow the deployment IP address (for Render, use `0.0.0.0/0` only if you understand that it permits connections from any IP; use a restricted IP list when practical).
3. Copy the Node.js connection string. Replace the username/password placeholders and URL-encode special characters in the password.
4. Copy `.env.example` to `.env` and set:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster-host>/?retryWrites=true&w=majority
MONGODB_DB=amazonDB
PORT=5000
```

5. Seed the five collections and indexes:

```bash
npm run seed
```

Collections: `customers`, `products`, `orders`, `payments`, `reviews`.

**Warning:** `npm run seed` clears and recreates these five collections before inserting the sample dataset. Use it only on a new project database, not on a database containing data you need.

When Atlas is connected, dashboard reports and preset pipelines execute on MongoDB. The custom pipeline endpoint runs native MongoDB aggregation pipelines.

## Deploy free on Render

This repository is configured as one Node web service. The Express server serves the built React app and `/api` endpoints from the same origin.

1. Push this project to a GitHub repository.
2. Sign in to https://render.com and choose **New → Web Service**.
3. Connect the GitHub repository.
4. Configure:
   - Runtime: Node
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Instance: Free (if available in your account/region)
5. Add environment variables in Render:
   - `MONGODB_URI` = your Atlas connection string
   - `MONGODB_DB` = `amazonDB`
   - `NODE_VERSION` = `20.18.1` (or another supported Node 20 release)
6. Deploy. Render provides a public `https://<service-name>.onrender.com` URL.
7. Run `npm run seed` from your local terminal with the same Atlas URI in `.env` to populate the live database.
8. Open the public URL and check the Database page. It should say MongoDB Atlas connected.

Free Render services may spin down when idle and take some time to wake on the next request. Free-tier terms, availability and limits can change; check the provider's current plan page before your presentation.

## API routes

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/health` | Health and database mode |
| GET | `/api/dashboard` | Dashboard metrics and chart data |
| GET | `/api/orders` | Latest orders |
| GET | `/api/products` | Product catalogue |
| GET | `/api/customers` | Customer directory |
| GET | `/api/collections` | Collection counts |
| GET | `/api/preset/:name` | Run a predefined aggregation report |
| POST | `/api/aggregate` | Execute a custom pipeline |
| GET | `/api/performance` | Explain plan / index comparison |
| POST | `/api/seed` | Seed connected database (destructive reset of demo collections) |

## Aggregation concepts demonstrated

- `$match`: filter delivered orders.
- `$group`: group revenue by city/category/customer.
- `$unwind`: expand each order's embedded product array.
- `$project`: select/rename result fields.
- `$sort`: rank cities, products and customers.
- `$sample`: randomly select sample documents in custom pipeline.
- `$limit` / `$skip`: pagination and top-N reports.
- `$lookup`: join `orders` with `customers` and `products`.
- `$sum`, `$avg`, `$min`, `$max`, `$push`: accumulator examples can be composed in the custom lab.
- `$sortByCount`: count payment methods and order statuses.
- Indexing and `explain('executionStats')`: query optimization discussion.
- `$merge`: extend the API/pipeline for materialized summary collections as a further experiment.

## Dataset and interpretation

The bundled records are synthetic Amazon-like records generated for coursework. There are 10 customers, 10 products, 72 orders, 72 payments and 30 reviews. Monetary values are INR. Dashboard revenue metrics include Delivered orders only; the order count includes every status. The product-sales preset includes all order statuses to show gross ordered units/revenue; explain this distinction in the report.

## Important limitations

- This is an academic analytics prototype, not a production Amazon clone.
- No login was requested. Do not put private or sensitive data into this public demo.
- Demo mode uses an in-memory sample dataset and a lightweight subset of pipeline behavior. Connect MongoDB Atlas for native pipeline execution and persistent data.
- MongoDB MapReduce is deprecated from MongoDB 5.0. The project emphasizes aggregation pipelines; discuss MapReduce as a legacy comparison and use `$group` / `$merge` for modern workflows.
- The performance route creates an index on `order_status`. It is an educational demonstration; on a small dataset the index may not improve elapsed time.
