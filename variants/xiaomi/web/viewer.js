let viewerTransition=false,viewerDrag=null,suppressVideoClickUntil=0;
const stage=$('#stage');
const visibleSequence=()=>AlbumModel.select(items,state,view,filter,sort,[]).filter(x=>!sourceFilter||x.source===sourceFilter);
function previousCandidate(){if(!current)return null;const sequence=visibleSequence(),index=sequence.findIndex(x=>x.id===current.id);return index>0?sequence[index-1]:null;}
function updatePreviousButton(){$('#previous').disabled=!previousCandidate();}
function makeViewerMedia(x){
 const layer=document.createElement('div');layer.className='viewer-media';
 if(x.kind==='video'&&platform==='android'){
  const button=document.createElement('button');button.className='native-video-preview';const poster=document.createElement('img');poster.src=x.thumb||x.url;poster.alt='视频封面';poster.onerror=()=>poster.remove();const label=document.createElement('span');label.textContent='▶ 点击在拾光内播放视频';button.append(poster,label);button.onclick=()=>{if(performance.now()>suppressVideoClickUntil)work(()=>api('playVideo',{id:x.id}));};layer.append(button);
 }else{
  const media=document.createElement(x.kind==='video'?'video':'img');media.draggable=false;media.src=x.url;if(x.kind==='video'){media.controls=true;media.autoplay=true;media.playsInline=true;}media.onerror=()=>toast('当前预览器无法解码，请点“原画查看”尝试系统播放器');layer.append(media);
 }
 return layer;
}
const motionDuration=()=>matchMedia('(prefers-reduced-motion: reduce)').matches?0:260;
async function animateLayer(layer,frames,duration=motionDuration()){if(!layer||!duration)return;try{await layer.animate(frames,{duration,easing:'cubic-bezier(.22,.75,.25,1)',fill:'both'}).finished;}catch{/* Closing the dialog cancels its animations. */}}
async function slideTo(x,direction='next'){
 if(!$('#viewer').open){openViewer(x,{autoplay:false});return;}
 const oldId=current?.id,old=stage.firstElementChild,fromTransform=old?.style.transform||'translate3d(0,0,0)',fromOpacity=old?.style.opacity||'1';
 viewerTransition=true;stage.dataset.transitioning='true';
 try{
  document.querySelectorAll('#stage video').forEach(v=>v.pause());
  const prepared=makeViewerMedia(x),image=prepared.querySelector('img');if(image&&!image.complete){stage.dataset.preparing='true';await Promise.race([image.decode().catch(()=>{}),new Promise(resolve=>setTimeout(resolve,400))]);delete stage.dataset.preparing;}
  if(!$('#viewer').open||current?.id!==oldId)return;
  openViewer(x,{autoplay:false,layer:prepared});const incoming=stage.firstElementChild;if(old)stage.prepend(old);
  if(old){old.setAttribute('aria-hidden','true');old.style.pointerEvents='none';}incoming.style.pointerEvents='none';
  const width=stage.clientWidth+28,height=stage.clientHeight+28;
  const exit=direction==='previous'?`translate3d(${width}px,0,0) rotate(3deg)`:direction==='up'?`translate3d(0,-${height}px,0)`: `translate3d(-${width}px,0,0) rotate(-3deg)`;
  const entry=direction==='previous'?`translate3d(-${width}px,0,0)`:direction==='up'?`translate3d(0,${height}px,0)`:`translate3d(${width}px,0,0)`;
  await Promise.all([animateLayer(old,[{transform:fromTransform,opacity:fromOpacity},{transform:exit,opacity:.35}]),animateLayer(incoming,[{transform:entry,opacity:.65},{transform:'translate3d(0,0,0)',opacity:1}])]);
  old?.remove();incoming.getAnimations().forEach(a=>a.cancel());incoming.style.transform='';incoming.style.opacity='';incoming.style.pointerEvents='';
 }finally{delete stage.dataset.transitioning;delete stage.dataset.preparing;viewerTransition=false;updatePreviousButton();}
}
async function snapViewerBack(){const layer=stage.firstElementChild;if(!layer)return;viewerTransition=true;try{await animateLayer(layer,[{transform:layer.style.transform||'none',opacity:layer.style.opacity||'1'},{transform:'translate3d(0,0,0)',opacity:1}],motionDuration()?190:0);layer.getAnimations().forEach(a=>a.cancel());layer.style.transform='';layer.style.opacity='';}finally{viewerTransition=false;}}
async function navigatePrevious(){await work(async()=>{
 const target=previousCandidate();if(!target){await snapViewerBack();toast('已经是当前列表第一张');return;}
 await slideTo(target,'previous');
});}
async function navigateNext(){await work(async()=>{
 if(!current)return;await next(current.id);
});}
$('#previous').onclick=navigatePrevious;$('#skip').onclick=navigateNext;
function clearViewerGesture(){viewerDrag=null;delete stage.dataset.dragging;delete stage.dataset.actionHint;}
stage.style.touchAction='none';
stage.addEventListener('pointerdown',event=>{
 if(busy||viewerTransition||event.button!==0||event.target.tagName==='VIDEO')return;
 if(viewerDrag){clearViewerGesture();snapViewerBack();return;}if(!event.isPrimary)return;
 stage.setPointerCapture(event.pointerId);viewerDrag={id:event.pointerId,x:event.clientX,y:event.clientY,time:performance.now(),axis:null,hasPrevious:!$('#previous').disabled};
});
stage.addEventListener('pointermove',event=>{
 if(!viewerDrag||viewerDrag.id!==event.pointerId)return;const dx=event.clientX-viewerDrag.x,dy=event.clientY-viewerDrag.y;
 if(!viewerDrag.axis&&Math.hypot(dx,dy)>9)viewerDrag.axis=Math.abs(dx)>Math.abs(dy)?'x':'y';if(!viewerDrag.axis)return;
 const layer=stage.firstElementChild;if(!layer)return;stage.dataset.dragging='true';
 if(viewerDrag.axis==='x'){const drag=dx>0&&!viewerDrag.hasPrevious?dx*.25:dx;layer.style.transform=`translate3d(${drag}px,0,0) rotate(${Math.max(-4,Math.min(4,drag/65))}deg)`;layer.style.opacity=String(Math.max(.65,1-Math.abs(drag)/(stage.clientWidth*3)));stage.dataset.actionHint=dx<0?'左滑 · 下一张':'右滑 · 上一张';}
 else{const drag=dy<0&&view!=='trash'?dy:dy*.22;layer.style.transform=`translate3d(0,${drag}px,0)`;stage.dataset.actionHint=dy<0&&view!=='trash'?'↑ 待删除':'';}
});
stage.addEventListener('pointerup',event=>{
 if(!viewerDrag||viewerDrag.id!==event.pointerId)return;const drag=viewerDrag,dx=event.clientX-drag.x,dy=event.clientY-drag.y,elapsed=Math.max(1,performance.now()-drag.time);clearViewerGesture();
 if(busy||viewerTransition){snapViewerBack();return;}
 const distance=drag.axis==='x'?Math.abs(dx):Math.abs(dy),threshold=drag.axis==='x'?Math.min(100,Math.max(56,stage.clientWidth*.22)):Math.min(100,Math.max(56,stage.clientHeight*.22));
 const committed=distance>=threshold||(distance>36&&distance/elapsed>.65);
 if(committed)suppressVideoClickUntil=performance.now()+600;
 if(committed&&drag.axis==='x'){if(dx<0)navigateNext();else navigatePrevious();}
 else if(committed&&drag.axis==='y'&&dy<0&&view!=='trash')assign('trash');else snapViewerBack();
});
for(const name of ['pointercancel','lostpointercapture'])stage.addEventListener(name,event=>{if(viewerDrag?.id===event.pointerId){clearViewerGesture();snapViewerBack();}});
document.addEventListener('keydown',event=>{if(!$('#viewer').open||document.querySelector('dialog[open]:not(#viewer)')||event.target.matches('input,textarea,select'))return;if(event.key==='ArrowUp'&&view!=='trash'){event.preventDefault();assign('trash');}else if(event.key==='ArrowLeft'){event.preventDefault();navigatePrevious();}else if(event.key==='ArrowRight'){event.preventDefault();navigateNext();}else if(event.ctrlKey&&event.key.toLowerCase()==='z'){event.preventDefault();undo();}});
