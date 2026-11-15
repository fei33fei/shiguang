const {chromium}=require('playwright'),assert=require('node:assert/strict'),path=require('node:path');
const idle=p=>p.waitForFunction(()=>document.body.getAttribute('aria-busy')!=='true');
(async()=>{const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});try{
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{const image='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="120" height="160"><rect fill="#9eae98" width="120" height="160"/></svg>');window.testItems=Array.from({length:240},(_,i)=>({id:'p'+i,name:'photo'+i+'.png',kind:'image',date:1000-i,source:i%2?'Pictures/SomeApp/':'DCIM/Screenshots/',url:image}));window.testState={albums:[],assignments:{},history:[]};window.Native={call(id,method,json){const args=JSON.parse(json);let result;if(method==='load')result=window.testState;else if(method==='save'){window.testState=args.state;result=true;}else if(method==='scan')result={platform:'android',items:window.testItems};else if(method==='mediaAccess')result={supported:true,ready:true,visible:240,writable:240,scope:'all',fullAccess:true};else throw Error(method);setTimeout(()=>window.nativeResult(id,result,null),0);}};});
 await page.goto('file:///'+path.resolve('web/index.html').replaceAll('\\','/'));await idle(page);await page.locator('.card').first().waitFor();
 await page.locator('#localFolders').click();assert.equal(await page.locator('.local-folder-row').count(),2);const source=page.locator('.local-folder-row').filter({hasText:'Pictures/SomeApp/'});await source.getByText('查看',{exact:true}).click();assert.match(await page.locator('#sourceLabel').textContent(),/SomeApp/);assert.equal(await page.locator('.card').count(),120);await page.locator('#localFolders').click();await page.locator('.local-folder-row').filter({hasText:'Pictures/SomeApp/'}).getByText('现有照片已整理').click();await page.locator('#confirmImportFolder').click();await idle(page);assert.equal(await page.evaluate(()=>Object.values(window.testState.assignments).length),120);await page.locator('#closeLocalFolders').click();await page.locator('#clearSource').click();assert.equal(await page.locator('.card').count(),120);
 // A new item in the imported App folder must stay pending.
 await page.evaluate(()=>window.testItems.push({...window.testItems[1],id:'new',name:'new.png'}));await page.locator('#refresh').click();await idle(page);assert.equal(await page.locator('.card').count(),121);
 // Real browser touch input exercises multi-touch, click suppression, and preserving scroll position.
 await page.locator('#grid').scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,document.querySelector('#grid').getBoundingClientRect().top+scrollY-80));await page.waitForFunction(()=>[...document.querySelectorAll('#grid img')].some(i=>i.complete&&i.naturalWidth));
 const client=await context.newCDPSession(page);const touch=(x,y,id)=>({x,y,id});
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(60,220,0),touch(330,220,1)]});
 for(let i=0;i<7;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(60+17*i,220,0),touch(330-17*i,220,1)]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(page);
 const columns=await page.evaluate(()=>window.testState.gridColumns);assert.ok(columns>=7,'pinch should show many small photos, got '+columns);assert.equal(await page.locator('#viewer').isVisible(),false);
 await page.screenshot({path:path.resolve('test-results/overview-dense.png')});
 // Expand back to a larger local view, then choose an image for sorting.
 await page.waitForTimeout(550);await page.locator('#zoomIn').click();await idle(page);assert.equal(await page.evaluate(()=>window.testState.gridColumns),columns-1);
 await page.locator('#grid').scrollIntoViewIfNeeded();await page.evaluate(()=>window.scrollTo(0,document.querySelector('#grid').getBoundingClientRect().top+scrollY-80));
 await client.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[touch(165,220,0),touch(225,220,1)]});
 for(let i=0;i<7;i++)await client.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[touch(165-17*i,220,0),touch(225+17*i,220,1)]});
 await client.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await idle(page);assert.ok(await page.evaluate(()=>window.testState.gridColumns)<columns-1,'spreading fingers should enlarge thumbnails');
 await page.waitForTimeout(550);await page.locator('.card').first().click();assert.equal(await page.locator('#viewer').isVisible(),true);assert.deepEqual(errors,[]);
 console.log('PASS: local folder sources; explicit existing-photo classification; new App-folder photos stay pending; real multi-touch density zoom; no accidental viewer; larger preview opens normally.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
