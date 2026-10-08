// Phân nhóm ca bệnh theo chuyên khoa để học dễ hơn.
// Chỉ dùng mã ca (case_id) và tên nhóm; không chứa đáp án hay giải thích.
// Gán nhóm ở frontend để không phải đổi SQL/RPC phía server.

export const SPECIALTIES = [
  { id: 'cap-cuu', label: 'Cấp cứu – Ngộ độc', icon: 'pulse' },
  { id: 'tim-mach', label: 'Tim mạch', icon: 'heart' },
  { id: 'ho-hap', label: 'Hô hấp – Dị ứng', icon: 'lung' },
  { id: 'tieu-hoa', label: 'Tiêu hóa – Gan mật', icon: 'stomach' },
  { id: 'than-tiet-nieu', label: 'Thận – Tiết niệu', icon: 'kidney' },
  { id: 'noi-tiet', label: 'Nội tiết – Chuyển hóa', icon: 'flask' },
  { id: 'than-kinh', label: 'Thần kinh', icon: 'brain' },
  { id: 'nhiem-huyet', label: 'Nhiễm – Huyết học', icon: 'drop' },
  { id: 'ngoai', label: 'Ngoại tiêu hóa – Bụng', icon: 'scalpel' },
  { id: 'chan-thuong', label: 'Chấn thương – Bỏng', icon: 'cross' },
  { id: 'san-nhi', label: 'Sản – Nhi', icon: 'baby' },
  { id: 'co-xuong-khop', label: 'Cơ xương khớp', icon: 'bone' }
];

const EXPLICIT = {
  'chan-tam-thong': 'tim-mach',
  'trung-phong': 'than-kinh',
  'trung-thu': 'cap-cuu',
  'hao-suyen': 'ho-hap',
  'vi-quan-thong': 'tieu-hoa',
  'tiet-ta': 'tieu-hoa',
  'huyen-vung': 'tim-mach',
  'yeu-thong': 'co-xuong-khop',
  'thong-phong': 'co-xuong-khop',
  'truong-ung': 'ngoai',
  'soc-phan-ve-thuoc': 'cap-cuu',
  'suy-tim-mat-bu-thuy-thung': 'tim-mach',
  'mat-ngu-tam-ty-luong-hu': 'than-kinh',
  'liet-day-vii-ngoai-bien': 'than-kinh',
  'stemi-thanh-duoi': 'tim-mach',
  'phan-ve-phu-thanh-quan': 'cap-cuu',
  'dot-quy-thieu-mau-cap': 'than-kinh',
  'ha-duong-huyet-nang': 'noi-tiet',
  'xhth-tren-xo-gan': 'tieu-hoa',
  'co-giat-do-sot-cao-tre-em': 'san-nhi',
  'thung-o-loet-da-day-ta-trang': 'ngoai',
  'ngo-doc-phospho-huu-co': 'cap-cuu',
  'nhiem-toan-ceton-dai-thao-duong': 'noi-tiet',
  'vo-lach-chan-thuong-bung-kin': 'chan-thuong',
  'thai-ngoai-tu-cung-vo': 'san-nhi',
  'kham-tyc-viem-mui-di-ung': 'ho-hap',
  'kham-nhi-bieng-an-ty-hu': 'san-nhi',
  'kham-ho-man-viem-phe-quan-dam-thap': 'ho-hap',
  'kham-dau-nua-dau-can-duong': 'than-kinh',
  'kham-thong-ta-ruot-kich-thich': 'tieu-hoa',
  'kham-thong-kinh-khi-tre-huyet-u': 'san-nhi',
  'kham-tieu-khat-dai-thao-duong-tip-2': 'noi-tiet',
  'kham-tao-bon-man-cao-tuoi-da-benh': 'tieu-hoa',
  'canh-vai-tay-thoai-hoa-csc': 'co-xuong-khop',
  'thoai-hoa-khop-goi-han-that': 'co-xuong-khop',
  'toa-cot-phong-thoat-vi-dia-dem': 'co-xuong-khop',
  'hoi-chung-ong-co-tay-huyet-hu': 'co-xuong-khop',
  'viem-quanh-khop-vai-dong-cung': 'co-xuong-khop',
  'dau-nua-dau-can-duong-thuong-cang': 'than-kinh',
  'di-chung-tai-bien-khi-hu-huyet-u': 'than-kinh',
  'yhct-kham-001': 'co-xuong-khop',
  'yhct-kham-002': 'ho-hap',
  'yhct-kham-003': 'tieu-hoa',
  'yhct-kham-004': 'ho-hap',
  'yhct-kham-005': 'tieu-hoa',
  'yhct-kham-006': 'than-kinh',
  'yhct-kham-007': 'than-tiet-nieu',
  'yhct-kham-008': 'nhiem-huyet',
  'yhct-kham-101': 'san-nhi',
  'yhct-kham-102': 'san-nhi',
  'yhct-kham-103': 'san-nhi',
  'yhct-kham-104': 'san-nhi',
  'yhct-kham-105': 'san-nhi',
  'yhct-kham-106': 'ho-hap',
  'yhct-kham-107': 'noi-tiet',
  'yhct-kham-108': 'co-xuong-khop'
};

// Quy tắc theo tiền tố mã ca; kiểm tra từ cụ thể đến chung.
const PREFIX_RULES = [
  ['noi-cap-cuu', 'cap-cuu'],
  ['noi-co-xuong-khop', 'co-xuong-khop'],
  ['ngoai-chan-thuong', 'chan-thuong'],
  ['noi-than-kinh', 'than-kinh'],
  ['noi-than', 'than-tiet-nieu'],
  ['noi-tim-mach', 'tim-mach'],
  ['noi-ho-hap', 'ho-hap'],
  ['noi-tieu-hoa', 'tieu-hoa'],
  ['noi-noi-tiet', 'noi-tiet'],
  ['noi-huyet-hoc', 'nhiem-huyet'],
  ['noi-nhiem', 'nhiem-huyet'],
  ['ngoai-', 'ngoai']
];

export function specialtyOf(caseId) {
  if (EXPLICIT[caseId]) return EXPLICIT[caseId];
  const rule = PREFIX_RULES.find(([prefix]) => caseId.startsWith(prefix));
  return rule ? rule[1] : null;
}

// Trả về danh sách các nhóm kèm ca của từng nhóm, giữ thứ tự khai báo ở SPECIALTIES.
export function groupCases(cases) {
  const byId = new Map(SPECIALTIES.map(s => [s.id, { ...s, cases: [] }]));
  const unassigned = [];
  for (const item of cases) {
    const id = specialtyOf(item.case_id);
    if (id && byId.has(id)) byId.get(id).cases.push(item);
    else unassigned.push(item);
  }
  return { groups: [...byId.values()], unassigned };
}

const PATHS = {
  heart: ['M12 20s-7-4.5-7-10a4 4 0 0 1 7-2.5A4 4 0 0 1 19 10c0 5.5-7 10-7 10z'],
  pulse: ['M3 12h4l2-5 4 10 2-5h6'],
  lung: ['M9 4v9c0 2-1 4-3 5-1 .5-2 0-2-1.5V8.5C4 6.5 5.5 4.5 9 4z', 'M15 4v9c0 2 1 4 3 5 1 .5 2 0 2-1.5V8.5C20 6.5 18.5 4.5 15 4z', 'M12 4v12'],
  stomach: ['M8 4v5c0 3 2 4 4 4s4-1 4-4V4', 'M8 9c-2 0-4 2-4 5 0 4 3 6 7 6h2c3 0 5-2 5-5'],
  kidney: ['M9 6c-3 0-5 2.5-5 6s2 6 5 6c1.5 0 2.5-1 3-2 .5 1 1.5 2 3 2 3 0 5-2.5 5-6s-2-6-5-6c-1.5 0-2.5 1-3 2-.5-1-1.5-2-3-2z'],
  flask: ['M9 3h6', 'M10 3v6l-5 9a2 2 0 0 0 2 3h10a2 2 0 0 0 2-3l-5-9V3'],
  brain: ['M9 4a3 3 0 0 0-3 3 3 3 0 0 0-2 5 3 3 0 0 0 2 5 3 3 0 0 0 4 3V4z', 'M15 4a3 3 0 0 1 3 3 3 3 0 0 1 2 5 3 3 0 0 1-2 5 3 3 0 0 1-4 3V4z'],
  drop: ['M12 3c3 4 6 7 6 11a6 6 0 0 1-12 0c0-4 3-7 6-11z'],
  scalpel: ['M14 4l6 6-9 9-4 1 1-4 9-9z', 'M7 17l-3 3'],
  baby: ['M12 4a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', 'M5 21c1-5 4-7 7-7s6 2 7 7'],
  bone: ['M8 7a2 2 0 1 0-3 3l8 8a2 2 0 1 0 3-3z'],
  cross: ['M9 3h6v6h6v6h-6v6H9v-6H3V9h6z']
};

export function iconSvg(name) {
  const paths = PATHS[name] || PATHS.drop;
  return '<svg class="cls-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
    paths.map(d => '<path d="' + d + '"/>').join('') + '</svg>';
}
