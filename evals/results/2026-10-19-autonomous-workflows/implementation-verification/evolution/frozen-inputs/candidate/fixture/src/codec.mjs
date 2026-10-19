// Supplied adapter. Trace is diagnostic evidence from this local encoder service.
const events=[];
export function encodingTrace(){return events.slice();}
export async function encodeSelection(ids){
 events.push({kind:'started',ids:ids.slice()});
 await new Promise(resolve=>setTimeout(resolve,15));
 if(ids.includes('encoding-error')){const error=new Error('Encoding unavailable');events.push({kind:'failed',error});throw error;}
 const payload={schema:1,document_ids:ids.slice()};events.push({kind:'encoded',payload});return payload;
}
