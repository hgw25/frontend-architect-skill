import { products, orders } from './data.mjs';
function wait(rows, query) {
 return new Promise((resolve,reject)=>setTimeout(()=>query.q==='error'?reject(Error('Query unavailable')):resolve({rows,count:rows.length}),query.q==='Cap'?250:15));
}
export function queryProducts(f) {return wait(products.filter(row=>(!f.q||row.name.toLowerCase().includes(f.q.toLowerCase()))&&(!f.category||row.category===f.category)&&(!f.status||row.status===f.status)),f);}
export function queryOrders(f) {return wait(orders.filter(row=>(!f.q||row.name.toLowerCase().includes(f.q.toLowerCase()))&&(!f.status||row.status===f.status)&&row.date>=f.from&&row.date<=f.to),f);}
