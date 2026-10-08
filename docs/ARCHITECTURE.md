# Kiến trúc — Viện Thực Hành

## Mục tiêu

Học viên thực hành cận lâm sàng: đọc kết quả xét nghiệm, nghe tiếng tim/phổi trên mô hình 3D, xem X-quang. Ưu tiên hiện tại là xét nghiệm, vì nội dung này đã có thể dùng ngay.

## Ba khu độc lập

Mỗi khu là một thư mục riêng, không import chéo, để nâng cấp khu này không ảnh hưởng khu kia.

| Khu | Thư mục | Trạng thái |
|---|---|---|
| Học lâm sàng | `clinical/` | Chưa bắt đầu |
| Học cận lâm sàng | `paraclinical/` (hiện là gốc repo) | Đang làm |
| Trực bệnh viện | `duty/` | Chưa bắt đầu |

## Dữ liệu ca

Mỗi ca là một đối tượng trong `js/cases.js`:

- `id`, `title`, `patient` (tuổi, giới, mô tả ngắn — không có thông tin nhận dạng)
- `source`: luôn là `"ai-simulated"`
- `tests`: danh sách chỉ số, mỗi chỉ số có `name`, `value`, `unit`, `ref` (khoảng tham chiếu theo giới)

Khoảng tham chiếu CBC dùng để học tập (cần chuyên môn kiểm định):

| Chỉ số | Đơn vị gốc | Nam | Nữ |
|---|---|---|---|
| Hemoglobin | g/L | 135–175 | 120–155 |
| Hồng cầu (RBC) | ×10¹²/L | 4,5–5,9 | 4,0–5,2 |
| Bạch cầu (WBC) | ×10⁹/L | 4,0–10,0 | 4,0–10,0 |
| Tiểu cầu (PLT) | ×10⁹/L | 150–400 | 150–400 |

Hemoglobin hiển thị song song g/L và g/dL (g/dL = g/L ÷ 10).

## Lộ trình

1. **Xong:** CBC mô phỏng, pattern bình thường, hai đơn vị.
2. **Tiếp theo:** Chuyên môn kiểm định toàn bộ ca hiện có (156 ca do ChatGPT soạn, đang được rà soát).
3. **Sau:** Bổ sung số liệu bệnh lý vào CBC.
4. **Sau nữa:** Mô hình 3D nghe tim/phổi với vị trí đặt ống nghe; X-quang.

## Quyết định đã chốt

- 2026-10-06: đưa ca lên trước, gắn nhãn "Ca do A.I mô phỏng", kiểm duyệt một lần cuối tuần.
- 2026-10-08: đưa Phòng Cận Lâm Sàng vào sử dụng ngay cho nhóm admin và mod.
- Viện Thực Hành là một phần HIU TMC, không thuộc Game Hub.
