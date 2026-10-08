# Viện Thực Hành — HIU TMC

Khu thực hành của HIU TMC, gồm ba khu tách riêng để nâng cấp độc lập:

1. **Học lâm sàng** — mô phỏng khám và hỏi bệnh.
2. **Học cận lâm sàng** — Phòng Cận Lâm Sàng (repo này, giai đoạn đầu).
3. **Trực bệnh viện** — mô phỏng trực.

Viện Thực Hành thuộc HIU TMC (hiutmc.com), không thuộc Game Hub. Về sau có thể tách thành ứng dụng riêng.

## Trạng thái hiện tại

- Phòng Cận Lâm Sàng: khung chạy được, có ca xét nghiệm công thức máu (CBC) mô phỏng, hiển thị đơn vị g/L và g/dL.
- Chưa làm: mô hình 3D nghe tim/phổi, X-quang.

## Nguyên tắc

- Mọi ca là **ca mô phỏng do A.I soạn**, không dùng bệnh án thật. Mỗi ca hiển thị nhãn "Ca do A.I mô phỏng".
- Khoảng tham chiếu chỉ để học tập; chuyên môn kiểm định trước khi đưa cho học viên.
- Hiển thị cả hai đơn vị g/L và g/dL cho hemoglobin.
- Không dùng cho chẩn đoán bệnh.

## Chạy thử

Mở `index.html` bằng trình duyệt. Không cần cài đặt.

## Cấu trúc

```
index.html              Giao diện Phòng Cận Lâm Sàng
js/cases.js             Dữ liệu ca mô phỏng (nguồn duy nhất)
js/app.js               Logic hiển thị
docs/ARCHITECTURE.md    Kiến trúc và lộ trình
```
