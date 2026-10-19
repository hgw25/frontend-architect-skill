const form=document.querySelector('form');
form?.addEventListener('submit',async event=>{event.preventDefault();const response=await fetch(form.action,{method:'POST',body:new URLSearchParams(new FormData(form)),headers:{accept:'application/json'}});document.querySelector('[role=status]').textContent=response.ok?'Purchase accepted':'Purchase failed';});
