export async function saveOrder(ids) {
 const response=await fetch('/api/order',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ids})});
 if(!response.ok)throw new Error('Save failed');
 return response.json();
}
