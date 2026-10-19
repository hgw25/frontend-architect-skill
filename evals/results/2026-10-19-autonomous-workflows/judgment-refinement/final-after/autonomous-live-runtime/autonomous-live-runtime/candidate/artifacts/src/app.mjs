const form=document.querySelector('form[action^="/api/buy"]');
const status=document.querySelector('[role="status"]');

form?.addEventListener('submit',async event=>{
 event.preventDefault();
 const button=form.querySelector('button[type="submit"], button:not([type])');
 if(button?.disabled) return;

 button?.setAttribute('disabled','');
 form.setAttribute('aria-busy','true');
 if(status) status.textContent='Processing purchase…';
 try{
  const response=await fetch(form.action,{method:'POST',body:new URLSearchParams(new FormData(form)),headers:{accept:'application/json'}});
  if(!response.ok) throw new Error('Purchase request failed');
  if(status) status.textContent='Purchase accepted';
 }catch{
  if(status) status.textContent='Purchase failed. Please try again.';
  button?.removeAttribute('disabled');
 }finally{
  form.removeAttribute('aria-busy');
 }
});
