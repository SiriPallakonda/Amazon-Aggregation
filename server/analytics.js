import { customers, products, orders, payments, reviews } from './data.js';
import { getModel, isDemoMode } from './db.js';

const source = { customers, products, orders, payments, reviews };
const money = n => Math.round((n || 0) * 100) / 100;
const groupBy = (arr, keyFn) => arr.reduce((m, x) => { const k = keyFn(x); (m[k] ||= []).push(x); return m; }, {});
const getPath = (obj, path) => path.split('.').reduce((a, k) => a?.[k], obj);
const evalExpr = (expr, row) => { if (typeof expr === 'string' && expr.startsWith('$')) return getPath(row, expr.slice(1)); if (expr && typeof expr === 'object' && '$multiply' in expr) return expr.$multiply.map(v => evalExpr(v, row)).reduce((a,b) => a*b, 1); return expr; };
export async function findMany(collection, filter = {}) {
  if (isDemoMode()) return source[collection].filter(x => Object.entries(filter).every(([k,v]) => String(x[k]).toLowerCase().includes(String(v).toLowerCase())));
  return getModel(collection).find(filter).lean();
}
export async function getDashboard() {
  if (!isDemoMode()) {
    const O = getModel('orders');
    const [total, delivered, revenue, avg, byStatus, byCity, trend, categories, topCustomers] = await Promise.all([
      O.countDocuments(), O.countDocuments({order_status:'Delivered'}),
      O.aggregate([{$match:{order_status:'Delivered'}},{$group:{_id:null,total:{$sum:'$total_amount'}}}]),
      O.aggregate([{$match:{order_status:'Delivered'}},{$group:{_id:null,avg:{$avg:'$total_amount'}}}]),
      O.aggregate([{$sortByCount:'$order_status'}]),
      O.aggregate([{$match:{order_status:'Delivered'}},{$group:{_id:'$city',revenue:{$sum:'$total_amount'}}},{$sort:{revenue:-1}}]),
      O.aggregate([{$match:{order_status:'Delivered'}},{$group:{_id:{$dateToString:{format:'%Y-%m',date:'$order_date'}},revenue:{$sum:'$total_amount'}}},{$sort:{_id:1}}]),
      O.aggregate([{$match:{order_status:'Delivered'}},{$unwind:'$products'},{$lookup:{from:'products',localField:'products.product_id',foreignField:'product_id',as:'product'}},{$unwind:'$product'},{$group:{_id:'$product.category',revenue:{$sum:{$multiply:['$products.quantity','$products.price']}}}},{$sort:{revenue:-1}}]),
      O.aggregate([{$match:{order_status:'Delivered'}},{$group:{_id:'$customer_id',spend:{$sum:'$total_amount'},orders:{$sum:1}}},{$sort:{spend:-1}},{$limit:5},{$lookup:{from:'customers',localField:'_id',foreignField:'customer_id',as:'customer'}},{$unwind:'$customer'},{$project:{_id:0,customerId:'$_id',name:'$customer.name',city:'$customer.city',spend:1,orders:1}}])
    ]);
    return {totalOrders:total,deliveredOrders:delivered,totalRevenue:revenue[0]?.total||0,averageOrderValue:avg[0]?.avg||0,byStatus:byStatus.map(x=>({name:x._id,value:x.count})),byCity:byCity.map(x=>({name:x._id,value:x.revenue})),trend:trend.map(x=>({month:x._id,revenue:x.revenue})),categories:categories.map(x=>({name:x._id,value:x.revenue})),topCustomers,customers:await getModel('customers').countDocuments(),products:await getModel('products').countDocuments()};
  }
  const delivered = orders.filter(o => o.order_status === 'Delivered');
  const totalRevenue = delivered.reduce((s,o)=>s+o.total_amount,0);
  const status = groupBy(orders,o=>o.order_status);
  const city = groupBy(delivered,o=>o.city);
  const month = groupBy(delivered,o=>o.order_date.toISOString().slice(0,7));
  const categorySales = {};
  delivered.forEach(o=>o.products.forEach(it=>{const p=products.find(x=>x.product_id===it.product_id); categorySales[p.category]=(categorySales[p.category]||0)+it.quantity*it.price;}));
  const customerSales = groupBy(delivered,o=>o.customer_id);
  return {totalOrders:orders.length,deliveredOrders:delivered.length,totalRevenue,averageOrderValue:totalRevenue/delivered.length,customers:customers.length,products:products.length,byStatus:Object.entries(status).map(([name,a])=>({name,value:a.length})),byCity:Object.entries(city).map(([name,a])=>({name,value:a.reduce((s,o)=>s+o.total_amount,0)})).sort((a,b)=>b.value-a.value),trend:Object.entries(month).map(([month,a])=>({month,revenue:a.reduce((s,o)=>s+o.total_amount,0)})).sort((a,b)=>a.month.localeCompare(b.month)),categories:Object.entries(categorySales).map(([name,value])=>({name,value})).sort((a,b)=>b.value-a.value),topCustomers:Object.entries(customerSales).map(([id,a])=>({customerId:Number(id),name:customers.find(c=>c.customer_id===Number(id))?.name,city:customers.find(c=>c.customer_id===Number(id))?.city,spend:a.reduce((s,o)=>s+o.total_amount,0),orders:a.length})).sort((a,b)=>b.spend-a.spend).slice(0,5)};
}
export async function runPreset(name) {
  if (isDemoMode()) return demoPreset(name);
  const O=getModel('orders');
  const pipelines={
    delivered:{label:'Delivered orders',pipeline:[{$match:{order_status:'Delivered'}},{$project:{_id:0,order_id:1,customer_id:1,total_amount:1,city:1,order_status:1}},{$sort:{total_amount:-1}},{$limit:10}]},
    cityRevenue:{label:'Revenue by city',pipeline:[{$match:{order_status:'Delivered'}},{$group:{_id:'$city',totalRevenue:{$sum:'$total_amount'},orders:{$sum:1},averageOrder:{$avg:'$total_amount'}}},{$sort:{totalRevenue:-1}}]},
    categoryRevenue:{label:'Revenue by category',pipeline:[{$match:{order_status:'Delivered'}},{$unwind:'$products'},{$lookup:{from:'products',localField:'products.product_id',foreignField:'product_id',as:'product'}},{$unwind:'$product'},{$group:{_id:'$product.category',revenue:{$sum:{$multiply:['$products.quantity','$products.price']}}}},{$sort:{revenue:-1}},{$limit:5}]},
    topCustomers:{label:'Top customers',pipeline:[{$match:{order_status:'Delivered'}},{$group:{_id:'$customer_id',totalSpend:{$sum:'$total_amount'},orderCount:{$sum:1}}},{$sort:{totalSpend:-1}},{$limit:5},{$lookup:{from:'customers',localField:'_id',foreignField:'customer_id',as:'customer'}},{$unwind:'$customer'},{$project:{_id:0,customer:'$customer.name',city:'$customer.city',totalSpend:1,orderCount:1}}]},
    paymentMethods:{label:'Payment methods',pipeline:[{$sortByCount:'$payment_method'}]},
    orderStatus:{label:'Order status counts',pipeline:[{$sortByCount:'$order_status'}]},
    productSales:{label:'Product sales',pipeline:[{$unwind:'$products'},{$group:{_id:'$products.product_id',unitsSold:{$sum:'$products.quantity'},revenue:{$sum:{$multiply:['$products.quantity','$products.price']}}}},{$sort:{revenue:-1}},{$limit:10},{$lookup:{from:'products',localField:'_id',foreignField:'product_id',as:'product'}},{$unwind:'$product'},{$project:{_id:0,product:'$product.name',category:'$product.category',unitsSold:1,revenue:1}}]}
  };
  const selected=pipelines[name]; if(!selected) throw new Error('Unknown preset');
  return {label:selected.label,pipeline:selected.pipeline,result:await O.aggregate(selected.pipeline)};
}
function demoPreset(name) {
  const delivered=orders.filter(o=>o.order_status==='Delivered');
  if(name==='delivered') return {label:'Delivered orders',pipeline:[{$match:{order_status:'Delivered'}},{$project:{order_id:1,customer_id:1,total_amount:1,city:1}},{$sort:{total_amount:-1}},{$limit:10}],result:delivered.slice().sort((a,b)=>b.total_amount-a.total_amount).slice(0,10)};
  if(name==='cityRevenue') return {label:'Revenue by city',pipeline:[{$match:{order_status:'Delivered'}},{$group:{_id:'$city',totalRevenue:{$sum:'$total_amount'}}},{$sort:{totalRevenue:-1}}],result:Object.entries(groupBy(delivered,o=>o.city)).map(([_id,a])=>({_id,totalRevenue:a.reduce((s,o)=>s+o.total_amount,0),orders:a.length,averageOrder:a.reduce((s,o)=>s+o.total_amount,0)/a.length})).sort((a,b)=>b.totalRevenue-a.totalRevenue)};
  if(name==='categoryRevenue') {const m={};delivered.forEach(o=>o.products.forEach(it=>{const p=products.find(x=>x.product_id===it.product_id);m[p.category]=(m[p.category]||0)+it.quantity*it.price;}));return {label:'Revenue by category',pipeline:[{$match:{order_status:'Delivered'}},{$unwind:'$products'},{$lookup:{from:'products',localField:'products.product_id',foreignField:'product_id',as:'product'}},{$group:{_id:'$product.category',revenue:{$sum:{$multiply:['$products.quantity','$products.price']}}}},{$sort:{revenue:-1}}],result:Object.entries(m).map(([_id,revenue])=>({_id,revenue})).sort((a,b)=>b.revenue-a.revenue).slice(0,5)};}
  if(name==='topCustomers') {const m=groupBy(delivered,o=>o.customer_id);return {label:'Top customers',pipeline:[{$group:{_id:'$customer_id',totalSpend:{$sum:'$total_amount'}}},{$sort:{totalSpend:-1}},{$limit:5},{$lookup:{from:'customers',localField:'_id',foreignField:'customer_id',as:'customer'}}],result:Object.entries(m).map(([id,a])=>({customer:customers.find(c=>c.customer_id===Number(id)).name,city:customers.find(c=>c.customer_id===Number(id)).city,totalSpend:a.reduce((s,o)=>s+o.total_amount,0),orderCount:a.length})).sort((a,b)=>b.totalSpend-a.totalSpend).slice(0,5)};}
  if(name==='paymentMethods') return {label:'Payment methods',pipeline:[{$sortByCount:'$payment_method'}],result:Object.entries(groupBy(orders,o=>o.payment_method)).map(([_id,a])=>({_id,count:a.length})).sort((a,b)=>b.count-a.count)};
  if(name==='orderStatus') return {label:'Order status counts',pipeline:[{$sortByCount:'$order_status'}],result:Object.entries(groupBy(orders,o=>o.order_status)).map(([_id,a])=>({_id,count:a.length})).sort((a,b)=>b.count-a.count)};
  if(name==='productSales') {const m={};orders.forEach(o=>o.products.forEach(it=>{const p=products.find(x=>x.product_id===it.product_id);m[it.product_id]||={product:p.name,category:p.category,unitsSold:0,revenue:0};m[it.product_id].unitsSold+=it.quantity;m[it.product_id].revenue+=it.quantity*it.price;}));return {label:'Product sales',pipeline:[{$unwind:'$products'},{$group:{_id:'$products.product_id',unitsSold:{$sum:'$products.quantity'}}},{$sort:{revenue:-1}},{$limit:10}],result:Object.values(m).sort((a,b)=>b.revenue-a.revenue).slice(0,10)};}
  throw new Error('Unknown preset');
}
export async function executePipeline(collection, pipeline) {
  const allowed=['orders','customers','products','payments','reviews'];
  if(!allowed.includes(collection)) throw new Error('Unsupported collection');
  if(!Array.isArray(pipeline)||pipeline.length<1||pipeline.length>12) throw new Error('Pipeline must contain 1 to 12 stages');
  const permitted=new Set(['$match','$group','$unwind','$project','$sort','$sample','$limit','$skip','$lookup','$count','$sortByCount','$addFields','$set','$unset','$replaceRoot','$replaceWith','$bucket','$bucketAuto','$facet','$unionWith','$merge','$out']);
  for(const stage of pipeline) { const key=Object.keys(stage||{})[0]; if(!permitted.has(key)) throw new Error(`Stage ${key||'(empty)'} is not enabled in this demo lab`); }
  if(isDemoMode()) return {result:runLocalPipeline(source[collection],pipeline),mode:'demo'};
  const result=await getModel(collection).aggregate(pipeline).allowDiskUse(true).exec();
  return {result,mode:'mongodb'};
}
function runLocalPipeline(input,pipeline) {
  let rows=structuredClone(input);
  for(const stage of pipeline) {
    const [op,arg]=Object.entries(stage)[0];
    if(op==='$match') rows=rows.filter(x=>Object.entries(arg).every(([k,v])=>{const val=getPath(x,k);return typeof v==='object'&&v!==null?(('$gte'in v?val>=v.$gte:true)&&('$lte'in v?val<=v.$lte:true)&&('$ne'in v?val!==v.$ne:true)):(val===v);}));
    else if(op==='$unwind') {const path=typeof arg==='string'?arg:arg.path;const k=path.replace(/^\$/,'');rows=rows.flatMap(x=>(x[k]||[]).map(v=>({...x,[k]:v})));}
    else if(op==='$project') rows=rows.map(x=>{const y={};for(const [k,v] of Object.entries(arg)){if(v===1&&x[k]!==undefined)y[k]=x[k];else if(typeof v==='string'&&v.startsWith('$'))y[k]=v.slice(1).split('.').reduce((a,b)=>a?.[b],x);else if(typeof v==='number'&&v!==0)y[k]=v;}return y;});
    else if(op==='$sort') rows.sort((a,b)=>{for(const [k,d] of Object.entries(arg)){if(a[k]<b[k])return -1*d;if(a[k]>b[k])return 1*d;}return 0;});
    else if(op==='$limit') rows=rows.slice(0,arg);
    else if(op==='$skip') rows=rows.slice(arg);
    else if(op==='$sample') rows=rows.slice().sort(()=>Math.random()-.5).slice(0,arg.size);
    else if(op==='$count') rows=rows.length?[{[arg]:rows.length}]:[];
    else if(op==='$sortByCount') {const key=arg.replace(/^\$/,'');rows=Object.entries(groupBy(rows,x=>x[key])).map(([_id,a])=>({_id,count:a.length})).sort((a,b)=>b.count-a.count);}
    else if(op==='$group') {const groups=groupBy(rows,x=>{const v=arg._id;const resolved=evalExpr(v,x);return resolved===null?'null':(typeof resolved==='object'?JSON.stringify(resolved):String(resolved));});rows=Object.entries(groups).map(([key,a])=>{const out={_id:key==='null'?null:(key.startsWith('{')||key.startsWith('[')?JSON.parse(key):isNaN(Number(key))?key:Number(key))};for(const [field,expr] of Object.entries(arg)){if(field==='_id')continue;const [fn,val]=Object.entries(expr)[0];const vals=a.map(x=>evalExpr(val,x));if(fn==='$sum')out[field]=vals.reduce((s,v)=>s+(typeof v==='number'?v:1),0);if(fn==='$avg')out[field]=vals.reduce((s,v)=>s+(v||0),0)/vals.length;if(fn==='$max')out[field]=Math.max(...vals);if(fn==='$min')out[field]=Math.min(...vals);if(fn==='$push')out[field]=vals;}return out;});}
    else if(op==='$addFields'||op==='$set') rows=rows.map(x=>({...x,...Object.fromEntries(Object.entries(arg).map(([k,v])=>[k,evalExpr(v,x)]))}));
    else if(op==='$unset') rows=rows.map(x=>{const y={...x};(Array.isArray(arg)?arg:[arg]).forEach(k=>delete y[k]);return y;});
    else if(op==='$lookup') {const foreign=source[arg.from];rows=rows.map(x=>({...x,[arg.as]:(foreign||[]).filter(y=>getPath(y,arg.foreignField)===getPath(x,arg.localField))}));}
    else throw new Error(`${op} is supported only when connected to MongoDB Atlas in this build.`);
  }
  return rows;
}
export async function getCollections() {
  if(isDemoMode()) return Object.entries(source).map(([name,docs])=>({name,count:docs.length}));
  return Promise.all(Object.keys(source).map(async name=>({name,count:await getModel(name).countDocuments()})));
}
export async function getPerformance() {
  const pipeline=[{$match:{order_status:'Delivered'}},{$group:{_id:'$city',revenue:{$sum:'$total_amount'}}},{$sort:{revenue:-1}}];
  if(isDemoMode()) return {mode:'Demo preview',message:'Connect MongoDB Atlas to collect real execution statistics.',pipeline};
  const O=getModel('orders');
  const before=await O.collection.aggregate(pipeline).explain('executionStats');
  await O.collection.createIndex({order_status:1});
  const after=await O.collection.aggregate(pipeline).explain('executionStats');
  return {mode:'MongoDB Atlas',before:before.executionStats,after:after.executionStats,pipeline};
}
