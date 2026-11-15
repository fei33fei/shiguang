const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os');
const {dissolve}=require('../desktop/dissolve.cjs');
test('删除分类实际回原位，旧文件回待整理，同名不覆盖且失败记录保留',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'shiguang-dissolve-'));
 try{const dir=path.join(root,'拾光分类','旅行'),origin=path.join(root,'Screenshots','first.png');await fs.mkdir(dir,{recursive:true});await fs.mkdir(path.dirname(origin),{recursive:true});await fs.writeFile(origin,'existing-original');await fs.writeFile(path.join(dir,'first.png'),'photo-one');await fs.writeFile(path.join(dir,'legacy.gif'),'GIF89a');
 const db={roots:[root],records:{one:{path:path.join(dir,'first.png'),name:'first.png',originalLocation:origin},old:{path:path.join(dir,'legacy.gif'),name:'legacy.gif'},missing:{path:path.join(dir,'missing.mp4'),name:'missing.mp4'}},ui:{albums:[{id:'a',name:'旅行'}],assignments:{one:'a',old:'a',missing:'a'},history:[]}};
 const result=await dissolve({db,albumId:'a',save:async()=>{}});assert.equal(result.removed,false);assert.equal(result.failures.length,1);assert.deepEqual(result.done,['one','old']);assert.equal(await fs.readFile(origin,'utf8'),'existing-original');assert.equal(await fs.readFile(path.join(root,'Screenshots','first (1).png'),'utf8'),'photo-one');assert.equal(await fs.readFile(path.join(root,'待整理','legacy.gif'),'utf8'),'GIF89a');assert.equal(db.ui.assignments.missing,'a');assert.equal(db.ui.assignments.one,'pending');assert.equal(db.ui.albums.length,1);
 await fs.writeFile(db.records.missing.path,'video');const retry=await dissolve({db,albumId:'a',save:async()=>{}});assert.equal(retry.removed,true);assert.equal(db.ui.albums.length,0);await assert.rejects(fs.access(dir));
 }finally{await fs.rm(root,{recursive:true,force:true});}
});
