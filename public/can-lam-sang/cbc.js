import { INDICES, PROFILES } from '../../src/can-lam-sang/cbc/generator.mjs';
import { convertProfileValue, profileUnit, messageForCode } from '../../src/can-lam-sang/cbc/ui-helpers.mjs';

const LEVEL='co_ban';
const LEVEL_LABELS={co_ban:'Cơ bản',trung_binh:'Trung bình',nang_cao:'Nâng cao'};
const labels={Hb:'Hemoglobin (Hb)',RBC:'Hồng cầu (RBC)',Hct:'Hematocrit (Hct)',MCV:'MCV',MCH:'MCH',MCHC:'MCHC',WBC:'Bạch cầu (WBC)',PLT:'Tiểu cầu (PLT)',neut:'Neutrophil',lymph:'Lymphocyte',mono:'Monocyte',eos:'Eosinophil',baso:'Basophil'};
const profiles={vn_lab:'VN lab',conventional:'Conventional'};
const choices=['thap','binh_thuong','cao'];
const choiceLabels={thap:'Thấp',binh_thuong:'Bình thường',cao:'Cao'};

function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function valueFor(item,key,profile){
  if(profile==='vn_lab') return item;
  return {value:convertProfileValue(key,Number(item.value),'vn_lab','conventional'),unit:profileUnit(key,'conventional')||item.unit};
}

export async function mountCBC(root,{rpc,onHome}) {
  let profile='vn_lab', attemptId=null, scenario=null, answers={}, submitted=null;
  const storageKey='hiutmc-cbc-attempt-id';
  const getStoredAttempt=()=>{
    try{return sessionStorage.getItem(storageKey)}catch{return null}
  };
  const clearStoredAttempt=()=>{
    try{sessionStorage.removeItem(storageKey)}catch{}
  };
  const saveStoredAttempt=(id)=>{
    try{sessionStorage.setItem(storageKey,id)}catch{}
  };

  const render=()=>{
    if(!scenario){root.innerHTML='<div class="notice">Chưa có dữ liệu xét nghiệm máu để hiển thị.</div>';return}
    const rows=INDICES.map(key=>{
      const item=valueFor(scenario.values[key],key,profile);
      const selected=answers[key]||'';
      const controls=choices.map(c=>'<button type="button" class="choice" data-key="'+key+'" data-answer="'+c+'" aria-pressed="'+(selected===c)+'">'+choiceLabels[c]+'</button>').join('');
      return '<tr><td>'+labels[key]+'</td><td><strong>'+esc(item.value)+'</strong> '+esc(item.unit)+'</td><td><div class="answer">'+controls+'</div></td></tr>';
    }).join('');
    let result='';
    if(submitted){
      const score=Number(submitted.earned??0);
      result='<div class="result"><div>Điểm</div><strong>'+score+'/13</strong><div class="muted">'+score+' chỉ số đúng.</div><details><summary>Xem đáp án</summary><pre>'+esc(JSON.stringify(submitted.expected_classifications||{},null,2))+'</pre></details></div>'+
        '<button id="new-attempt" type="button" style="width:100%;margin-top:10px">Làm bài mới</button>';
    }
    root.innerHTML=(onHome?'<button type="button" id="cbc-home" class="cls-link">← Phòng Cận Lâm Sàng</button>':'')+'<div class="toolbar"><div><strong>Đơn vị hiển thị</strong></div><div><select id="profile">'+Object.entries(profiles).map(([k,v])=>'<option value="'+k+'" '+(k===profile?'selected':'')+'>'+v+'</option>').join('')+'</select></div></div>'+
      '<div class="muted">Mức: '+esc(LEVEL_LABELS[scenario.level]||LEVEL_LABELS[LEVEL])+' · Chỉ nộp một lần.</div>'+
      '<table><thead><tr><th>Chỉ số</th><th>Giá trị</th><th>Phân loại</th></tr></thead><tbody>'+rows+'</tbody></table>'+
      '<button id="submit" class="primary" style="width:100%;margin-top:10px" '+(submitted?'disabled':'')+'>Nộp bài</button>'+result;
    root.querySelector('#cbc-home')?.addEventListener('click',onHome);
    root.querySelector('#profile').onchange=e=>{profile=e.target.value;render()};
    root.querySelectorAll('[data-answer]').forEach(b=>b.onclick=()=>{if(submitted)return;answers[b.dataset.key]=b.dataset.answer;render()});
    root.querySelector('#submit').onclick=submit;
    root.querySelector('#new-attempt')?.addEventListener('click',async()=>{clearStoredAttempt();answers={};submitted=null;scenario=null;attemptId=null;await start()});
  };

  async function start(){
    const r=await rpc('cls_cbc_start_v1',{p_level:LEVEL});
    if(!r?.ok){root.innerHTML='<div class="notice error">'+esc(messageForCode(r?.code||'unknown'))+'</div>';return}
    attemptId=r.data.attempt_id; saveStoredAttempt(attemptId);
    scenario=r.data.public_scenario; scenario.level=r.data.level; render();
  }

  async function resumeOrStart(){
    let stored=getStoredAttempt();
    if(stored){
      const r=await rpc('cls_cbc_get_v1',{p_attempt_id:stored});
      if(r?.ok && r?.code!=='da_nop'){
        attemptId=r.data.attempt_id; scenario=r.data.public_scenario; scenario.level=r.data.level; render(); return;
      }
      if(r?.code==='da_nop'){
        submitted=r.data; attemptId=stored; clearStoredAttempt();
        const s=r.data?.public_scenario;
        if(s){scenario=s;scenario.level=r.data.level;render();return}
        // Submitted result intentionally contains no public scenario, so ask for a new attempt.
      }
      if(r?.code==='khong_tim_thay') clearStoredAttempt();
    }
    await start();
  }

  async function submit(){
    if(Object.keys(answers).length!==13){root.insertAdjacentHTML('afterbegin','<div class="notice error">Hãy chọn đủ 13 chỉ số trước khi nộp.</div>');return}
    const r=await rpc('cls_cbc_submit_v1',{p_attempt_id:attemptId,p_answers:{classifications:answers}});
    if(!r?.ok){root.insertAdjacentHTML('afterbegin','<div class="notice error">'+esc(messageForCode(r?.code||'unknown'))+'</div>');return}
    submitted=r.data;clearStoredAttempt();render();
  }

  try{await resumeOrStart()}catch(e){root.innerHTML='<div class="notice error">'+esc(messageForCode(e.code||'unknown'))+'</div>'}
}
