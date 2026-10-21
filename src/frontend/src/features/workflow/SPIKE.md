# Spike React Flow (tuần 1)

`FlowSpike.tsx` là ví dụ tối thiểu: 2 node (`Call API`, `Navigate`) nối bằng 1 edge, kéo node, nối thêm edge bằng cách kéo từ handle.

- Thư viện: `@xyflow/react` (v12). Bắt buộc import `@xyflow/react/dist/style.css` và đặt vùng bọc có chiều cao cố định, nếu không canvas cao 0.
- State: `useNodesState` / `useEdgesState` cho spike. Khi làm editor thật, giữ nodes/edges trong `core/schema-store` (map sang `workflows[].nodes/edges` của `@codeflow/schema`) và truyền vào `<ReactFlow>` qua props `nodes`, `edges`, `onNodesChange`, `onEdgesChange`.
- Node tùy biến (callApi, condition, navigate, showMessage): khai báo `nodeTypes={{ ... }}` bên ngoài component (hoặc `useMemo`) để tránh render lại toàn bộ.
- Condition cần hai handle ra (true/false): dùng `<Handle id="true" />`, `<Handle id="false" />` trong node tùy biến.
- Chưa nối vào `EditorPage`; để xem thử, render `<FlowSpike />` tạm thời trong `App.tsx`.
- Đã kiểm chứng: chỉ build/lint qua `pnpm --filter frontend build`; chưa chạy trên trình duyệt.
