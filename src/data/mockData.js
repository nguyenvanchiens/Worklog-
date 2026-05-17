// Mock data — sẽ thay bằng API khi BE sẵn sàng.

export const ROLES = ['Leader', 'Frontend', 'Backend', 'Fullstack', 'Mobile', 'QA', 'DevOps']

export const TASK_STATUS = {
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  REVIEW: 'review',
  WAITING_BUILD: 'waiting_build',
  DONE: 'done',
}

export const TASK_STATUS_LABEL = {
  todo: 'Chưa làm',
  in_progress: 'Đang làm',
  review: 'Đang review',
  waiting_build: 'Chờ build',
  done: 'Hoàn thành',
}

export const PRIORITY = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  URGENT: 'urgent',
}

export const PRIORITY_LABEL = {
  low: 'Thấp',
  medium: 'Trung bình',
  high: 'Cao',
  urgent: 'Khẩn cấp',
}

export const BUILD_ENV = {
  DEV: 'dev',
  PRODUCTION: 'production',
}

export const BUILD_ENV_LABEL = {
  dev: 'Dev',
  production: 'Production',
}

export const BUILD_STATUS = {
  PENDING: 'pending',
  BUILDING: 'building',
  SUCCESS: 'success',
  FAILED: 'failed',
}

export const BUILD_STATUS_LABEL = {
  pending: 'Chờ build',
  building: 'Đang build',
  success: 'Thành công',
  failed: 'Thất bại',
}

export const initialMembers = [
  {
    id: 'u1',
    name: 'Nguyễn Văn Chiến',
    role: 'Leader',
    email: 'chiennv1@hncjsc.vn',
    avatar: 'NC',
    color: '#3a5ff5',
  },
  {
    id: 'u2',
    name: 'Trần Minh Anh',
    role: 'Frontend',
    email: 'anhtm@hncjsc.vn',
    avatar: 'MA',
    color: '#10b981',
  },
  {
    id: 'u3',
    name: 'Lê Thị Hồng',
    role: 'Backend',
    email: 'honglt@hncjsc.vn',
    avatar: 'LH',
    color: '#f59e0b',
  },
  {
    id: 'u4',
    name: 'Phạm Quốc Hùng',
    role: 'Fullstack',
    email: 'hungpq@hncjsc.vn',
    avatar: 'PH',
    color: '#ef4444',
  },
  {
    id: 'u5',
    name: 'Đỗ Thanh Tùng',
    role: 'Mobile',
    email: 'tungdt@hncjsc.vn',
    avatar: 'DT',
    color: '#8b5cf6',
  },
  {
    id: 'u6',
    name: 'Vũ Bích Ngọc',
    role: 'QA',
    email: 'ngocvb@hncjsc.vn',
    avatar: 'VN',
    color: '#ec4899',
  },
]

export const initialProjects = [
  { id: 'p1', name: 'CRM Khách hàng', code: 'CRM' },
  { id: 'p2', name: 'Cổng thanh toán', code: 'PAY' },
  { id: 'p3', name: 'App Mobile Bán hàng', code: 'MOB' },
  { id: 'p4', name: 'Hệ thống nội bộ', code: 'INT' },
]

const now = new Date()
const daysAgo = (n) => new Date(now.getTime() - n * 86400000).toISOString()
const daysFromNow = (n) => new Date(now.getTime() + n * 86400000).toISOString()

export const initialTasks = [
  {
    id: 't1',
    title: 'Thiết kế trang Dashboard CRM',
    description: 'Vẽ UI Dashboard với biểu đồ doanh thu theo tháng.',
    assigneeId: 'u2',
    projectId: 'p1',
    status: 'in_progress',
    priority: 'high',
    createdAt: daysAgo(3),
    dueDate: daysFromNow(2),
  },
  {
    id: 't2',
    title: 'API thanh toán VNPAY',
    description: 'Tích hợp gateway VNPAY, viết unit test.',
    assigneeId: 'u3',
    projectId: 'p2',
    status: 'in_progress',
    priority: 'urgent',
    createdAt: daysAgo(5),
    dueDate: daysFromNow(1),
  },
  {
    id: 't3',
    title: 'Fix bug login app mobile',
    description: 'Lỗi không hiển thị OTP trên iOS 17.',
    assigneeId: 'u5',
    projectId: 'p3',
    status: 'review',
    priority: 'high',
    createdAt: daysAgo(2),
    dueDate: daysFromNow(0),
  },
  {
    id: 't4',
    title: 'Viết test case module Báo cáo',
    description: 'Cover module Báo cáo tổng hợp doanh thu.',
    assigneeId: 'u6',
    projectId: 'p1',
    status: 'todo',
    priority: 'medium',
    createdAt: daysAgo(1),
    dueDate: daysFromNow(5),
  },
  {
    id: 't5',
    title: 'Refactor module Auth',
    description: 'Tách logic JWT ra service riêng.',
    assigneeId: 'u4',
    projectId: 'p4',
    status: 'done',
    priority: 'medium',
    createdAt: daysAgo(7),
    startedAt: daysAgo(6),
    completedAt: daysAgo(1),
    dueDate: daysAgo(1),
  },
  {
    id: 't6',
    title: 'Cập nhật form đăng ký',
    description: 'Thêm field "Mã giới thiệu" theo yêu cầu sales.',
    assigneeId: 'u2',
    projectId: 'p1',
    status: 'todo',
    priority: 'low',
    createdAt: daysAgo(0),
    dueDate: daysFromNow(7),
  },
]

export const initialBuildRequests = [
  {
    id: 'b1',
    projectId: 'p1',
    env: 'dev',
    requesterId: 'u2',
    note: 'Build bản mới có form đăng ký V2, cần test trên dev.',
    status: 'pending',
    createdAt: daysAgo(0),
    completedAt: null,
    version: null,
  },
  {
    id: 'b2',
    projectId: 'p2',
    env: 'production',
    requesterId: 'u3',
    note: 'Hotfix API thanh toán VNPAY - urgent!',
    status: 'pending',
    createdAt: daysAgo(0),
    completedAt: null,
    version: null,
  },
  {
    id: 'b3',
    projectId: 'p3',
    env: 'dev',
    requesterId: 'u5',
    note: 'Bản fix OTP iOS 17 sẵn sàng test.',
    status: 'building',
    createdAt: daysAgo(0),
    completedAt: null,
    version: null,
  },
  {
    id: 'b4',
    projectId: 'p4',
    env: 'production',
    requesterId: 'u4',
    note: 'Deploy module Auth mới sau khi QA pass.',
    status: 'success',
    createdAt: daysAgo(2),
    completedAt: daysAgo(1),
    version: 'v1.4.2',
  },
  {
    id: 'b5',
    projectId: 'p1',
    env: 'dev',
    requesterId: 'u2',
    note: 'Build chứa Dashboard mới.',
    status: 'failed',
    createdAt: daysAgo(3),
    completedAt: daysAgo(3),
    version: null,
  },
]
