const form=document.querySelector('form');
const status=document.querySelector('[role=status]');
const button=form?.querySelector('button[type="submit"], button:not([type])');

form?.addEventListener('submit',async event=>{
 event.preventDefault();
 if(!button||button.disabled)return;
 button.disabled=true;
 status.textContent='Processing purchase…';
 try{
  const response=await fetch(form.action,{method:'POST',body:new URLSearchParams(new FormData(form)),headers:{accept:'application/json'}});
  if(!response.ok)throw new Error('Purchase request failed');
  status.textContent='Purchase accepted';
 }catch{
  status.textContent='Purchase failed. Please try again.';
 }finally{
  button.disabled=false;
 }
});
