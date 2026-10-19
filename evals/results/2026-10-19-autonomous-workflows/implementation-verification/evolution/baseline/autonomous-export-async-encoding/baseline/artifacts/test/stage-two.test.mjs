import {test} from 'node:test';
import assert from 'node:assert/strict';
import {encodingTrace} from '../src/codec.mjs';
import {handleToolbarExport} from '../src/toolbar.mjs';
import {handleKeyboardExport} from '../src/keyboard.mjs';
for(const [name,run]of Object.entries({toolbar:handleToolbarExport,keyboard:handleKeyboardExport})){
 test(name+': supplied encoding completes before transport with the captured intent',async()=>{
  const before=encodingTrace().length,rows=[{id:'a',status:'ready'}];let payload;
  const result=run(rows,async body=>{assert.equal(encodingTrace().at(-1)?.kind,'encoded');payload=body;});
  assert.equal(encodingTrace()[before]?.kind,'started');rows[0].id='changed';rows[0].status='pending';
  assert.deepEqual(await result,{kind:'sent',ids:['a']});assert.deepEqual(payload,{schema:1,document_ids:['a']});
  assert.equal(encodingTrace().length,before+2);
 });
 test(name+': encoder failure keeps the original error and does not write',async()=>{
  await assert.rejects(run([{id:'encoding-error',status:'ready'}],()=>assert.fail('write after failed encoding')),
   error=>error===encodingTrace().at(-1)?.error);
 });
}
