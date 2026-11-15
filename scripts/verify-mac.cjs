const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict'),yauzl=require('yauzl'),plist=require('plist');
const root=path.resolve(__dirname,'..');
function resolveLink(name,entries,data){
 for(let hop=0;hop<40;hop++){let redirected=false;const parts=name.split('/');
  for(let i=1;i<=parts.length;i++){const prefix=parts.slice(0,i).join('/'),entry=entries.get(prefix);if(entry&&((entry.externalFileAttributes>>>16)&0o170000)===0o120000){name=path.posix.normalize(path.posix.join(path.posix.dirname(prefix),data.get(prefix).toString(),...parts.slice(i)));redirected=true;break;}}
  if(!redirected)return name;
 }throw Error('Cyclic framework symlink: '+name);
}
const readZip=file=>new Promise((resolve,reject)=>{yauzl.open(file,{lazyEntries:true},(error,z)=>{
 if(error)return reject(error);const entries=new Map(),data=new Map();z.on('error',reject);z.on('end',()=>resolve({entries,data}));z.on('entry',e=>{
  entries.set(e.fileName,e);
  if(e.fileName.endsWith('Info.plist')||e.fileName.endsWith('/app.asar')||((e.externalFileAttributes>>>16)&0o170000)===0o120000){z.openReadStream(e,async(error,stream)=>{if(error)return reject(error);try{const parts=[];for await(const p of stream)parts.push(p);data.set(e.fileName,Buffer.concat(parts));z.readEntry();}catch(e){reject(e);}});}else z.readEntry();
 });z.readEntry();
});});
(async()=>{for(const arch of ['x64','arm64']){
 const {entries,data}=await readZip(path.join(root,`release/Shiguang-macOS-0.3.3-${arch}-unsigned.zip`));
 const executable=entries.get('Shiguang.app/Contents/MacOS/Shiguang');assert.ok((executable.externalFileAttributes>>>16)&0o111);
 for(const [name,buffer]of data){
  if(name.endsWith('Info.plist')&&(name==='Shiguang.app/Contents/Info.plist'||name.includes('Shiguang Helper'))){const info=plist.parse(buffer.toString());const target=path.posix.dirname(name)+'/MacOS/'+info.CFBundleExecutable;assert.ok(entries.has(target),target);assert.ok(info.CFBundleIdentifier.startsWith('local.shiguang.album'));}
  const entry=entries.get(name);if(((entry.externalFileAttributes>>>16)&0o170000)===0o120000){const target=resolveLink(name,entries,data);assert.ok(entries.has(target)||entries.has(target+'/'),`${name} -> ${target}`);}
 }
 assert.ok(entries.has('LICENSE'));assert.ok(entries.has('LICENSES.chromium.html'));
 assert.ok(entries.has('完成本机签名.command'));
 assert.deepEqual(data.get('Shiguang.app/Contents/Resources/app.asar'),fs.readFileSync(path.join(root,'.tools/mac-app.asar')));
 console.log(`PASS: ${arch} ZIP structure, helper executable names, Unix executable modes, framework symlink targets and exact app.asar. No macOS execution test.`);
}})().catch(e=>{console.error(e);process.exitCode=1;});
