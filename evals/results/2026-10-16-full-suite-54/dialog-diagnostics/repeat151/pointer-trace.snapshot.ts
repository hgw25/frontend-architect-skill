import {writeFileSync} from 'node:fs'
declare global { interface Window { diagnosticTrace: object[] } }
for (const cancelDefault of [false,true]) {
  test('outside pointer trace '+cancelDefault,async({page})=>{
    await page.goto('/')
    const trigger=page.getByRole('button',{name:'Edit profile'})
    await trigger.click()
    const dialog=page.getByRole('dialog',{name:'Edit profile'})
    await expect(dialog).toBeVisible()
    await expect(dialog.getByLabel('Name')).toBeFocused()
    await page.evaluate((cancel)=>{
      const content=document.querySelector('[role="dialog"]')!
      const label=(element:Element|null)=>element?.tagName+' '+element?.textContent?.trim().slice(0,40)
      window.diagnosticTrace=[]
      const original=HTMLElement.prototype.focus
      HTMLElement.prototype.focus=function(this:HTMLElement,options?:FocusOptions){
        window.diagnosticTrace.push({event:'focus-call',target:label(this)})
        original.call(this,options)
      }
      for(const type of ['pointerdown','mousedown','pointerup','mouseup','click','focusin','focusout']){
        document.addEventListener(type,event=>window.diagnosticTrace.push({event:type,
          target:label(event.target instanceof Element?event.target:null),active:label(document.activeElement)}),true)
      }
      if(cancel)document.addEventListener('pointerdown',event=>{
        if(!content.contains(event.target as Node))event.preventDefault()
      },false)
    },cancelDefault)
    await page.locator('.overlay').click({position:{x:4,y:4}})
    await expect(dialog).toBeHidden()
    await page.evaluate(()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve))))
    const observation=await page.evaluate(()=>({activeTag:document.activeElement?.tagName,
      activeText:document.activeElement?.textContent?.trim().slice(0,50),trace:window.diagnosticTrace}))
    writeFileSync('trace-'+cancelDefault+'.json',JSON.stringify(observation,null,2))
  })
}
