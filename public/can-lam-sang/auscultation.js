import { mountChest, HEART_SITES, LUNG_SITES } from './chest-viewer.js';

const TYPE_LABELS = {
  normal_heart: 'Tim bình thường (T1, T2 rõ)',
  early_systolic_murmur: 'Tiếng thổi tâm thu sớm',
  mid_systolic_murmur: 'Tiếng thổi tâm thu giữa',
  late_systolic_murmur: 'Tiếng thổi tâm thu muộn',
  late_diastolic_murmur: 'Tiếng thổi tâm trương muộn',
  s3: 'Tiếng tim thứ ba (T3)',
  s4: 'Tiếng tim thứ tư (T4)',
  atrial_fibrillation: 'Rung nhĩ (nhịp không đều)',
  av_block: 'Block nhĩ thất',
  tachycardia: 'Nhịp tim nhanh',
  normal_lung: 'Phổi bình thường',
  coarse_crackles: 'Ran nổ thô',
  fine_crackles: 'Ran nổ mịn',
  wheezing: 'Ran rít',
  rhonchi: 'Ran ngáy',
  pleural_rub: 'Tiếng cọ màng phổi'
};
const KIND_LABEL = { heart: 'Nghe tim', lung: 'Nghe phổi' };
const CODE_MESSAGES = {
  khong_xac_thuc: 'Hãy đăng nhập lại.',
  chua_mo: 'Phòng này chưa mở cho tài khoản của bạn.',
  chua_co_scenario: 'Chưa có bản ghi âm phù hợp.',
  qua_5_luot_mo: 'Bạn đang mở quá 5 lượt chưa nộp. Hãy nộp hoặc bỏ bớt.',
  qua_40_luot_ngay: 'Hôm nay bạn đã dùng hết 40 lượt.',
  answers_khong_hop_le: 'Hãy chọn loại âm và điểm nghe rõ nhất.',
  da_nop: 'Lượt này đã nộp.',
  khong_tim_thay: 'Không tìm thấy lượt chơi.'
};
const label = (kind, key) => TYPE_LABELS[key === 'normal' ? 'normal_' + kind : key] || key;
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const CSS = `
.aus-tabs{display:flex;gap:8px;margin:12px 0}.aus-tabs button{flex:1}.aus-tabs button[aria-pressed=true]{background:#145c4c;color:#fff;border-color:#145c4c;font-weight:700}
.chest-viewer{position:relative;width:100%;height:min(62vh,460px);min-height:320px;border-radius:16px;background:linear-gradient(#eef5f2,#dfeae6);overflow:hidden}
.chest-canvas{width:100%;height:100%;display:block;cursor:grab}.chest-overlay{position:absolute;inset:0;pointer-events:none}
.chest-site{position:absolute;pointer-events:auto;width:34px;height:34px;min-height:0;margin:-17px 0 0 -17px;padding:0;border-radius:50%;border:3px solid #fff;background:#1769e0;color:#fff;font-weight:800;box-shadow:0 2px 8px #0006;cursor:pointer}
.chest-site.is-visited{background:#2c8a5d}.chest-site.is-selected{background:#d97706;transform:scale(1.18)}.chest-site:focus-visible{outline:3px solid #102a24}
.aus-help{font-size:13px;color:#60736c;margin:8px 0}.aus-listen{margin:12px 0;padding:12px;border:1px solid #d7e0dc;border-radius:12px;background:#f7faf9}
.aus-listen audio{width:100%;margin-top:8px}.aus-form{margin-top:14px;display:grid;grid-template-columns:minmax(0,1fr);gap:10px}.aus-form fieldset{min-width:0;width:100%;margin-inline:0}.aus-form label.cls-choice{margin:0}
.aus-result{margin-top:14px;padding:16px;border-radius:14px;background:#edf7f1}.aus-result.bad{background:#fff4e5}.aus-result table{margin-top:8px}
.aus-credit{font-size:12px;color:#60736c;margin-top:12px;line-height:1.5}.aus-skin{margin-top:8px}`;

export async function mountAuscultation(root, { rpc, onHome }) {
  if (!document.getElementById('aus-style')) {
    const st = document.createElement('style'); st.id = 'aus-style'; st.textContent = CSS; document.head.append(st);
  }
  let kind = 'heart', attempt = null, viewer = null, selected = null, visited = new Set();
  let skinOn = true;

  const siteDefs = () => (kind === 'heart' ? HEART_SITES : LUNG_SITES);

  function shell(inner) {
    viewer?.destroy(); viewer = null;
    root.innerHTML = '<button type="button" class="cls-link" id="aus-home">← Phòng Cận Lâm Sàng</button>' +
      '<div class="cls-header"><h1>Nghe tim & phổi 3D</h1><p>Bấm vào từng điểm trên ngực để nghe, rồi chọn loại âm và điểm nghe rõ nhất.</p></div>' +
      '<div class="aus-tabs" role="group" aria-label="Chọn bài">' +
      ['heart', 'lung'].map((k) => '<button type="button" data-kind="' + k + '" aria-pressed="' + (k === kind) + '">' + KIND_LABEL[k] + '</button>').join('') + '</div>' + inner;
    root.querySelector('#aus-home').onclick = onHome;
    root.querySelectorAll('[data-kind]').forEach((b) => b.onclick = () => { if (b.dataset.kind !== kind) { kind = b.dataset.kind; start(); } });
  }
  function fail(code) {
    shell('<div class="cls-notice cls-error">' + esc(CODE_MESSAGES[code] || 'Có lỗi, hãy thử lại.') + '</div><button type="button" class="primary" id="aus-retry" style="margin-top:10px">Thử lại</button>');
    root.querySelector('#aus-retry').onclick = start;
  }

  async function start() {
    selected = null; visited = new Set(); attempt = null;
    shell('<div class="cls-notice">Đang chuẩn bị bệnh nhân…</div>');
    let r;
    try { r = await rpc('cls_aus_start_v1', { p_kind: kind }); } catch (e) { return fail(e.code); }
    if (!r?.ok) return fail(r?.code);
    attempt = r.data;
    await render();
  }

  async function render(result) {
    const sub = result || (attempt.status === 'submitted' ? attempt : null);
    const defs = Object.fromEntries(siteDefs().map((s, i) => [s.id, { ...s, short: String(i + 1) }]));
    const sites = [...attempt.sites].sort((a, b) => Number(defs[a.site].short) - Number(defs[b.site].short));
    const options = attempt.options.map((o, i) =>
      '<label class="cls-choice"><input type="radio" name="aus-type" value="' + esc(o) + '"' + (sub ? ' disabled' : '') + '> <span>' + esc(label(kind, o)) + '</span></label>').join('');
    const siteOpts = '<option value="">— Chọn điểm nghe rõ nhất —</option>' +
      sites.map((s) => '<option value="' + s.site + '"' + (sub ? ' disabled' : '') + '>' + (defs[s.site].short) + '. ' + esc(defs[s.site].label) + '</option>').join('') +
      '<option value="none">Không điểm nào bất thường</option>';
    shell(
      (attempt.review_label ? '<span class="cls-ai-chip" title="Nội dung do AI mô phỏng — chỉ có giá trị tham khảo thực hành" aria-label="Nội dung do AI mô phỏng — chỉ có giá trị tham khảo thực hành">AI</span>' : '') +
      '<div id="aus-viewer" aria-label="Mô hình 3D"></div>' +
      '<div class="toolbar"><div class="aus-help">Kéo để xoay · cuộn/chụm để phóng to · điểm xanh lá là điểm đã nghe.</div>' +
      '<button type="button" id="aus-skin" class="aus-skin">' + (skinOn ? 'Ẩn da' : 'Hiện da') + '</button></div>' +
      '<div class="aus-listen" id="aus-listen"><strong id="aus-site-name">Chưa chọn điểm nghe</strong><div class="aus-help" id="aus-site-hint">Bấm một điểm số trên ngực.</div></div>' +
      '<form class="aus-form" id="aus-form"><fieldset class="cls-fieldset"><legend>Bạn nghe được gì?</legend><div class="cls-choice-grid">' + options + '</div></fieldset>' +
      '<label for="aus-site"><strong>Điểm nghe rõ nhất bất thường</strong></label><select id="aus-site" ' + (sub ? 'disabled' : '') + '>' + siteOpts + '</select>' +
      '<div class="cls-error" id="aus-error" role="alert" hidden></div>' +
      '<button type="submit" class="cls-submit" ' + (sub ? 'disabled' : '') + '>Nộp bài</button></form>' +
      '<div id="aus-result"></div>' +
      '<p class="aus-credit">Âm thanh: bộ dữ liệu HLS-CMDS (Torabi, Shirani, Reilly, IEEE Data Descriptions, doi:10.1109/IEEEDATA.2025.3566012), CC BY 4.0 — ghi từ mô hình lâm sàng (manikin) bằng ống nghe điện tử, không phải bệnh nhân thật. Mô hình 3D: BodyParts3D, © The Database Center for Life Science licensed under CC Attribution 4.0 International. Mô hình chỉ có cây phế quản, không có mô phổi; vị trí các điểm chỉ mang tính minh hoạ học tập.</p>');

    viewer = await mountChest(root.querySelector('#aus-viewer'), {
      sites: sites.map((s) => defs[s.site]),
      onSite: (s) => selectSite(s.id)
    }).catch(() => { root.querySelector('#aus-viewer').innerHTML = '<div class="cls-notice cls-error">Trình duyệt không hiển thị được 3D (WebGL). Hãy dùng danh sách bên dưới.</div>'; return null; });
    if (viewer) { viewer.setSkin(skinOn); visited.forEach((id) => viewer.markVisited(id)); if (selected) viewer.select(selected); }
    root.querySelector('#aus-skin').onclick = () => { skinOn = !skinOn; viewer?.setSkin(skinOn); root.querySelector('#aus-skin').textContent = skinOn ? 'Ẩn da' : 'Hiện da'; };

    // keyboard / fallback list of the same points
    const listen = root.querySelector('#aus-listen');
    listen.insertAdjacentHTML('beforeend', '<div class="aus-help" style="margin-top:8px">Hoặc chọn nhanh: ' +
      sites.map((s) => '<button type="button" class="aus-quick" data-site="' + s.site + '" style="min-height:36px;margin:2px">' + defs[s.site].short + '</button>').join('') + '</div>');
    listen.querySelectorAll('.aus-quick').forEach((b) => b.onclick = () => selectSite(b.dataset.site));

    root.querySelector('#aus-form').onsubmit = submit;
    if (sub) showResult(sub, defs);
    function selectSite(id) {
      selected = id; visited.add(id);
      viewer?.select(id); viewer?.markVisited(id);
      const clip = sites.find((s) => s.site === id);
      const d = defs[id];
      root.querySelector('#aus-site-name').textContent = d.short + '. ' + d.label;
      root.querySelector('#aus-site-hint').textContent = 'Đeo tai nghe, nghe đủ một chu kỳ (khoảng 15 giây). Có thể nghe lại.';
      listen.querySelector('audio')?.remove();
      const a = document.createElement('audio');
      a.controls = true; a.preload = 'auto'; a.loop = true; a.src = '/can-lam-sang/audio/' + clip.clip_id + '.mp3';
      a.setAttribute('aria-label', 'Âm thanh tại ' + d.label);
      listen.insertBefore(a, listen.querySelector('.aus-help:last-child'));
      a.play().catch(() => {});
      listen.dataset.current = id;
    }
    async function submit(e) {
      e.preventDefault();
      const type = root.querySelector('input[name=aus-type]:checked')?.value;
      const site = root.querySelector('#aus-site').value;
      const err = root.querySelector('#aus-error');
      if (!type || !site) { err.hidden = false; err.textContent = CODE_MESSAGES.answers_khong_hop_le; return; }
      err.hidden = true;
      let r;
      try { r = await rpc('cls_aus_submit_v1', { p_attempt_id: attempt.attempt_id, p_answers: { type, site } }); }
      catch (ex) { err.hidden = false; err.textContent = CODE_MESSAGES[ex.code] || 'Có lỗi, hãy thử lại.'; return; }
      if (r?.ok || r?.code === 'da_nop') { attempt = r.data; render(attempt); }
      else { err.hidden = false; err.textContent = CODE_MESSAGES[r?.code] || 'Có lỗi, hãy thử lại.'; }
    }
    function showResult(res, defs) {
      const o = res.result, ans = res.answers;
      root.querySelector('input[name=aus-type][value="' + ans.type + '"]')?.setAttribute('checked', '');
      const radio = root.querySelector('input[name=aus-type][value="' + ans.type + '"]'); if (radio) radio.checked = true;
      root.querySelector('#aus-site').value = ans.site;
      const pct = Math.round(Number(res.score) * 100);
      root.querySelector('#aus-result').innerHTML = '<div class="aus-result ' + (pct === 100 ? '' : 'bad') + '"><h2>' + pct + '/100 điểm</h2>' +
        '<p>Loại âm: <strong>' + (o.type_correct ? 'Đúng' : 'Chưa đúng') + '</strong> — đáp án: ' + esc(label(kind, o.target_type)) + '.</p>' +
        '<p>Điểm nghe: <strong>' + (o.site_correct ? 'Đúng' : 'Chưa đúng') + '</strong>' +
        (o.correct_sites.length ? ' — nghe rõ nhất tại: ' + o.correct_sites.map((s) => esc(defs[s].label)).join('; ') : ' — bệnh nhân này không có điểm bất thường.') + '</p>' +
        '<table><thead><tr><th>Điểm</th><th>Âm thanh thật tại điểm đó</th></tr></thead><tbody>' +
        o.per_site.map((p) => '<tr><td>' + esc(defs[p.site].short + '. ' + defs[p.site].label) + '</td><td>' + esc(label(kind, p.sound_type)) + '</td></tr>').join('') + '</tbody></table>' +
        '<p class="aus-help">' + esc(o.note) + '</p><button type="button" class="primary" id="aus-next" style="width:100%">Bệnh nhân tiếp theo</button></div>';
      root.querySelector('#aus-next').onclick = start;
    }
  }

  await start();
}
