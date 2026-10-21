# IT4409

## Frontend tuần 1

Nhập từ `khoatran18/codeflow-studio`, nhánh `week1/manh`, tree nguồn
`764e323b5fbe882d12fd856d78eed2c0bb2a7499`.

- `src/frontend`: registry Button/Text/Container, schema store, editor với palette,
  canvas kéo thả, properties panel và bản thử React Flow.
- `src/schema`: thư viện hợp đồng dùng chung mà frontend cần qua `@codeflow/schema`.
- Các bài kiểm thử registry, schema operations, editor và schema được giữ từ nguồn.

## Cài đặt và chạy

Cài Node.js đáp ứng yêu cầu của Vite 8 (Node 24 được dùng trong môi trường chuẩn bị)
và pnpm, sau đó chạy từ thư mục gốc repository:

```sh
pnpm install
pnpm --dir src/schema build
pnpm dev
```

Sau khi sửa mã nguồn schema, build lại schema hoặc chạy
`pnpm --dir src/schema dev` trong terminal riêng.

## Kiểm tra

```sh
pnpm build
pnpm test
pnpm lint
```

Ngày 21/10/2026: mã nguồn frontend và schema đã được đối chiếu với Git blob hash
của bản nguồn; kiểm tra whitespace của thay đổi không báo lỗi. Chưa xác nhận kết quả
build/test/lint vì lệnh cài phụ thuộc trong môi trường chuẩn bị bị lỗi quyền truy cập
`EPERM` khi pnpm đọc đường dẫn workspace. Cần chạy các lệnh trên sau khi cài đặt thành công.

Phần React Flow là bản thử độc lập; App hiện mở EditorPage. Bộ test editor từ nguồn
kiểm tra render và chọn node, chưa kiểm thử thao tác kéo thả thực tế.
