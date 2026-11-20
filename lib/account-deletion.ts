// Noi dung xac nhan dung chung, khong phu thuoc giao dien.
export function confirmDeletionMessage(user: { isAdmin?: boolean }): string {
  const base = "Hồ sơ tài khoản sẽ bị xoá vĩnh viễn ngay lập tức. Không thể hoàn tác. Số lượt đã dùng vẫn được tính đến 00:00 giờ Việt Nam của ngày tiếp theo, kể cả khi bạn đăng nhập lại bằng cùng tài khoản Google.";
  if (!user.isAdmin) return base;
  return `${base}\n\nNếu email vẫn nằm trong danh sách quản trị, đăng nhập lại sẽ tạo tài khoản mới với quyền quản trị.`;
}
