import { bootstrapSession, getValidAccessToken } from '../../src/auth/session.js';
import { SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY } from '../../src/config.js';
import { messageForCode } from '../../src/can-lam-sang/cbc/ui-helpers.mjs';
import { messageForCoreCode } from '../../src/can-lam-sang/core/ui-helpers.mjs';
import { iconSvg } from '../../src/can-lam-sang/core/specialties.mjs';

const root = document.querySelector('#app');

async function rpc(name, body={}) {
  const token=await getValidAccessToken();
  if(!token) throw Object.assign(new Error('khong_xac_thuc'),{code:'khong_xac_thuc'});
  const res=await fetch(SUPABASE_URL+'/rest/v1/rpc/'+name,{
    method:'POST',
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:'Bearer '+token,'Content-Type':'application/json',Accept:'application/json'},
    body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(12000)
  });
  const data=await res.json().catch(()=>null);
  if(!res.ok) throw Object.assign(new Error(data?.code||'unknown'),{code:data?.code||'unknown'});
  return data;
}
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function gate(text,error=false){root.innerHTML='<div class="cls-notice '+(error?'cls-error':'')+'">'+esc(text)+'</div>';}

// Navigation: each module is one history step. "Back" (in-app or browser) returns to the room
// home one step at a time instead of leaving the room or the page.
let depth=0;
history.replaceState({clsDepth:0},'');
function enter(open){depth+=1;history.pushState({clsDepth:depth},'');return open();}
function leave(){if(depth>0)history.back();else home();}
window.addEventListener('popstate',e=>{const d=e.state?.clsDepth??0;depth=d;if(d===0)home();});

function home() {
  root.innerHTML='<div class="cls-home"><div class="cls-header"><div class="cls-muted">HIU TMC · Phòng Cận Lâm Sàng</div><h1>Phòng Cận Lâm Sàng</h1><p>Chọn khu thực hành học tập.</p></div>'+
    '<div class="cls-entry-grid">'+
      '<button type="button" class="cls-entry cls-entry-blood" id="open-cbc">'+iconSvg('drop')+'<strong>Đọc xét nghiệm máu</strong><span>Xem 13 chỉ số công thức máu (CBC) và phân loại từng chỉ số.</span></button>'+
      '<button type="button" class="cls-entry cls-entry-heart" id="open-aus">'+iconSvg('heart')+'<strong>Nghe tim &amp; phổi 3D</strong><span>Nghe âm tim, âm phổi tại các điểm trên mô hình 3D lồng ngực và nhận diện tiếng bất thường.</span></button>'+
      '<button type="button" class="cls-entry cls-entry-case" id="open-core">'+iconSvg('pulse')+'<strong>Luyện ca bệnh</strong><span>156 ca mô phỏng xếp theo chuyên khoa, chọn đáp án và xem giải thích sau khi nộp.</span></button>'+
    '</div>'+
    '<details class="cls-info"><summary>Thông tin về nội dung AI</summary>'+
    '<p>Các ca mô phỏng, mô tả phim, âm thanh và đáp án trong Phòng Cận Lâm Sàng do AI soạn. Nội dung này chưa có xác nhận của chuyên gia và chưa có nguồn gốc đã kiểm chứng, nên chỉ có giá trị tham khảo thực hành, không dùng để chẩn đoán hay điều trị.</p>'+
    '<p>Ký hiệu <span class="cls-ai-chip">AI</span> ở góc thẻ ca bệnh cho biết ca đó do AI mô phỏng.</p></details></div>';
  root.querySelector('#open-cbc').onclick=()=>enter(async()=>{const {mountCBC}=await import('./cbc.js');await mountCBC(root,{rpc,onHome:leave});});
  root.querySelector('#open-aus').onclick=()=>enter(async()=>{const {mountAuscultation}=await import('./auscultation.js');await mountAuscultation(root,{rpc,onHome:leave});});
  root.querySelector('#open-core').onclick=()=>enter(async()=>{const {mountCore}=await import('./core.js');await mountCore(root,{rpc,onHome:leave});});
}

const session=await bootstrapSession();
if(!session.member||!session.session) {
  gate(session.error||messageForCoreCode('khong_xac_thuc'),true);
} else {
  try {
    const flag=await rpc('cls_flag_status_v1');
    if(!flag?.ok||!flag?.data?.enabled) gate(messageForCoreCode('chua_mo'));
    else home();
  } catch(error) {
    gate(messageForCoreCode(error.code||'unknown'),true);
  }
}
