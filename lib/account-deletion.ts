// Noi dung xac nhan dung chung, khong phu thuoc giao dien.
export function confirmDeletionMessage(user: { isAdmin?: boolean }): string {
  const base = "Tài khoản, email, tên và bộ đếm lượt dịch sẽ bị xoá vĩnh viễn ngay lập tức. Không thể hoàn tác.";
  if (!user.isAdmin) return base;
  return `${base}\n\nNếu email vẫn nằm trong danh sách quản trị, đăng nhập lại sẽ tạo tài khoản mới với quyền quản trị.`;
}
