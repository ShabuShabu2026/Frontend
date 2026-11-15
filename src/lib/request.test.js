import test from 'node:test'
import assert from 'node:assert/strict'
import {requestJson,retryPause} from './request.js'
const response=(data,status=200)=>({ok:status<400,status,json:async()=>data})
test('temporary GET interruptions recover without showing a final error',async()=>{
 let calls=0
 const value=await requestJson(async()=>{if(++calls<3)throw new TypeError('Failed to fetch');return response({ok:true})},'https://test.invalid',{method:'GET'},[0,0])
 assert.equal(calls,3);assert.equal(value.ok,true)
})
test('a slow pending response is not converted to a connection error',async()=>{
 let resolve,completed=false
 const pending=new Promise(r=>{resolve=r})
 const request=requestJson(()=>pending,'https://test.invalid',{method:'POST'},[]).then(value=>{completed=true;return value})
 await new Promise(r=>setTimeout(r,15))
 assert.equal(completed,false)
 resolve(response({analysisId:'done'}))
 assert.equal((await request).analysisId,'done')
})
test('POST analysis is never retried after an uncertain network interruption',async()=>{
 let calls=0
 await assert.rejects(requestJson(async()=>{calls++;throw new TypeError('Offline')},'https://test.invalid',{method:'POST'},[0,0]),/server may still be processing/i)
 assert.equal(calls,1)
})
test('server timeout is explained accurately after bounded read retries',async()=>{
 let calls=0
 await assert.rejects(requestJson(async()=>{calls++;return response(null,504)},'https://test.invalid',{method:'GET'},[0,0]),/server response timed out/i)
 assert.equal(calls,3)
})
test('permanent API errors retain the server message without retrying',async()=>{
 let calls=0
 await assert.rejects(requestJson(async()=>{calls++;return response({error:{message:'Run a new analysis.'}},409)},'https://test.invalid',{method:'GET'},[0,0]),/Run a new analysis/)
 assert.equal(calls,1)
})
test('changing areas cancels a queued retry immediately',async()=>{
 let calls=0
 const controller=new AbortController()
 const pending=requestJson(async()=>{calls++;throw new TypeError('Offline')},'https://test.invalid',{method:'GET',signal:controller.signal},[10000])
 await new Promise(r=>setImmediate(r));controller.abort()
 await assert.rejects(pending,{name:'AbortError'})
 assert.equal(calls,1)
})
test('already canceled requests are not sent',async()=>{
 const controller=new AbortController();controller.abort()
 await assert.rejects(requestJson(()=>{throw new Error('Must not fetch')},'https://test.invalid',{method:'GET',signal:controller.signal}),{name:'AbortError'})
 await assert.rejects(retryPause(10000,controller.signal),{name:'AbortError'})
})
