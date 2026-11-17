const {chromium}=require('playwright'),path=require('node:path'),assert=require('node:assert/strict'),fs=require('node:fs');
const idle=p=>p.waitForFunction(()=>document.body.getAttribute('aria-busy')!=='true');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const page=await browser.newPage({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  if(!localStorage.getItem('xiaomi-sort-test'))localStorage.setItem('xiaomi-sort-test',JSON.stringify({albums:Array.from({length:20},(_,i)=>({id:'a'+i,name:'分类'+i})),assignments:{other:'a5'},history:[{id:'other',before:'pending',after:'a5',moved:false}]}));
  window.Native={call(id,method,json){const args=JSON.parse(json);let result,error=null;try{
   if(method==='load')result=JSON.parse(localStorage.getItem('xiaomi-sort-test'));
   else if(method==='save'){if(window.failSave){window.failSave=false;throw Error('模拟保存失败');}localStorage.setItem('xiaomi-sort-test',JSON.stringify(args.state));result=true;}
   else if(method==='createFolder')result={physical:true};
   else if(method==='scan')result={platform:'android',items:[{id:'p',name:'测试照片.gif',date:1,kind:'gif',url:'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'}]};
   else if(method==='mediaAccess')result={supported:true,ready:true,visible:1,writable:1,scope:'all'};
   else throw Error('Unexpected native call: '+method);
  }catch(e){error=e.message;}setTimeout(()=>window.nativeResult(id,result,error),0);}};
 });
 await page.goto('file:///'+path.resolve(process.env.SHIGUANG_WEB_DIR||'variants/xiaomi/web','index.html').replaceAll('\\','/'));await idle(page);
 const stored=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('xiaomi-sort-test')));
 const nav=()=>page.locator('#nav button > span:not(.nav-icon)').allTextContents();
 const folderNames=()=>page.locator('#folders button > span:not(.nav-icon)').allTextContents();
 const row=id=>page.locator('#manageList [data-album-id="'+id+'"]');
 async function move(id,title){await row(id).getByRole('button',{name:'分类'+id.slice(1)+' · '+title,exact:true}).click();await idle(page);}
 const before=await stored();await page.locator('#manageAlbums').click();
 assert.equal(await row('a0').getByRole('button',{name:'分类0 · 上移',exact:true}).isDisabled(),true);
 assert.equal(await row('a19').getByRole('button',{name:'分类19 · 下移',exact:true}).isDisabled(),true);
 await move('a19','上移');await move('a19','上移');await move('a0','下移');
 let saved=await stored(),expected=saved.albums.map(a=>a.name);
 assert.deepEqual(saved.assignments,before.assignments);assert.deepEqual(saved.history,before.history);
 await page.locator('#closeManage').click();assert.deepEqual(await nav(),['待整理',...expected,'待删除']);
 await page.reload();await idle(page);assert.deepEqual(await nav(),['待整理',...expected,'待删除']);
 await page.locator('.card').first().click();assert.deepEqual(await folderNames(),[...expected,'新建文件夹']);
 await page.locator('#manageViewerAlbums').click();await move('a5','下移');saved=await stored();expected=saved.albums.map(a=>a.name);
 await page.locator('#closeManage').click();assert.deepEqual(await folderNames(),[...expected,'新建文件夹']);assert.deepEqual(await nav(),['待整理',...expected,'待删除']);
 await page.locator('#manageViewerAlbums').click();await page.evaluate(()=>window.failSave=true);await move('a5','下移');
 assert.deepEqual(await stored(),saved);await page.locator('#closeManage').click();assert.deepEqual(await folderNames(),[...expected,'新建文件夹']);
 await page.locator('#folders button').filter({hasText:'新建文件夹'}).click();await page.locator('#albumName').fill('后来新建');await page.locator('#albumForm button[type=submit]').click();await idle(page);
 assert.deepEqual(await folderNames(),[...expected,'后来新建','新建文件夹']);
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
 fs.mkdirSync('test-results',{recursive:true});await page.locator('#manageViewerAlbums').click();await page.screenshot({path:'test-results/xiaomi-folder-sort.png'});
 assert.deepEqual(errors,[]);console.log('PASS: Xiaomi 20-folder reorder, boundary buttons, home/viewer sync, reload persistence, unchanged assignments/history, failed-save rollback and new-folder append.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
