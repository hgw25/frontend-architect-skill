import { cards } from './data.mjs';
import { saveOrder } from './api.mjs';
const app=document.querySelector('#app');let order=cards.map(c=>c.id),visible=true;
function draw(){
 app.innerHTML='<button id="toggle">'+(visible?'Hide board':'Show board')+'</button><p role="status"></p>';
 app.querySelector('#toggle').onclick=()=>{visible=!visible;draw();};
 if(!visible)return;
 const list=document.createElement('ol');list.setAttribute('aria-label','Board');app.append(list);
 for(const id of order){const card=cards.find(c=>c.id===id),li=document.createElement('li');li.dataset.cardId=id;
 li.innerHTML='<h2>'+card.title+'</h2><p>'+card.body+'</p><button>Move up</button><button>Move down</button><button>Move card '+id+'</button>';
 li.querySelectorAll('button')[0].onclick=()=>move(id,-1);li.querySelectorAll('button')[1].onclick=()=>move(id,1);list.append(li);
 // The existing layout adjustment reads after each write.
 li.style.minHeight=(60+(list.getBoundingClientRect().height%5))+'px';
 }
}
function move(id,delta){const i=order.indexOf(id),j=i+delta;if(j<0||j>=order.length)return;[order[i],order[j]]=[order[j],order[i]];draw();saveOrder(order).then(()=>app.querySelector('[role=status]').textContent='Saved').catch(()=>{});}
draw();
