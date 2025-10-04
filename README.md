# Hệ Thống Điểm Danh Sinh Viên

![Node.js](https://img.shields.io/badge/Node.js-14+-green)
![Express](https://img.shields.io/badge/Express-4.18+-blue)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3+-purple)
![License](https://img.shields.io/badge/License-MIT-yellow)

Hệ thống điểm danh sinh viên hiện đại với camera tích hợp và dashboard quản lý. Hỗ trợ chụp ảnh, lưu trữ dữ liệu và theo dõi điểm danh theo thời gian thực.

## ✨ Tính Năng

### 🎯 Chức Năng Chính
- **Điểm danh bằng camera**: Chụp ảnh trực tiếp từ webcam
- **Dashboard quản lý**: Xem và quản lý danh sách điểm danh
- **Giao diện responsive**: Tương thích với mọi thiết bị
- **Theme tối/sáng**: Chuyển đổi giao diện linh hoạt
- **Lưu trữ dữ liệu**: Hỗ trợ CSV và JSON
- **Báo cáo thống kê**: Thống kê điểm danh theo ngày

### 🎨 Giao Diện
- **Modern UI**: Thiết kế hiện đại với Bootstrap 5
- **Dark/Light Theme**: Chuyển đổi theme dễ dàng
- **Mobile Friendly**: Tối ưu cho điện thoại và tablet
- **Interactive Elements**: Hiệu ứng hover và animation mượt mà

### 🔧 Kỹ Thuật
- **Backend**: Node.js + Express
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Camera API**: WebRTC getUserMedia
- **File Upload**: Multer middleware
- **Data Processing**: CSV parser, XLSX support

## 🚀 Cài Đặt

### Yêu Cầu Hệ Thống
- Node.js 14.0.0 trở lên
- NPM hoặc Yarn
- Webcam (cho chức năng chụp ảnh)
- Trình duyệt hỗ trợ WebRTC

### Cài Đặt Dependencies

```bash
# Clone repository
git clone https://github.com/yourusername/student-attendance-system.git
cd student-attendance-system

# Cài đặt dependencies
npm install

# Hoặc sử dụng yarn
yarn install
```

### Cấu Hình

1. **Sao chép file cấu hình**:
```bash
cp config.example.js config.js
```

2. **Chỉnh sửa cấu hình** trong `config.js`:
```javascript
module.exports = {
    PORT: 3000,
    UPLOAD_DIR: 'uploads',
    LOG_DIR: 'logs',
    // ... các cấu hình khác
};
```

3. **Tạo thư mục cần thiết**:
```bash
mkdir uploads logs
```

### Chạy Ứng Dụng

```bash
# Chạy production
npm start

# Chạy development (với nodemon)
npm run dev
```

Truy cập: `http://localhost:3000`

## 📁 Cấu Trúc Project

```
student-attendance-system/
├── views/                          # Templates HTML
│   ├── index.html                  # Trang chính điểm danh
│   └── dashboard.html              # Dashboard quản lý
├── static/                         # Static files
│   ├── style.css                   # CSS chính
│   ├── script.js                   # JavaScript chính
│   └── diemdanh_background.jpg     # Background image
├── modules/                        # Modules JavaScript
│   └── studentManager.js           # Quản lý dữ liệu sinh viên
├── logs/                           # Thư mục logs
│   ├── diem_danh_log.json          # Log điểm danh thực tế
│   └── diem_danh_log_sample.json   # Log mẫu
├── uploads/                        # Thư mục upload ảnh
├── server_cpanel.js                # Server chính
├── danh_sach_sinh_vien.csv         # Danh sách sinh viên thực tế
├── danh_sach_sinh_vien_sample.csv  # Danh sách sinh viên mẫu
├── package.json                    # Dependencies
├── config.example.js               # Cấu hình mẫu
├── .gitignore                      # Git ignore rules
└── README.md                       # Tài liệu này
```

## 🎮 Hướng Dẫn Sử Dụng

### 1. Điểm Danh
1. Truy cập trang chính
2. Nhập MSSV của sinh viên
3. Nhấn "Bật Camera" để kích hoạt webcam
4. Nhấn "Chụp Ảnh" để chụp ảnh điểm danh
5. Nhấn "Điểm Danh" để hoàn tất

### 2. Xem Dashboard
1. Nhấn nút "Check Điểm Danh" trên trang chính
2. Hoặc truy cập trực tiếp `/dashboard`
3. Chọn ngày để xem dữ liệu
4. Sử dụng các tính năng sắp xếp và lọc

### 3. Quản Lý Dữ Liệu
- **Thêm sinh viên**: Chỉnh sửa file `danh_sach_sinh_vien.csv`
- **Xem logs**: Kiểm tra file `logs/diem_danh_log.json`
- **Backup dữ liệu**: Sao chép thư mục `uploads/` và `logs/`

## 🔧 API Endpoints

### Điểm Danh
- `POST /attendance` - Gửi dữ liệu điểm danh
- `GET /` - Trang chính điểm danh

### Dashboard
- `GET /dashboard` - Trang dashboard
- `GET /api/dashboard/attendance-summary?date=YYYY-MM-DD` - Tóm tắt điểm danh
- `GET /api/dashboard/attendance-data?date=YYYY-MM-DD` - Dữ liệu điểm danh chi tiết

### Static Files
- `GET /static/*` - Phục vụ static files
- `GET /uploads/*` - Phục vụ ảnh đã upload

## 📊 Cấu Trúc Dữ Liệu

### Danh Sách Sinh Viên (CSV)
```csv
MSSV,Tên Sinh Viên
2010001,Nguyễn Văn An
2010002,Trần Thị Bình
...
```

### Log Điểm Danh (JSON)
```json
[
  {
    "mssv": "2010001",
    "ten": "Nguyễn Văn An",
    "ngay": "2025-10-04",
    "thoiGian": "2025-10-04 08:15:30",
    "hinhAnh": "uploads/image.jpg",
    "ip": "192.168.1.100"
  }
]
```

## 🛡️ Bảo Mật

### Các Biện Pháp Bảo Mật
- **Validation dữ liệu**: Kiểm tra MSSV và file upload
- **File type checking**: Chỉ cho phép file ảnh
- **Size limit**: Giới hạn kích thước file upload
- **IP tracking**: Ghi lại IP của người điểm danh
- **Duplicate prevention**: Ngăn điểm danh trùng lặp

### Khuyến Nghị
- Sử dụng HTTPS trong production
- Cấu hình firewall phù hợp
- Backup dữ liệu định kỳ
- Cập nhật dependencies thường xuyên

## 🚀 Deployment

### Heroku
```bash
# Tạo Procfile
echo "web: node server_cpanel.js" > Procfile

# Deploy
git add .
git commit -m "Deploy to Heroku"
git push heroku main
```

### VPS/Server
```bash
# Sử dụng PM2
npm install -g pm2
pm2 start server_cpanel.js --name "attendance-system"
pm2 save
pm2 startup
```

### Docker
```dockerfile
FROM node:14-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Đóng Góp

1. Fork repository
2. Tạo feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Tạo Pull Request

## 📝 License

Distributed under the MIT License. See `LICENSE` for more information.

## 👨‍💻 Tác Giả

**Your Name**
- GitHub: [@yourusername](https://github.com/yourusername)
- Email: your.email@example.com

## 🙏 Lời Cảm Ơn

- [Express.js](https://expressjs.com/) - Web framework
- [Bootstrap](https://getbootstrap.com/) - CSS framework
- [Font Awesome](https://fontawesome.com/) - Icons
- [Node.js](https://nodejs.org/) - Runtime environment

## 📞 Hỗ Trợ

Nếu gặp vấn đề, vui lòng:
1. Kiểm tra [Issues](https://github.com/yourusername/student-attendance-system/issues)
2. Tạo issue mới với mô tả chi tiết
3. Liên hệ qua email: your.email@example.com

---

⭐ Nếu project này hữu ích, hãy cho một star nhé!
