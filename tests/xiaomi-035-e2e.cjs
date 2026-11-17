const {chromium}=require('playwright'),path=require('path'),assert=require('assert/strict');
const idle=p=>p.waitForFunction(()=>document.body.getAttribute('aria-busy')!=='true');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const pixel='data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';window.data=JSON.parse(localStorage.getItem('035')||'{"albums":[],"assignments":{},"history":[]}');window.testItems=[{id:'i_1',name:'a.jpg',date:3,kind:'image',source:'DCIM/Camera/',url:pixel},{id:'v_2',name:'b.mp4',date:2,kind:'video',source:'DCIM/Camera/',url:pixel,thumb:pixel},{id:'i_3',name:'local.jpg',date:1,kind:'image',source:'Pictures/拾光/本地目录/',url:pixel}];window.methods=[];window.Native={call(id,method,json){const a=JSON.parse(json);window.methods.push(method);let r;try{
  if(method==='load')r=window.data;else if(method==='save'){window.data=a.state;localStorage.setItem('035',JSON.stringify(a.state));r=true;}
  else if(method==='scan'||method==='openPhotoSettings')r={platform:'android',items:window.testItems,folders:['Pictures/拾光/空目录/']};
  else if(method==='mediaAccess')r={ready:true,fullAccess:true,scope:'all',visible:3,writable:3,supported:true};
  else if(method==='move'){window.testItems.find(x=>x.id===a.id).source=(a.id.startsWith('v_')?'Movies/':'Pictures/')+'拾光/'+a.folder+'/';r={moved:true,previous:{path:'DCIM/Camera/',name:a.id}};}
  else if(method==='createFolder')r={physical:true};else if(method==='playVideo'||method==='requestMediaAccess')r=true;
  else if(method==='checkUpdate')r={available:true,current:'0.3.5',version:'0.3.6'};else if(method==='installUpdate')r=true;else throw Error(method);
  setTimeout(()=>window.nativeResult(id,r,null),0);
 }catch(e){setTimeout(()=>window.nativeResult(id,null,e.message),0);}}};});
 await page.goto('file:///'+path.resolve(process.env.SHIGUANG_WEB_DIR||'variants/xiaomi/web','index.html').replaceAll('\\','/'));await idle(page);
 assert.equal(await page.locator('#nav button').filter({hasText:'本地目录'}).count(),1);assert.equal(await page.locator('#nav button').filter({hasText:'空目录'}).count(),1);
 await page.locator('#newAlbum').click();await page.locator('#albumName').fill('风景/人物+精选');await page.locator('#albumForm button[type=submit]').click();await idle(page);
 const album=await page.evaluate(()=>window.data.albums.find(a=>a.name==='风景/人物+精选'));assert.ok(!album.storageName.includes('/'));assert.ok(album.storageName.includes('+'));
 await page.locator('#batchToggle').click();await page.locator('.card').first().click();await page.locator('#batchFolder').click();await page.locator('#batchFolderList button').filter({hasText:'风景/人物+精选'}).click();await idle(page);
 assert.equal(await page.evaluate(()=>window.data.assignments.i_1),album.id);
 await page.locator('#batchToggle').click();await page.evaluate(()=>window.testItems.push({id:'i_4',name:'tail.jpg',date:0,kind:'image',source:'DCIM/Camera/',url:window.testItems[0].url}));await page.locator('#refresh').click();await idle(page);await page.locator('.card').first().click();assert.equal(await page.locator('.native-video-preview').count(),1);
 const box=await page.locator('#stage').boundingBox();await page.mouse.move(box.x+220,box.y+80);await page.mouse.down();await page.mouse.move(box.x+60,box.y+80,{steps:6});await page.mouse.up();await idle(page);await page.waitForFunction(()=>document.querySelector('#mediaName').textContent==='tail.jpg');
 await page.locator('#closeViewer').click();await page.locator('#manageAlbums').click();
 const row=page.locator('#manageList .manage-row').first();const buttons=await row.locator('button').evaluateAll(b=>b.map(x=>({label:x.textContent,y:Math.round(x.getBoundingClientRect().top),h:Math.round(x.getBoundingClientRect().height)})));assert.deepEqual(buttons.map(b=>b.label),['重命名','删除','上移','下移']);assert.equal(new Set(buttons.map(b=>b.y)).size,1);assert.equal(new Set(buttons.map(b=>b.h)).size,1);await page.locator('#closeManage').click();
 await page.locator('#settings').click();await page.locator('#checkUpdate').click();await idle(page);assert.ok((await page.locator('#updateStatus').textContent()).includes('0.3.6'));await page.locator('#installUpdate').click();await idle(page);assert.ok((await page.evaluate(()=>window.methods)).includes('installUpdate'));assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);assert.deepEqual(errors,[]);
 console.log('PASS: local/empty folder discovery; slash/plus display and safe storage; batch physical-move bridge; video surface gesture; same-row controls; explicit GitHub update flow (native behavior mocked).');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
