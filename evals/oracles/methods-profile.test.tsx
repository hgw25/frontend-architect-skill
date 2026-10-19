// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import {act,cleanup,render,screen} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import {afterEach,expect,test,vi} from 'vitest'
import {ProfileForm} from './ProfileForm'
afterEach(()=>{cleanup();vi.unstubAllGlobals()})
const response=(name:string,version:number)=>new Response(JSON.stringify({id:'p1',displayName:name,version}))
async function setup(){
 const pending:Array<{resolve:(r:Response)=>void,reject:(e:Error)=>void}>=[]
 vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>((resolve,reject)=>pending.push({resolve,reject}))))
 render(<ProfileForm profile={{id:'p1',displayName:'Ada',version:1}}/>);const user=userEvent.setup(),input=screen.getByLabelText('Display name')
 for(const name of ['Grace','Lin']){await user.clear(input);await user.type(input,name);await user.click(screen.getByRole('button',{name:'Save'}))}
 return pending
}
test('failure before older success still converges on the latest confirmed fallback',async()=>{
 const p=await setup();await act(async()=>p[1].reject(new Error('unavailable')))
 expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Ada')
 await act(async()=>p[0].resolve(response('Grace',2)))
 expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Grace')
 expect(screen.getByLabelText('Display name')).toHaveValue('Lin');expect(screen.getByRole('alert')).toBeVisible()
})
test('older success cannot replace a pending newer projection',async()=>{
 const p=await setup();await act(async()=>p[0].resolve(response('Grace',2)))
 expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Lin')
 await act(async()=>p[1].reject(new Error('unavailable')))
 expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Grace')
})
test('older success cannot replace an already confirmed newer submission',async()=>{
 const p=await setup();await act(async()=>p[1].resolve(response('Lin',2)))
 await act(async()=>p[0].resolve(response('Grace',3)))
 expect(screen.getByLabelText('Current profile name')).toHaveTextContent('Lin');expect(screen.queryByRole('alert')).toBeNull()
})
