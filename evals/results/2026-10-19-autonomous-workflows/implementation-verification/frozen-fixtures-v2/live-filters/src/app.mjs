import { node, field, input, button } from './ui.mjs';
import { products } from './data.mjs';
const app=document.querySelector('#app');
const nav=node('nav');
for(const [name,page] of [['Products','products'],['Orders','orders']]){const a=node('a',name);a.href='/?page='+page;nav.append(a);}
const heading=node('h1','Products');
const form=node('form');form.append(field('Product keyword',input()),button('Apply',e=>e.preventDefault()),button('Reset'));
const count=node('p',products.length+' results');count.setAttribute('role','status');
const list=node('ul');list.setAttribute('aria-label','Results');for(const row of products)list.append(node('li',row.name));
app.append(nav,heading,form,count,list);
