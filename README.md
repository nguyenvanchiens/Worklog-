# TeamFlow - Quản lý công việc team (FE)

Website nội bộ giúp Leader theo dõi:
- Thành viên trong team đang làm gì
- Ai đang yêu cầu build (dev / staging / production)
- Lịch sử build đã thực hiện
- Tiến độ task, task quá hạn, khối lượng công việc theo người

> Hiện FE chạy với **mock data** lưu trong `localStorage`. Khi BE sẵn sàng, sẽ thay phần Context bằng API calls.

## Yêu cầu

- Node.js >= 18
- npm (hoặc pnpm / yarn)

## Cài đặt & chạy

```bash
cd FE
npm install
npm run dev
```

Mở trình duyệt: http://localhost:5173

## Build production

```bash
npm run build
npm run preview
```

## Cấu trúc thư mục

```
FE/
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── src/
    ├── main.jsx                # Entry
    ├── App.jsx                 # Routes
    ├── index.css               # Tailwind + global styles
    ├── context/
    │   └── AppContext.jsx      # Global state (members, tasks, builds, projects)
    ├── data/
    │   └── mockData.js         # Dữ liệu seed + enum/labels
    ├── utils/
    │   └── format.js           # Format ngày/giờ
    ├── components/
    │   ├── common/
    │   │   ├── Avatar.jsx
    │   │   ├── Badge.jsx
    │   │   └── Modal.jsx
    │   └── layout/
    │       ├── Layout.jsx
    │       ├── Sidebar.jsx
    │       └── Header.jsx
    └── pages/
        ├── Dashboard.jsx        # Tổng quan: build cần xử lý, workload, task quá hạn
        ├── Tasks.jsx            # Kanban 4 cột + CRUD task
        ├── BuildRequests.jsx    # Build đang chờ + thao tác (start / done / failed)
        ├── BuildHistory.jsx     # Lịch sử build đã hoàn thành
        ├── Members.jsx          # CRUD thành viên
        └── Projects.jsx         # CRUD dự án
```

## Tính năng chính

### 1. Dashboard (`/`)
- 4 thẻ thống kê nhanh: build chờ, đang build, task đang làm, task quá hạn
- Danh sách build cần xử lý (pending + building)
- Workload theo từng thành viên
- Bảng task quá hạn / sắp đến hạn
- Task đã hoàn thành hôm nay

### 2. Công việc (`/tasks`)
- Hiển thị dạng Kanban 4 cột: Chưa làm / Đang làm / Đang review / Hoàn thành
- Lọc theo thành viên, trạng thái, dự án
- Thêm / Sửa / Xoá task
- Highlight đỏ task quá hạn

### 3. Yêu cầu Build (`/builds`)
- Thành viên gửi yêu cầu build (chọn dự án, môi trường dev/staging/production, ghi chú)
- Leader thấy danh sách build chờ, có thể:
  - Bắt đầu build (chuyển sang trạng thái `building`)
  - Đánh dấu Thành công (kèm version) hoặc Thất bại
- Badge số lượng build chờ hiển thị ở chuông thông báo

### 4. Lịch sử Build (`/history`)
- 3 thẻ thống kê: tổng / thành công / thất bại
- Bảng đầy đủ thông tin: người yêu cầu, dự án, môi trường, version, thời gian
- Lọc theo môi trường và kết quả

### 5. Thành viên (`/members`)
- CRUD thành viên (tên, vai trò, email, màu avatar)
- Hiển thị số task đang làm của mỗi người

### 6. Dự án (`/projects`)
- CRUD dự án (tên + mã viết tắt)
- Hiển thị số task và số build của mỗi dự án

## Thao tác thường dùng

- **Chuyển sang user khác**: chọn ở dropdown tên user góc trên bên phải (mô phỏng đăng nhập). Chỉ user có `role = Leader` mới có nút "Bắt đầu build" / "Hoàn thành".
- **Reset dữ liệu demo**: bấm nút xoay góc trên bên phải (kế bên chuông).
- **Dữ liệu lưu trữ**: tự động lưu vào `localStorage` (key `tm_state_v1`).

## Lộ trình tích hợp BE (sau)

Khi BE sẵn sàng, thay logic trong `src/context/AppContext.jsx`:
- `loadState()` → gọi API GET các endpoint `/members`, `/tasks`, `/builds`, `/projects`
- Các action (`addTask`, `updateBuildRequest`, ...) → POST/PUT/DELETE tương ứng
- Thêm WebSocket / SSE để realtime cập nhật trạng thái build cho leader

## Stack

- React 18 + Vite
- React Router v6
- Tailwind CSS 3
- lucide-react icons
- LocalStorage để persist mock data
