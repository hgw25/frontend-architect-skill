const sessions={a:{userId:'user-a',tenantId:'tenant-1',role:'buyer'},b:{userId:'user-b',tenantId:'tenant-1',role:'buyer'},v:{userId:'viewer',tenantId:'tenant-1',role:'viewer'}};
const counts=new Map(),purchases=new Map();let clock=100000;
export function readSession(req){const cookie=String(req.headers.cookie||'').split(';').map(s=>s.trim()).find(s=>s.startsWith('session='));return sessions[cookie?.slice(8)]||null;}
export function canBuy(session){return session?.role==='buyer';}
export function now(){return clock;}
export function advance(ms){clock+=ms;}
export function reset(){counts.clear();purchases.clear();clock=100000;}
export function quoteCalls(userId){return counts.get(userId)||0;}
export async function getQuote(sku,session){counts.set(session.userId,quoteCalls(session.userId)+1);return{sku,name:'Steel mug',price:(session.userId==='user-b'?27:12.5)+(purchases.get(session.userId)||0),currency:'USD',description:'Quality <strong>Steel</strong><img src=x onerror="window.__pwned=1"><script>window.__pwned=2</script>',validUntil:now()+1000,serviceToken:'qa-service-private-token',internalCost:4.25};}
export async function purchase(sku,session){purchases.set(session.userId,(purchases.get(session.userId)||0)+1);return{id:'purchase-'+session.userId,sku};}
export function escapeHtml(value){return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
export function descriptionHtml(value){return escapeHtml(value).replace(/&lt;(\/?)(p|strong|em)&gt;/g,'<$1$2>');}
