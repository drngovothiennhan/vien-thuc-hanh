export const CORE_CODES = new Set(['khong_xac_thuc','chua_mo','khong_tim_thay','answers_khong_hop_le','da_nop']);

const MESSAGES = {
  khong_xac_thuc:'Vui lòng đăng nhập HIU TMC để tiếp tục.',
  chua_mo:'Phòng Cận Lâm Sàng hiện chưa mở.',
  khong_tim_thay:'Không tìm thấy ca bệnh.',
  answers_khong_hop_le:'Câu trả lời chưa hợp lệ. Hãy chọn đủ các nhóm và kiểm tra lựa chọn.',
  da_nop:'Ca này đã được nộp. Đang hiển thị kết quả đã lưu.'
};

export function messageForCoreCode(code) {
  return MESSAGES[code] || 'Có lỗi khi xử lý. Vui lòng thử lại sau.';
}
export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function diagnosisGroups(choices) {
  return Object.entries(choices?.diagnosis || {}).filter(([,values]) => Array.isArray(values) && values.length > 0);
}
export function buildAnswers(choices, selected) {
  const diagnosis = {};
  for (const [group] of diagnosisGroups(choices)) {
    const values = [...(selected[group] || [])];
    if (!values.length) return null;
    diagnosis[group] = values;
  }
  return { ...diagnosis, actions: [...(selected.actions || [])] };
}
export function toggleSelected(selected, group, value, checked) {
  const next = structuredClone(selected);
  const values = new Set(next[group] || []);
  if (checked) values.add(value); else values.delete(value);
  next[group] = [...values];
  return next;
}
