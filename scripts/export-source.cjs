const fs=require('node:fs'),path=require('node:path'),yazl=require('yazl');
const root=path.resolve(__dirname,'..');
async function archive(name,paths){
 const zip=new yazl.ZipFile(),target=path.join(root,'release',name),output=fs.createWriteStream(target);
 const finished=new Promise((resolve,reject)=>{output.on('close',resolve);output.on('error',reject);zip.on('error',reject);});zip.outputStream.pipe(output);
 function add(relative){const full=path.join(root,relative),stat=fs.lstatSync(full);if(stat.isSymbolicLink())return;if(stat.isDirectory()){for(const child of fs.readdirSync(full)){if(['build','node_modules','oh_modules','.hvigor','.idea','xcuserdata','signing'].includes(child))continue;add(path.join(relative,child));}}else if(!/\.(p12|p7b|jks|keystore|mobileprovision)$/.test(full)&&path.basename(full)!=='local.properties'){zip.addFile(full,relative.replaceAll('\\','/'),{mode:/\.(sh|command)$/.test(full)?0o100755:0o100644});}}
 paths.forEach(add);zip.end();await finished;console.log(name);
}
(async()=>{
 await archive('Shiguang-iOS-0.3.3-source.zip',['ios','web','scripts/prepare-mobile.cjs','scripts/generate-ios-project.cjs','platforms/适配说明.md']);
 await archive('Shiguang-HarmonyNEXT-0.3.3-source.zip',['harmony','web','scripts/prepare-mobile.cjs','platforms/适配说明.md']);
 await archive('Shiguang-0.3.3-platform-sources.zip',['desktop','web','android/src','android/res','android/AndroidManifest.xml','android/build.ps1','ios','harmony','scripts','tests','.github','package.json','package-lock.json','README.md','使用说明.md','STATUS.md','docs','.gitignore','.gitattributes','platforms']);
})().catch(e=>{console.error(e);process.exitCode=1;});
