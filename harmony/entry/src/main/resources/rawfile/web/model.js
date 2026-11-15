(function(root){
 const cleanName = value => {const name=String(value||'').trim();if(!name||name.length>40||/[\\/:*?"<>|\x00-\x1f]/.test(name)||name==='.'||name==='..'||/[. ]$/.test(name)||/^(con|prn|aux|nul|com[0-9]|lpt[0-9])(\.|$)/i.test(name))throw Error('请使用 1–40 字的有效文件夹名称');return name;};
 const pushHistory=(history,entry)=>[...history,entry].slice(-2);
 const select=(items,state,view,filter,sort)=>items.filter(x=>(view==='source'||(state.assignments[x.id]||'pending')===view)&&(filter==='all'||(filter==='image'?x.kind==='image':x.kind===filter))).sort((a,b)=>(sort==='asc'?a.date-b.date:b.date-a.date)||a.id.localeCompare(b.id));
 const renameAlbum=(state,id,value)=>{const name=cleanName(value),album=state.albums.find(a=>a.id===id);if(!album)throw Error('文件夹不存在');if(['待整理','待删除'].includes(name)||state.albums.some(a=>a.id!==id&&a.name.toLowerCase()===name.toLowerCase()))throw Error('这个文件夹名称已经存在');return {...state,albums:state.albums.map(a=>a.id===id?{...a,storageName:a.storageName||a.name,name}:a)};};
 const deleteAlbum=(state,id)=>{if(!state.albums.some(a=>a.id===id))throw Error('文件夹不存在');const assignments={...state.assignments};for(const [key,value]of Object.entries(assignments))if(value===id)assignments[key]='pending';return {...state,assignments,albums:state.albums.filter(a=>a.id!==id),history:state.history.filter(h=>h.before!==id&&h.after!==id)};};
 const api={cleanName,pushHistory,select,renameAlbum,deleteAlbum};if(typeof module!=='undefined')module.exports=api;else root.AlbumModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
