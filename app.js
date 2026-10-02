const clips=[];
const grid=document.querySelector('#clipGrid');
function drawClips(){
  if(!clips.length){grid.innerHTML='<div class="empty-state"><span>▣</span><h3>Aún no hay clips</h3><p>El primer recuerdo está esperando a que lo subáis.</p></div>';return}
  grid.innerHTML=clips.map((c,i)=>`<article class="clip-card"><div class="clip-art" style="--card-bg:${c.art}"><span class="play">▶</span><span class="duration">${c.duration}</span></div><div class="clip-info"><h3>${c.title}</h3><div class="clip-meta"><span>pendiente de revisión</span><span class="heart">♡ ${i}</span></div></div></article>`).join('')
}
drawClips();
document.querySelector('#bracket').innerHTML='<div class="empty-bracket"><span>♜</span><strong>Las llaves aparecerán cuando haya clips aprobados.</strong><small>Invita a tu comunidad y empieza a guardar los momentos del año.</small></div>';
const modal=document.querySelector('#uploadModal'),toast=document.querySelector('#toast');
function showToast(message){toast.textContent=message;toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2800)}
document.querySelector('#uploadBtn').onclick=()=>{modal.classList.add('show');modal.setAttribute('aria-hidden','false')};
document.querySelector('#closeModal').onclick=()=>modal.classList.remove('show');
modal.onclick=e=>{if(e.target===modal)modal.classList.remove('show')};
document.querySelector('#submitClip').onclick=async()=>{
  const title=document.querySelector('#clipTitle').value.trim(),file=document.querySelector('#fileInput').files[0];
  if(!title)return showToast('Añade un título para continuar.');
  if(!file)return showToast('Selecciona un vídeo para continuar.');
  const button=document.querySelector('#submitClip');button.disabled=true;button.textContent='Subiendo…';
  try{
    const response=await fetch('/api/clips',{method:'POST',headers:{'Content-Type':file.type||'application/octet-stream','X-File-Name':encodeURIComponent(file.name)},body:file});
    if(!response.ok)throw new Error();
    clips.unshift({title,duration:'nuevo',art:'linear-gradient(135deg,#9568ed,#316b4e)'});drawClips();
    document.querySelector('#clipCount').textContent=clips.length;document.querySelector('#statClips').textContent=clips.length;
    modal.classList.remove('show');document.querySelector('#clipTitle').value='';document.querySelector('#fileInput').value='';showToast('Clip enviado a revisión ✓');
  }catch{showToast('No se pudo subir. Ejecuta el servidor para guardar clips.');}
  finally{button.disabled=false;button.textContent='Enviar a revisión'}
};
document.querySelector('#addModerator').onclick=()=>showToast('Invitación de usuario preparada.');
