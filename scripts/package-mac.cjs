// Repack the official Darwin ZIP without extracting symlinks on Windows.
// This produces UNSIGNED bundles; signing and execution checks must happen on macOS.
const fs=require('node:fs'),fsp=fs.promises,path=require('node:path'),crypto=require('node:crypto');
const yauzl=require('yauzl'),yazl=require('yazl'),plist=require('plist');
const open=file=>new Promise((resolve,reject)=>yauzl.open(file,{lazyEntries:true},(e,z)=>e?reject(e):resolve(z)));
const stream=(zip,entry)=>new Promise((resolve,reject)=>zip.openReadStream(entry,(e,s)=>e?reject(e):resolve(s)));
const contents=async s=>{const chunks=[];for await(const part of s)chunks.push(part);return Buffer.concat(chunks);};
async function packageZip(root,asar,arch){
 console.log(`Preparing Darwin ${arch} archive…`);
 const filename=`electron-v45.2.2-darwin-${arch}.zip`,input=path.join(root,'.tools/mac-cache',filename);
 const checksum=fs.readFileSync(path.join(root,'.tools/mac-cache/SHASUMS256.txt'),'utf8').split(/\r?\n/).find(line=>line.endsWith('*'+filename))?.split(' ')[0];
 const actual=crypto.createHash('sha256').update(fs.readFileSync(input)).digest('hex');if(!checksum||actual!==checksum)throw Error(`Runtime checksum mismatch: ${filename}`);
 const output=path.join(root,`release/Shiguang-macOS-0.3.3-${arch}-unsigned.zip`),zip=await open(input),out=new yazl.ZipFile(),dest=fs.createWriteStream(output);
 const written=new Promise((resolve,reject)=>{dest.on('close',resolve);dest.on('error',reject);out.on('error',reject);});out.outputStream.pipe(dest);
 await new Promise((resolve,reject)=>{
  let count=0;zip.on('error',reject);zip.on('end',resolve);zip.on('entry',entry=>{(async()=>{
   if(process.env.SHIGUANG_ZIP_DEBUG)console.log(++count,entry.fileName);
   const original=entry.fileName;
   if(['LICENSE','LICENSES.chromium.html'].includes(original)){out.addBuffer(await contents(await stream(zip,entry)),original,{mode:0o100644});zip.readEntry();return;}
   if(original.includes('/_CodeSignature/')||original==='Electron.app/Contents/Resources/default_app.asar'||!original.startsWith('Electron.app/')){zip.readEntry();return;}
   const name=original.replace(/^Electron\.app\//,'Shiguang.app/').replace(/Electron Helper/g,'Shiguang Helper').replace(/Electron Login Helper/g,'Shiguang Login Helper').replace(/Contents\/MacOS\/Electron$/,'Contents/MacOS/Shiguang');
   const mode=(entry.externalFileAttributes>>>16)||(/\/$/.test(name)?0o40755:0o100644);
   if(/\/$/.test(name)){out.addEmptyDirectory(name,{mode});zip.readEntry();return;}
   const data=await stream(zip,entry);
   if(original.endsWith('/Info.plist')&&(original==='Electron.app/Contents/Info.plist'||/Electron (Helper|Login Helper).*\.app\/Contents\/Info\.plist$/.test(original))){
    const info=plist.parse((await contents(data)).toString('utf8'));
    info.CFBundleExecutable=path.posix.basename(original.slice(0,-'.app/Contents/Info.plist'.length)).replace(/^Electron/,'Shiguang');
    info.CFBundleName=info.CFBundleExecutable;
    info.CFBundleDisplayName=original==='Electron.app/Contents/Info.plist'?'拾光相册':info.CFBundleExecutable;
    info.CFBundleIdentifier=original==='Electron.app/Contents/Info.plist'?'local.shiguang.album':'local.shiguang.album.'+(original.includes('Login Helper')?'loginhelper':'helper'+(original.includes('EH.app')?'.EH':original.includes('NP.app')?'.NP':''));
    info.CFBundleShortVersionString='0.3.3';info.CFBundleVersion='8';
    if(original==='Electron.app/Contents/Info.plist'){info.LSApplicationCategoryType='public.app-category.photography';delete info.ElectronAsarIntegrity;}
    out.addBuffer(Buffer.from(plist.build(info)),name,{mode});
   }else out.addBuffer(await contents(data),name,{mode,mtime:entry.getLastModDate()});
   zip.readEntry();
  })().catch(reject);});zip.readEntry();
 });
 out.addFile(asar,'Shiguang.app/Contents/Resources/app.asar',{mode:0o100644});
 out.addFile(path.join(root,'platforms/mac-finalize.command'),'完成本机签名.command',{mode:0o100755});
 out.addFile(path.join(root,'platforms/mac-README.txt'),'使用前请阅读.txt',{mode:0o100644});
 out.end();await written;console.log(`UNSIGNED macOS ${arch}: ${output}`);
}
(async()=>{
 const root=path.resolve(__dirname,'..'),stage=path.join(root,'.tools/mac-stage');await fsp.mkdir(stage,{recursive:true});
 for(const name of ['web','desktop'])await fsp.cp(path.join(root,name),path.join(stage,name),{recursive:true});
 const pkg=JSON.parse(await fsp.readFile(path.join(root,'package.json'),'utf8'));
 await fsp.writeFile(path.join(stage,'package.json'),JSON.stringify({name:pkg.name,version:pkg.version,main:pkg.main,dependencies:pkg.dependencies}));
 await fsp.mkdir(path.join(stage,'node_modules'),{recursive:true});await fsp.cp(path.join(root,'node_modules/exifr'),path.join(stage,'node_modules/exifr'),{recursive:true});
 const {createPackage}=await import('@electron/asar'),asar=path.join(root,'.tools/mac-app.asar');await createPackage(stage,asar);
 for(const arch of ['x64','arm64'])await packageZip(root,asar,arch);
})().catch(e=>{console.error(e);process.exitCode=1;});
