// Prepare public release assets; private signing data and unpacked build directories are never selected.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),release=path.join(root,'release'),output=path.join(root,'.tools/github-release-assets');
fs.mkdirSync(output,{recursive:true});
const mappedNames=new Map([
 ['Shiguang-Android-0.3.3（小米civi4专属apk）.apk','Shiguang-Android-0.3.3-Xiaomi-Civi4.apk'],
 ['Shiguang-Android-0.3.3（小米civi4专属apk）.apk.idsig','Shiguang-Android-0.3.3-Xiaomi-Civi4.apk.idsig'],
 ['使用说明.md','USER-GUIDE.zh-CN.md'],['下载说明.md','DOWNLOADS.zh-CN.md']
]);
const assets=[];
function copy(source,name,label=name){
 if(!/^[A-Za-z0-9._-]+$/.test(name))throw Error('Release asset requires a portable filename: '+name);
 const file=path.join(output,name);fs.copyFileSync(source,file);
 if(name==='SHA256SUMS-0.3.3.txt')fs.writeFileSync(file,fs.readFileSync(file,'utf8').replaceAll('Shiguang-Android-0.3.3（小米civi4专属apk）.apk','Shiguang-Android-0.3.3-Xiaomi-Civi4.apk'));
 assets.push({name,label,file,bytes:fs.statSync(file).size,sha256:crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')});
}
for(const entry of fs.readdirSync(release,{withFileTypes:true})){
 if(!entry.isFile()||entry.name==='SHA256SUMS-github-v0.3.3.txt')continue;
 if(!/^(Shiguang-[A-Za-z0-9._（）\u4e00-\u9fff-]+|SHA256SUMS[^/]+\.txt|使用说明\.md|下载说明\.md)$/.test(entry.name))throw Error('Unexpected release asset: '+entry.name);
 copy(path.join(release,entry.name),mappedNames.get(entry.name)||entry.name,entry.name.includes('小米civi4')?'0.3.3（小米civi4专属apk）'+(entry.name.endsWith('.idsig')?' · idsig':''):entry.name);
}
copy(path.join(root,'platforms/适配说明.md'),'PLATFORMS.zh-CN.md','多平台适配说明');
copy(path.join(root,'platforms/验证记录.md'),'VALIDATION.zh-CN.md','验证记录');
const checksums=assets.map(asset=>`${asset.sha256}  ${asset.name}`).join('\n')+'\n';
fs.writeFileSync(path.join(release,'SHA256SUMS-github-v0.3.3.txt'),checksums);
copy(path.join(release,'SHA256SUMS-github-v0.3.3.txt'),'SHA256SUMS-github-v0.3.3.txt');
const original=assets.find(asset=>asset.name==='Shiguang-Android-0.3.3-Xiaomi-Civi4.apk');
if(original.sha256!=='79822626d18e17e16f98121342a9de1c1db3cc540f1951605c69da6dc284a65f')throw Error('Xiaomi baseline APK differs from preserved 0.3.3');
fs.writeFileSync(path.join(root,'.tools/github-release-assets.json'),JSON.stringify(assets,null,2));
console.log(`Prepared ${assets.length} release assets (${(assets.reduce((n,a)=>n+a.bytes,0)/1024/1024).toFixed(1)} MiB), including unchanged Xiaomi 0.3.3 APK.`);
