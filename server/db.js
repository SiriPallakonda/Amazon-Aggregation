import mongoose from 'mongoose';
import { customers, products, orders, payments, reviews } from './data.js';

const schemas = {
  customers: new mongoose.Schema({ customer_id: Number, name: String, email: String, city: String, state: String, membership: String }, { strict: false }),
  products: new mongoose.Schema({ product_id: Number, name: String, category: String, price: Number, stock: Number, brand: String }, { strict: false }),
  orders: new mongoose.Schema({ order_id: Number, customer_id: Number, products: [mongoose.Schema.Types.Mixed], total_amount: Number, payment_method: String, order_status: String, city: String, order_date: Date }, { strict: false }),
  payments: new mongoose.Schema({ payment_id: Number, order_id: Number, payment_method: String, payment_status: String, amount: Number }, { strict: false }),
  reviews: new mongoose.Schema({ review_id: Number, product_id: Number, customer_id: Number, rating: Number, comment: String }, { strict: false })
};
const models = Object.fromEntries(Object.entries(schemas).map(([name, schema]) => [name, mongoose.models[name] || mongoose.model(name, schema, name)]));
let connected = false;
let demoMode = true;
export async function connectDB() {
  if (!process.env.MONGODB_URI) { demoMode = true; return; }
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.MONGODB_DB || 'amazonDB', serverSelectionTimeoutMS: 8000 });
  connected = true; demoMode = false;
}
export function getModel(name) { return models[name]; }
export function isDemoMode() { return demoMode; }
export function isConnected() { return connected; }
export async function seedDatabase() {
  if (!connected) throw new Error('MongoDB is not connected. Set MONGODB_URI first.');
  const sets = { customers, products, orders, payments, reviews };
  for (const [name, docs] of Object.entries(sets)) {
    await models[name].deleteMany({});
    await models[name].insertMany(docs);
  }
  await models.orders.collection.createIndex({ order_status: 1 });
  await models.orders.collection.createIndex({ customer_id: 1 });
  await models.orders.collection.createIndex({ city: 1 });
  return Object.fromEntries(await Promise.all(Object.keys(sets).map(async name => [name, await models[name].countDocuments()])));
}
