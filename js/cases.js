// Ca mô phỏng do A.I soạn — KHÔNG phải bệnh án thật.
// Khoảng tham chiếu dùng cho học tập; cần chuyên môn kiểm định trước khi đưa cho học viên.
// Hemoglobin lưu theo g/L; g/dL được tính khi hiển thị.

window.VTH_CASES = [
  {
    id: "cbc-001",
    title: "Công thức máu — nam trưởng thành",
    patient: { age: 35, sex: "nam", note: "Khám sức khỏe định kỳ" },
    source: "ai-simulated",
    tests: [
      { name: "Hemoglobin", value: 150, unit: "g/L", ref: { nam: [135, 175], nu: [120, 155] } },
      { name: "Hồng cầu (RBC)", value: 4.9, unit: "×10¹²/L", ref: { nam: [4.5, 5.9], nu: [4.0, 5.2] } },
      { name: "Bạch cầu (WBC)", value: 6.8, unit: "×10⁹/L", ref: { nam: [4.0, 10.0], nu: [4.0, 10.0] } },
      { name: "Tiểu cầu (PLT)", value: 250, unit: "×10⁹/L", ref: { nam: [150, 400], nu: [150, 400] } }
    ]
  },
  {
    id: "cbc-002",
    title: "Công thức máu — nữ trưởng thành",
    patient: { age: 28, sex: "nu", note: "Khám sức khỏe trước khi vào học" },
    source: "ai-simulated",
    tests: [
      { name: "Hemoglobin", value: 132, unit: "g/L", ref: { nam: [135, 175], nu: [120, 155] } },
      { name: "Hồng cầu (RBC)", value: 4.4, unit: "×10¹²/L", ref: { nam: [4.5, 5.9], nu: [4.0, 5.2] } },
      { name: "Bạch cầu (WBC)", value: 5.9, unit: "×10⁹/L", ref: { nam: [4.0, 10.0], nu: [4.0, 10.0] } },
      { name: "Tiểu cầu (PLT)", value: 280, unit: "×10⁹/L", ref: { nam: [150, 400], nu: [150, 400] } }
    ]
  }
];
