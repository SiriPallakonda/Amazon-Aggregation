export const customers = [
  { customer_id: 101, name: 'Aarav Mehta', email: 'aarav@example.test', city: 'Delhi', state: 'Delhi', membership: 'Prime' },
  { customer_id: 102, name: 'Priya Nair', email: 'priya@example.test', city: 'Chennai', state: 'Tamil Nadu', membership: 'Regular' },
  { customer_id: 103, name: 'Rahul Shah', email: 'rahul@example.test', city: 'Mumbai', state: 'Maharashtra', membership: 'Prime' },
  { customer_id: 104, name: 'Sneha Reddy', email: 'sneha@example.test', city: 'Hyderabad', state: 'Telangana', membership: 'Prime' },
  { customer_id: 105, name: 'Kiran Rao', email: 'kiran@example.test', city: 'Bengaluru', state: 'Karnataka', membership: 'Regular' },
  { customer_id: 106, name: 'Meera Iyer', email: 'meera@example.test', city: 'Delhi', state: 'Delhi', membership: 'Regular' },
  { customer_id: 107, name: 'Dev Patel', email: 'dev@example.test', city: 'Pune', state: 'Maharashtra', membership: 'Prime' },
  { customer_id: 108, name: 'Ananya Das', email: 'ananya@example.test', city: 'Kolkata', state: 'West Bengal', membership: 'Regular' },
  { customer_id: 109, name: 'Vikram Singh', email: 'vikram@example.test', city: 'Jaipur', state: 'Rajasthan', membership: 'Prime' },
  { customer_id: 110, name: 'Ishita Bose', email: 'ishita@example.test', city: 'Kolkata', state: 'West Bengal', membership: 'Regular' }
];

export const products = [
  { product_id: 201, name: 'AeroBook Pro 14', category: 'Electronics', price: 74999, stock: 24, brand: 'AeroTech' },
  { product_id: 202, name: 'Nova X Smartphone', category: 'Electronics', price: 32999, stock: 48, brand: 'Nova' },
  { product_id: 203, name: 'Sonic Wireless Headphones', category: 'Electronics', price: 3999, stock: 85, brand: 'Sonic' },
  { product_id: 204, name: 'Stride Running Shoes', category: 'Fashion', price: 3499, stock: 62, brand: 'Stride' },
  { product_id: 205, name: 'Chrono Smart Watch', category: 'Accessories', price: 8999, stock: 31, brand: 'Chrono' },
  { product_id: 206, name: 'Urban Travel Backpack', category: 'Fashion', price: 1899, stock: 73, brand: 'Urban' },
  { product_id: 207, name: 'BrewMate Coffee Maker', category: 'Home & Kitchen', price: 5499, stock: 19, brand: 'BrewMate' },
  { product_id: 208, name: 'Glow Desk Lamp', category: 'Home & Kitchen', price: 1499, stock: 54, brand: 'Glow' },
  { product_id: 209, name: 'PixelView 27-inch Monitor', category: 'Electronics', price: 18999, stock: 16, brand: 'PixelView' },
  { product_id: 210, name: 'Everyday Cotton T-shirt', category: 'Fashion', price: 799, stock: 120, brand: 'Everyday' }
];

const statuses = ['Delivered', 'Delivered', 'Delivered', 'Shipped', 'Processing', 'Cancelled', 'Returned'];
const methods = ['UPI', 'Card', 'NetBanking', 'UPI', 'Wallet'];
const cities = ['Delhi', 'Chennai', 'Mumbai', 'Hyderabad', 'Bengaluru', 'Pune', 'Kolkata', 'Jaipur'];
const productIds = products.map(p => p.product_id);
export const orders = Array.from({ length: 72 }, (_, i) => {
  const customer = customers[i % customers.length];
  const first = productIds[(i * 3) % productIds.length];
  const second = productIds[(i * 3 + 4) % productIds.length];
  const ids = i % 3 === 0 ? [first, second] : [first];
  const items = ids.map((id, j) => {
    const p = products.find(x => x.product_id === id);
    const quantity = ((i + j) % 3) + 1;
    return { product_id: id, quantity, price: p.price };
  });
  const total = items.reduce((s, x) => s + x.quantity * x.price, 0);
  const date = new Date(Date.UTC(2026, (i * 7) % 10, (i * 5) % 27 + 1));
  return {
    order_id: 5001 + i, customer_id: customer.customer_id, products: items,
    total_amount: total, payment_method: methods[i % methods.length],
    order_status: statuses[i % statuses.length], city: cities[(i * 3) % cities.length],
    order_date: date
  };
});
export const payments = orders.map((o, i) => ({ payment_id: 9001 + i, order_id: o.order_id, payment_method: o.payment_method, payment_status: o.order_status === 'Cancelled' ? 'Refunded' : 'Successful', amount: o.total_amount }));
export const reviews = Array.from({ length: 30 }, (_, i) => ({ review_id: 7001 + i, product_id: productIds[i % productIds.length], customer_id: customers[i % customers.length].customer_id, rating: 3 + (i % 3), comment: ['Excellent quality', 'Good value for money', 'Works as expected', 'Very satisfied'][i % 4] }));
