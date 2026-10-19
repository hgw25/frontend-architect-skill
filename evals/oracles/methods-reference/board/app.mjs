import {cards} from './data.mjs';
import {saveOrder} from './api.mjs';
const app=document.querySelector('#app');let order=cards.map(c=>c.id),shown=true,list;
const nodes=new Map(),motions=new Map();let saving=false,pending=null,failed=false;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
function el(tag,text){const n=document.createElement(tag);if(text)n.textContent=text;return n;}
const toggle=el('button','Hide board'),status=el('p'),error=el('p'),retry=el('button','Retry save');status.setAttribute('role','status');error.setAttribute('role','alert');retry.hidden=true;
app.append(toggle,status,error,retry);toggle.onclick=()=>{shown=!shown;cancel();if(shown){mount();toggle.textContent='Hide board';}else{list.remove();list=null;nodes.clear();toggle.textContent='Show board';}};
retry.onclick=()=>{pending=order.slice();flush();};
function cancel(){for(const a of motions.values())a.cancel();motions.clear();}
addEventListener('resize',cancel);reduced.addEventListener('change',cancel);
function mount(){list=el('ol');list.setAttribute('aria-label','Board');app.append(list);for(const id of order){const c=cards.find(c=>c.id===id),li=el('li');li.dataset.cardId=id;li.append(el('h2',c.title),el('p',c.body));
 for(const [label,delta]of[['Move up',-1],['Move down',1]]){const b=el('button',label);b.onclick=()=>relocate(id,order.indexOf(id)+delta);li.append(b);}
 const handle=el('button','Move card '+id);handle.style.touchAction='none';handle.addEventListener('pointerdown',event=>{if(event.button!==0)return;event.preventDefault();const up=e=>{removeEventListener('pointerup',up);const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('[data-card-id]');if(shown&&target)relocate(id,order.indexOf(target.dataset.cardId));};addEventListener('pointerup',up,{once:true});});li.append(handle);nodes.set(id,li);list.append(li);
 }}
function relocate(id,index){const previous=order.indexOf(id);if(index<0||index>=order.length||previous===index)return;
 const first=new Map([...nodes].map(([key,n])=>[key,n.getBoundingClientRect()]));const focused=document.activeElement;cancel();
 order=order.filter(key=>key!==id);order.splice(index,0,id);for(const key of order)list.append(nodes.get(key));if(focused?.isConnected)focused.focus({preventScroll:true});
 const last=new Map([...nodes].map(([key,n])=>[key,n.getBoundingClientRect()]));
 if(!reduced.matches)for(const [key,n]of nodes){const f=first.get(key),l=last.get(key),x=f.x-l.x,y=f.y-l.y;if(!x&&!y)continue;const a=n.animate([{transform:`translate(${x}px,${y}px)`},{transform:'translate(0,0)'}],{duration:400,easing:'ease-out'});motions.set(key,a);a.finished.then(()=>{if(motions.get(key)===a)motions.delete(key);},()=>{});}
 pending=order.slice();failed=false;error.textContent='';retry.hidden=true;flush();
}
async function flush(){if(saving||!pending)return;saving=true;const sent=pending;pending=null;status.textContent='Saving';
 try{await saveOrder(sent);failed=false;}catch{failed=true;}finally{saving=false;}
 if(pending){flush();return;}status.textContent=failed?'Not saved':'Saved';error.textContent=failed?'Save failed':'';retry.hidden=!failed;
}
mount();
