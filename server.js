// NO UPDATE MOR FOR THIS

const express = require('express');
const multer = require('multer');
const cors = require('cors');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const moment = require('moment-timezone');

// Import modules
const AdminManager = require('./modules/adminManager');
const StudentManager = require('./modules/studentManager');
const AttendanceManager = require('./modules/attendanceManager');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: false, // Disable for development
    crossOriginEmbedderPolicy: false
}));

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Session configuration
app.use(session({
    secret: process.env.SECRET_KEY || 'diem-danh-secret-key-2024',
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false, // Set to true if using HTTPS
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000 // 24 hours
    },
    name: 'diemdanh.sid' // Custom session name
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Quá nhiều yêu cầu từ IP này, vui lòng thử lại sau.'
});
app.use('/api/', limiter);

// Static files
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Initialize managers
const adminManager = new AdminManager();
const studentManager = new StudentManager();
const attendanceManager = new AttendanceManager();

// Multer configuration for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        const uniqueName = `diem-danh-${uuidv4().replace(/-/g, '')}.jpg`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: {
        fileSize: 8 * 1024 * 1024 // 8MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        
        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Chỉ cho phép file ảnh (JPEG, JPG, PNG, GIF)'));
        }
    }
});

// Ensure directories exist
async function ensureDirectories() {
    const dirs = ['uploads', 'logs', 'data'];
    for (const dir of dirs) {
        try {
            await fs.mkdir(dir, { recursive: true });
        } catch (error) {
            console.error(`Lỗi tạo thư mục ${dir}:`, error);
        }
    }
}

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'index.html'));
});

app.get('/admin', (req, res) => {
    const { username, password } = req.query;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    if (!username || !password) {
        return res.send(adminManager.getLoginPage('Vui lòng nhập tên đăng nhập và mật khẩu'));
    }
    
    const authResult = adminManager.authenticate(username, password, ipAddress);
    if (!authResult.success) {
        return res.send(adminManager.getLoginPage(authResult.message));
    }
    
    res.sendFile(path.join(__dirname, 'views', 'admin.html'));
});

app.get('/dashboard', (req, res) => {
    res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
});

// API Routes
app.post('/api/diem-danh', upload.single('hinhAnh'), async (req, res) => {
    try {
        const { mssv } = req.body;
        const clientIp = req.ip || req.connection.remoteAddress;
        
        // Validate input
        if (!mssv || !mssv.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng nhập MSSV'
            });
        }
        
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng chụp ảnh'
            });
        }
        
        // Check if student exists
        const student = await studentManager.getStudentByMSSV(mssv.trim());
        if (!student) {
            return res.status(400).json({
                success: false,
                message: 'MSSV không thuộc danh sách nhóm'
            });
        }
        
        // Check if already attended today
        const alreadyAttended = await attendanceManager.checkAlreadyAttended(clientIp);
        if (alreadyAttended) {
            return res.status(400).json({
                success: false,
                message: 'Bạn đã điểm danh hôm nay rồi'
            });
        }
        
        // Save attendance record
        const imageUrl = `/uploads/${req.file.filename}`;
        const attendanceData = {
            mssv: mssv.trim(),
            ten: student.ten,
            ip: clientIp,
            hinhAnh: imageUrl,
            thoiGian: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss'),
            ngay: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD')
        };
        
        const saved = await attendanceManager.saveAttendance(attendanceData);
        if (!saved) {
            return res.status(500).json({
                success: false,
                message: 'Lỗi hệ thống, vui lòng thử lại'
            });
        }
        
        res.json({
            success: true,
            message: `${mssv} - ${student.ten} đã điểm danh thành công`,
            data: {
                mssv: mssv.trim(),
                ten: student.ten,
                thoiGian: moment().tz('Asia/Ho_Chi_Minh').format('DD/MM/YYYY HH:mm:ss')
            }
        });
        
    } catch (error) {
        console.error('Lỗi API điểm danh:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi hệ thống, vui lòng thử lại'
        });
    }
});

app.get('/api/danh-sach-sinh-vien', async (req, res) => {
    try {
        const students = await studentManager.getAllStudents();
        res.json(students);
    } catch (error) {
        console.error('Lỗi API danh sách sinh viên:', error);
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
});

app.get('/api/admin/attendance-data', async (req, res) => {
    try {
        const { date } = req.query;
        const students = await studentManager.getAllStudents();
        const logs = await attendanceManager.getAttendanceLogs(date);
        
        res.json({
            students,
            attendance_logs: logs,
            selected_date: date
        });
    } catch (error) {
        console.error('Lỗi API admin attendance data:', error);
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
});

app.get('/api/admin/attendance-summary', async (req, res) => {
    try {
        const { date } = req.query;
        const students = await studentManager.getAllStudents();
        const summary = await attendanceManager.getAttendanceSummaryWithStudentList(students, date);
        res.json(summary);
    } catch (error) {
        console.error('Lỗi API admin summary:', error);
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
});

// Dashboard API endpoints
app.get('/api/dashboard/attendance-data', async (req, res) => {
    try {
        const { date } = req.query;
        console.log(`📊 Loading attendance data for date: ${date}`);
        
        // Load data in parallel for better performance
        const [students, logs] = await Promise.all([
            studentManager.getAllStudents(),
            attendanceManager.getAttendanceLogs(date)
        ]);
        
        console.log(`✅ Loaded ${students.length} students and ${logs.length} attendance logs`);
        
        res.json({
            students,
            attendance_logs: logs,
            selected_date: date
        });
    } catch (error) {
        console.error('Lỗi API dashboard attendance data:', error);
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
});

app.get('/api/dashboard/attendance-summary', async (req, res) => {
    try {
        const { date } = req.query;
        console.log(`📈 Loading attendance summary for date: ${date}`);
        
        const students = await studentManager.getAllStudents();
        const summary = await attendanceManager.getAttendanceSummaryWithStudentList(students, date);
        
        console.log(`✅ Summary loaded: ${summary.total_students} total, ${summary.attended_count} attended`);
        
        res.json(summary);
    } catch (error) {
        console.error('Lỗi API dashboard summary:', error);
        res.status(500).json({ error: 'Lỗi hệ thống' });
    }
});

// Admin management APIs
app.get('/api/admin/accounts', async (req, res) => {
    try {
        const admins = adminManager.getAllAdmins();
        const stats = adminManager.getLoginStats();
        res.json({
            success: true,
            admins,
            stats
        });
    } catch (error) {
        console.error('Lỗi get admin accounts:', error);
        res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
    }
});

app.post('/api/admin/create', async (req, res) => {
    try {
        const { username, password, email, full_name, role, permissions } = req.body;
        
        if (!username || !password || !email || !full_name) {
            return res.status(400).json({
                success: false,
                error: 'Vui lòng điền đầy đủ thông tin'
            });
        }
        
        const result = adminManager.createAdmin({
            username,
            password,
            email,
            full_name,
            role: role || 'teacher',
            permissions: permissions || []
        });
        
        res.json(result);
    } catch (error) {
        console.error('Lỗi create admin:', error);
        res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
    }
});

app.post('/api/admin/update/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        const updateData = req.body;
        
        const result = adminManager.updateAdmin(adminId, updateData);
        res.json(result);
    } catch (error) {
        console.error('Lỗi update admin:', error);
        res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
    }
});

app.post('/api/admin/delete/:adminId', async (req, res) => {
    try {
        const { adminId } = req.params;
        const result = adminManager.deleteAdmin(adminId);
        res.json(result);
    } catch (error) {
        console.error('Lỗi delete admin:', error);
        res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
    }
});

app.get('/api/admin/stats', async (req, res) => {
    try {
        const stats = adminManager.getLoginStats();
        res.json({ success: true, stats });
    } catch (error) {
        console.error('Lỗi get admin stats:', error);
        res.status(500).json({ success: false, error: 'Lỗi hệ thống' });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({
                success: false,
                message: 'File quá lớn. Kích thước tối đa 8MB.'
            });
        }
    }
    
    console.error('Lỗi server:', error);
    res.status(500).json({
        success: false,
        message: 'Lỗi hệ thống'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'Không tìm thấy trang'
    });
});

// Handle process errors
process.on('uncaughtException', (error) => {
    if (error.code === 'EPIPE' || error.errno === 32) {
        // Ignore broken pipe errors (client disconnected)
        return;
    }
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
async function startServer() {
    try {
        await ensureDirectories();
        await adminManager.initialize();
        await studentManager.initialize();
        await attendanceManager.initialize();
        
        app.listen(PORT, '0.0.0.0', () => {
            console.log('🚀 Khởi động Node.js server...');
            console.log('📋 Đảm bảo file danh_sach_sinh_vien.csv có trong thư mục gốc');
            console.log(`🌐 Truy cập: http://localhost:${PORT}`);
            console.log(`📊 Admin: http://localhost:${PORT}/admin?username=admin&password=admin123`);
        });
    } catch (error) {
        console.error('Lỗi khởi động server:', error);
        process.exit(1);
    }
}

startServer();
