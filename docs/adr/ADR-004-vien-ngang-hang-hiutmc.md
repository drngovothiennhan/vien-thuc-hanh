# ADR-004: Viện Thực Hành là app ngang hàng với GameHub trong HIU TMC

Trạng thái: **Chấp nhận** (chủ sở hữu xác nhận 2026-10-08).

## Quyết định
1. Viện Thực Hành và GameHub là hai app ngang hàng, cùng nằm dưới HIU TMC. Viện không là module con của GameHub.
2. Mã Viện nằm trong repo `vien-thuc-hanh`, không import mã từ `hiutmc-game-hub` khi chạy. Các file `src/auth`, `src/config.js`, `src/observability` là bản copy tại thời điểm tách, và từ nay thuộc repo Viện.
3. Dữ liệu và đăng nhập dùng chung ở tầng HIU TMC. HIU TMC đồng bộ dữ liệu cho mọi app liên quan. Viện không tạo Supabase project riêng.
4. Viện được deploy riêng (hosting riêng, không gắn với pipeline của GameHub).
5. Nội dung chưa được chuyên gia duyệt: gắn nhãn AI (chip AI ở từng ca) để người dùng trải nghiệm và góp ý. Admin và ban quản lý dùng góp ý để sửa nội dung.

## Hệ quả
- Việc đổi schema dùng chung phải báo cho các app liên quan trong HIU TMC.
- Ngày hết hạn và đối tượng của nội dung chưa duyệt vẫn cần quyết định của chủ sở hữu.
- Hạn ADR-002 (23:59:59 +07 ngày 12/10/2026) chưa được gia hạn trong tài liệu này.

## Việc còn lại
- Chọn cách deploy riêng cho Viện.
- Quyết định đối tượng và ngày hết hạn cho nội dung chưa duyệt.
- Xây kênh góp ý cho admin và ban quản lý.
