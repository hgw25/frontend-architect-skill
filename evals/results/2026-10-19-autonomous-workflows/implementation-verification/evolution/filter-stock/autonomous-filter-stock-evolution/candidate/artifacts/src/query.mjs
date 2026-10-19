import { products, orders, availableProductIds } from './data.mjs';

const availableProducts = new Set(availableProductIds);

function wait(rows, query) {
 return new Promise((resolve,reject)=>setTimeout(()=>query.q==='error'?reject(Error('Query unavailable')):resolve({rows,count:rows.length}),query.q==='Cap'?250:15));
}

export function queryProducts(filters) {
 return wait(products.filter(product => (
  (!filters.q || product.name.toLowerCase().includes(filters.q.toLowerCase()))
  && (!filters.category || product.category === filters.category)
  && (!filters.status || product.status === filters.status)
  && (!filters.stock || (filters.stock === 'in') === availableProducts.has(product.id))
 )), filters);
}

export function queryOrders(f) {return wait(orders.filter(row=>(!f.q||row.name.toLowerCase().includes(f.q.toLowerCase()))&&(!f.status||row.status===f.status)&&row.date>=f.from&&row.date<=f.to),f);}
