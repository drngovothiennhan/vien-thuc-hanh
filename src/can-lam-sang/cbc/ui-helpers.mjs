import { PROFILES, convertValue } from './generator.mjs';

export const CBC_CODES = new Set([
  'khong_xac_thuc','chua_mo','level_khong_hop_le','qua_3_luot_mo',
  'qua_10_luot_ngay','chua_co_scenario','khong_tim_thay',
  'answers_khong_hop_le','da_nop'
]);

const MESSAGES={
  khong_xac_thuc:'Vui lòng đăng nhập HIU TMC để tiếp tục.',
  chua_mo:'Phòng đọc xét nghiệm máu hiện chưa mở.',
  level_khong_hop_le:'Mức độ bài học không hợp lệ.',
  qua_3_luot_mo:'Bạn đã đạt giới hạn 3 lượt đang mở.',
  qua_10_luot_ngay:'Bạn đã đạt giới hạn 10 lượt mới trong ngày.',
  chua_co_scenario:'Chưa có bài xét nghiệm máu được duyệt ở mức này.',
  khong_tim_thay:'Không tìm thấy lượt học này.',
  answers_khong_hop_le:'Câu trả lời chưa hợp lệ. Hãy chọn đủ 13 chỉ số.',
  da_nop:'Lượt này đã được nộp.'
};

export function messageForCode(code) {
  return MESSAGES[code] || 'Có lỗi khi xử lý. Vui lòng thử lại sau.';
}

export function convertProfileValue(key, value, fromProfile, toProfile) {
  if (!PROFILES[fromProfile] || !PROFILES[toProfile]) throw new Error('profile_invalid');
  const converted=convertValue(key, value, fromProfile, toProfile);
  const precision=PROFILES[toProfile][key]?.[1];
  if (!Number.isInteger(precision)) return converted;
  const multiplier=10 ** precision;
  return Math.round((converted + Number.EPSILON) * multiplier) / multiplier;
}

export function profileUnit(key, profile) {
  return PROFILES[profile]?.[key]?.[0] || '';
}

export function profilePrecision(key, profile) {
  return PROFILES[profile]?.[key]?.[1];
}
