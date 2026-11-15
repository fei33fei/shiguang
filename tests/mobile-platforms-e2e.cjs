const {chromium}=require('playwright'),path=require('node:path'),assert=require('node:assert/strict');
const idle=p=>p.waitForFunction(()=>document.body.getAttribute('aria-busy')!=='true'&&!document.querySelector('#stage').dataset.transitioning);
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{for(const platform of ['ios','harmony']){
  const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({platform})=>{
   window.calls=[];window.mediaState={albums:[{id:'a',name:'旅行'}],assignments:{p:'a'},history:[]};
   const items=[{id:'p',name:'旅途.jpg',date:2,kind:'image',url:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'},{id:'v',name:'旅途.mp4',date:1,kind:'video',url:'media://local/v',thumb:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}];
   const scan=()=>({items,platform,capabilities:{nativeVideo:true,systemTrash:false,folderMode:platform==='harmony'?'virtual':'album'}});
   window.Native={call(id,method,json){const args=JSON.parse(json);window.calls.push(method);let result;
    if(method==='load')result=window.mediaState;
    else if(method==='save'){window.mediaState=args.state;result=true;}
    else if(method==='scan'||method==='import'||method==='openPhotoSettings')result=scan();
    else if(method==='mediaAccess')result={scope:'partial',visible:2,ready:true,fullAccess:false};
    else if(method==='playVideo')result=true;
    else if(method==='dissolveAlbum'){window.mediaState.assignments.p='pending';window.mediaState.albums=[];result={...scan(),state:window.mediaState,done:['p'],failures:[],removed:true};}
    else throw Error('Unexpected native call: '+method);
    setTimeout(()=>window.nativeResult(id,result,null),0);
   }};
  },{platform});
  await page.goto('file:///'+path.resolve('web/index.html').replaceAll('\\','/'));await idle(page);
  assert.equal(await page.locator('#import').textContent(),'相册权限');assert.equal(await page.locator('#systemTrash').isVisible(),false);
  await page.locator('#import').click();await idle(page);
  assert.equal(await page.locator('#grantPhotoBatch').isVisible(),false);assert.equal(await page.locator('#requestManagerAccess').isVisible(),false);
  assert.equal((await page.locator('#photoAccessDialog .fine').textContent()).includes('批量'),false);
  await page.locator('#selectMorePhotos').click();await idle(page);await page.locator('#closePhotoAccess').click();
  await page.locator('.card[data-id=v]').click();await idle(page);assert.equal(await page.locator('.native-video-preview').count(),1);
  assert.equal((await page.evaluate(()=>window.calls)).includes('playVideo'),true);await page.locator('#closeViewer').click();
  await page.locator('#manageAlbums').click();await page.locator('#manageList .danger').click();
  assert.equal((await page.locator('#deleteAlbumText').textContent()).includes('DCIM'),false);
  await page.locator('#confirmDeleteAlbum').click();await idle(page);await page.locator('#closeManage').click();
  assert.equal(await page.locator('.card[data-id=p]').count(),1);assert.deepEqual(errors,[]);
  await page.close();console.log(`PASS: ${platform} shared UI bridge contract, permission controls, native video and dissolve (mock only).`);
 }}finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
