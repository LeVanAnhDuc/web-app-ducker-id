# Rules — docs/

## 📊 Sprint Progress Sync

**IMPORTANT: Mỗi khi cập nhật trạng thái task trong bất kỳ file `docs/features/*/05-implement-plan.md` nào, BẮT BUỘC phải cập nhật `docs/sprint.md` ngay sau đó trong cùng một lần thao tác.**

### Các trường hợp phải sync:

1. **Task chuyển sang ✅ Done** → tăng "Task đã xong", cập nhật "Task cuối hoàn thành" và "Task tiếp theo", tính lại %
2. **Task chuyển sang 🔄 In Progress** → cập nhật "Task tiếp theo" nếu cần
3. **Task mới được thêm vào** → tăng "Tổng task", tính lại %
4. **Feature hoàn thành 100%** → đổi trạng thái sang ✅ Hoàn thành

### Công thức tính tiến độ:

```
Tiến độ (%) = (Task đã xong / Tổng task) × 100, làm tròn xuống
Tiến độ toàn dự án = (Tổng task đã xong trên tất cả feature / Tổng task tất cả feature) × 100
```

### Checklist khi sync `docs/sprint.md`:

- [ ] Cập nhật số **Task đã xong** của feature tương ứng
- [ ] Cập nhật cột **Task cuối hoàn thành**
- [ ] Cập nhật cột **Task tiếp theo** (task ⬜ Todo đầu tiên còn lại)
- [ ] Tính lại cột **Tiến độ (%)**
- [ ] Cập nhật **Trạng thái** nếu feature vừa bắt đầu hoặc vừa hoàn thành
- [ ] Cập nhật dòng **Tổng task đã xong / tổng task** ở bảng Tổng quan
- [ ] Cập nhật **% toàn dự án** ở bảng Tổng quan
- [ ] Cập nhật **Cập nhật lần cuối** ở đầu file `docs/sprint.md`
