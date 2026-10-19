export const cards = Array.from({length:80},(_,i)=>({id:String(i+1),title:'Card '+(i+1),body:'Card content '.repeat(1+i%7)}));
