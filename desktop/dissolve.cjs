const fs=require('node:fs/promises'),path=require('node:path');
const {moveExclusive,uniquePath}=require('./files.cjs');
const inside=(file,dir)=>{const relative=path.relative(path.resolve(dir),path.resolve(file));return !relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative);};
async function dissolve({db,albumId,save}){
 const album=db.ui.albums.find(a=>a.id===albumId);if(!album)throw Error('文件夹不存在');
 const ids=Object.keys(db.ui.assignments).filter(id=>db.ui.assignments[id]===albumId),done=[],failures=[];
 const folderPaths=new Set(ids.map(id=>db.records[id]?.path).filter(Boolean).map(p=>path.dirname(p)));
 for(const id of ids){const record=db.records[id];try{
  if(!record)throw Error('未找到原文件记录');await fs.access(record.path);
  const root=db.roots.filter(p=>inside(record.path,p)).sort((a,b)=>b.length-a.length)[0];if(!root)throw Error('文件不在已选择的目录中');
  const historic=db.ui.history.find(h=>h.id===id&&h.before==='pending'&&typeof h.location==='string')?.location;
  const original=record.originalLocation||historic;
  const safeOriginal=original&&db.roots.some(p=>inside(original,p))&&!folderPaths.has(path.dirname(original));
  let destination;
  if(safeOriginal){try{destination=await uniquePath(path.dirname(original),path.basename(original));await moveExclusive(record.path,destination);}catch{destination=undefined;}}
  if(!destination){destination=await uniquePath(path.join(root,'待整理'),record.name);await moveExclusive(record.path,destination);}
  record.path=destination;record.name=path.basename(destination);db.ui.assignments[id]='pending';
  db.ui.history=db.ui.history.filter(h=>h.id!==id);await save();done.push(id);
 }catch(e){failures.push({id,error:e.message});}}
 if(!Object.values(db.ui.assignments).includes(albumId)){db.ui.albums=db.ui.albums.filter(a=>a.id!==albumId);db.ui.history=db.ui.history.filter(h=>h.before!==albumId&&h.after!==albumId);await save();}
 // Only remove empty directories belonging to this app; never recurse into a source folder.
 if(!db.ui.albums.some(a=>a.id===albumId))for(const directory of folderPaths){if(db.roots.some(r=>inside(directory,path.join(r,'拾光分类'))))await fs.rmdir(directory).catch(()=>{});}
 return{done,failures,removed:!db.ui.albums.some(a=>a.id===albumId),state:db.ui};
}
module.exports={dissolve,inside};
