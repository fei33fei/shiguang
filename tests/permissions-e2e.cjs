const {chromium}=require('playwright'),path=require('node:path'),assert=require('node:assert/strict');
const idle=p=>p.waitForFunction(()=>document.body.getAttribute('aria-busy')!=='true');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 try{
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.addInitScript(()=>{
   window.testState={assignments:{p:'trash'},albums:[],history:[{id:'p',before:'pending',after:'trash',moved:false}]};
   window.testFull=false;window.testWritable=0;window.testVisible=1;window.testManager=false;
   window.testTrash=[{id:'r',name:'系统回收的测试照片.jpg'}];window.testMethods=[];
   const status=()=>({supported:true,ready:window.testVisible>0&&window.testWritable===window.testVisible,scope:window.testFull?'all':'partial',fullAccess:window.testFull,visible:window.testVisible,writable:window.testWritable,manager:window.testManager});
   const scan=()=>({platform:'android',items:[{id:'p',name:'待删除测试照片.jpg',kind:'image',date:1,url:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}]});
   window.Native={call(id,method,json){
    const args=JSON.parse(json);window.testMethods.push(method);let result;
    switch(method){
     case 'load':result=window.testState;break;
     case 'save':window.testState=args.state;result=true;break;
     case 'scan':result=scan();break;
     case 'mediaAccess':result=status();break;
     case 'grantVisibleMedia':window.testWritable=window.testVisible;result=status();break;
     case 'requestMediaAccess':window.testManager=true;result=status();break;
     case 'import':window.testVisible++;result=scan();break;
     case 'openPhotoSettings':window.testFull=true;window.testVisible=8;result=scan();break;
     case 'systemTrash':result={items:window.testTrash};break;
     case 'untrash':window.testTrash=[];result={restored:true};break;
     case 'trash':result={done:[],warning:'未能验证，原记录保留'};break;
     case 'openGallery':result=true;break;
     default:throw Error(method);
    }
    setTimeout(()=>window.nativeResult(id,result,null),0);
   }};
  });
  await page.goto('file:///'+path.resolve(__dirname,'../web/index.html').replaceAll('\\','/'));
  await idle(page);await page.locator('#grantMedia').waitFor({state:'visible'});
  await page.locator('#grantMedia').click();await idle(page);
  assert.equal(await page.evaluate(()=>window.testFull),false);
  assert.equal(await page.locator('#mediaAccess').isVisible(),false);
  await page.locator('#import').click();await page.locator('#photoAccessDialog').waitFor({state:'visible'});
  assert.match(await page.locator('#photoAccessStatus').textContent(),/部分/);
  assert.equal(await page.locator('#grantPhotoBatch').isDisabled(),true);
  await page.locator('#selectMorePhotos').click();await idle(page);
  assert.equal(await page.evaluate(()=>window.testVisible),2);
  assert.equal(await page.evaluate(()=>window.testWritable),1);
  assert.match(await page.locator('#grantPhotoBatch').textContent(),/1 项/);
  await page.locator('#grantPhotoBatch').click();await idle(page);
  assert.equal(await page.evaluate(()=>window.testWritable),2);
  assert.equal(await page.evaluate(()=>window.testFull),false);
  await page.locator('#requestManagerAccess').click();await idle(page);
  assert.equal(await page.evaluate(()=>window.testManager),true);
  await page.locator('#allPhotoSettings').click();await idle(page);
  assert.match(await page.locator('#photoAccessStatus').textContent(),/全部/);
  await page.screenshot({path:path.resolve('test-results/permissions-021.png')});
  await page.locator('#closePhotoAccess').click();
  await page.evaluate(()=>window.testWritable=0);await page.locator('#import').click();
  await page.locator('#photoAccessDialog').waitFor({state:'visible'});await idle(page);
  assert.equal(await page.locator('#grantPhotoBatch').isEnabled(),true);
  await page.locator('#closePhotoAccess').click();
  await page.locator('#systemTrash').click();await page.locator('#systemTrashList button').click();await idle(page);
  assert.equal(await page.evaluate(()=>window.testState.assignments.r),'pending');
  await page.locator('#closeSystemTrash').click();
  await page.locator('#nav button').filter({hasText:'待删除'}).click();
  await page.locator('#trashAll').click();await page.locator('#confirmTrash').click();await idle(page);
  assert.equal(await page.locator('#undoCount').textContent(),'1/2');
  assert.equal(await page.evaluate(()=>window.testState.assignments.p),'trash');
  assert.ok(await page.evaluate(()=>window.testMethods.includes('grantVisibleMedia')));
  console.log('PASS: Android UI simulation: partial-access batch grant; newly selected photos; separate all-album settings; optional manager; expired grants; trash restore and failed-verification record retention. Native OEM behavior is not simulated.');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
