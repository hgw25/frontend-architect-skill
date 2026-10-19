import { node, field, input, select, button } from './ui.mjs';
import { queryProducts, queryOrders } from './query.mjs';
import { today } from './data.mjs';
const app=document.querySelector('#app');
const page=new URL(location.href).searchParams.get('page')==='orders'?'orders':'products';
const order=page==='orders', prefix=order?'o_':'p_';
const nav=node('nav');for(const [name,value]of[['Products','products'],['Orders','orders']]){const a=node('a',name);a.href='/?page='+value;nav.append(a);}
function named(label,control){control.setAttribute('aria-label',label);return field(label,control);}
const form=node('form');const q=input(),status=select(order?[['','All'],['new','New'],['paid','Paid']]:[['published','Published'],['draft','Draft'],['','All']]);
const category=select([['','All'],['wear','Wear'],['food','Food'],['home','Home']]);const from=input('date'),to=input('date');
const error=node('p');error.setAttribute('role','alert');error.id='filter-error';from.setAttribute('aria-describedby',error.id);to.setAttribute('aria-describedby',error.id);
const count=node('p');count.setAttribute('role','status');const list=node('ul');list.setAttribute('aria-label','Results');
form.append(named(order?'Order keyword':'Product keyword',q));
if(order)form.append(named('From date',from),named('To date',to));else form.append(named('Product category',category));
form.append(named(order?'Order status':'Product status',status));
const reset=button('Reset',()=>write(defaults()));
if(!order)form.append(button('Apply',null,'submit'));form.append(reset);
app.append(nav,node('h1',order?'Orders':'Products'),form,error,count,list);
let generation=0;
function defaults(){return order?{q:'',status:'',from:'2026-09-20',to:today}:{q:'',status:'published',category:''};}
function read(){const p=new URL(location.href).searchParams;const d=defaults();for(const key in d)if(p.has(prefix+key))d[key]=p.get(prefix+key);return d;}
function values(){return order?{q:q.value,status:status.value,from:from.value,to:to.value}:{q:q.value,status:status.value,category:category.value};}
function write(f){const u=new URL(location.href);for(const [key,value]of Object.entries(f))u.searchParams.set(prefix+key,value);const method=order?'replaceState':'pushState';if(u.href!==location.href)history[method](null,'',u);sync();}
async function sync(){const f=read();q.value=f.q;status.value=f.status;if(order){from.value=f.from;to.value=f.to;}else category.value=f.category;error.textContent='';count.textContent='Loading';const g=++generation;try{const result=await(order?queryOrders:queryProducts)(f);if(g!==generation)return;list.replaceChildren(...result.rows.map(row=>node('li',row.name)));count.textContent=result.count+' results';}catch(e){if(g===generation){error.textContent=e.message;count.textContent='Query failed';}}}
form.addEventListener('submit',e=>{e.preventDefault();write(values());});
if(order)form.addEventListener('input',()=>{const f=values();if(!f.from||!f.to||f.from>f.to){error.textContent='Invalid date range';return;}write(f);});
if(order)status.addEventListener('change',()=>write(values()));
addEventListener('popstate',sync);sync();
