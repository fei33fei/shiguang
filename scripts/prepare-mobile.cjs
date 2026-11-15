const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
for(const target of ['ios/Shiguang/Resources/web','harmony/entry/src/main/resources/rawfile/web']){
 const dest=path.join(root,target);fs.mkdirSync(dest,{recursive:true});
 for(const name of fs.readdirSync(path.join(root,'web')))fs.copyFileSync(path.join(root,'web',name),path.join(dest,name));
}
console.log('Copied shared 0.3.3 UI into iOS and Harmony resources.');
