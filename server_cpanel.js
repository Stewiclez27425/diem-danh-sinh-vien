        const express = require('express');
        const multer = require('multer');
        const cors = require('cors');
        const session = require('express-session');
        const path = require('path');
        const fs = require('fs');
        const fsPromises = require('fs').promises;
        const { v4: uuidv4 } = require('uuid');
        const moment = require('moment-timezone');

        // Import modules
        console.log('🔧 Đang import modules...');
        const StudentManager = require('./modules/studentManager');
        console.log('✅ StudentManager imported:', typeof StudentManager);
        const AttendanceManager = require('./modules/attendanceManager');
        console.log('✅ AttendanceManager imported:', typeof AttendanceManager);
        const CleanupManager = require('./modules/cleanupManager');
        console.log('✅ CleanupManager imported:', typeof CleanupManager);
        console.log('✅ Đã import modules');

        const app = express();

        // cPanel specific configuration
        const PORT = process.env.PORT || 3000;
        const HOST = process.env.HOST || '0.0.0.0';

        // Middleware for cPanel
        app.use(cors({
            origin: '*',
            methods: ['GET', 'POST', 'PUT', 'DELETE'],
            allowedHeaders: ['Content-Type', 'Authorization']
        }));

        app.use(express.json({ limit: '10mb' }));
        app.use(express.urlencoded({ extended: true, limit: '10mb' }));

        // Session configuration for cPanel
        app.use(session({
            secret: process.env.SECRET_KEY || 'diem-danh-secret-key-2024',
            resave: false,
            saveUninitialized: false,
            cookie: {
                secure: false, // Set to true if using HTTPS
                httpOnly: true,
                maxAge: 24 * 60 * 60 * 1000 // 24 hours
            },
            name: 'diemdanh.sid'
        }));

        // Middleware để đảm bảo API responses luôn fresh
        app.use('/api', (req, res, next) => {
            // Thêm cache-busting headers cho tất cả API calls
            res.set({
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Pragma': 'no-cache',
                'Expires': '0',
                'Last-Modified': new Date().toUTCString(),
                'ETag': `"${Date.now()}"`
            });
            next();
        });

        // Static files - optimized for cPanel
        app.use('/static', express.static(path.join(__dirname, 'static'), {
            maxAge: '1d',
            etag: true
        }));
        app.use('/uploads', express.static(path.join(__dirname, 'uploads'), {
            maxAge: '7d',
            etag: true
        }));

        // Initialize managers
        console.log('🔧 Đang tạo managers...');
        let studentManager, attendanceManager, cleanupManager;

        try {
            studentManager = new StudentManager();
            console.log('✅ StudentManager created:', typeof studentManager);
            
            attendanceManager = new AttendanceManager();
            console.log('✅ AttendanceManager created:', typeof attendanceManager);
            
            cleanupManager = new CleanupManager();
            console.log('✅ CleanupManager created:', typeof cleanupManager);
        } catch (error) {
            console.error('❌ Lỗi tạo managers:', error);
            process.exit(1);
        }

        // Multer configuration for file uploads - optimized for cPanel
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
                fileSize: 5 * 1024 * 1024 // 5MB limit for cPanel
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
                    await fsPromises.mkdir(dir, { recursive: true });
                } catch (error) {
                    console.error(`Lỗi tạo thư mục ${dir}:`, error);
                }
            }
        }

        // Initialize cleanup manager
        async function initializeCleanup() {
            try {
                await cleanupManager.initialize();
                console.log('✅ CleanupManager đã được khởi tạo');
            } catch (error) {
                console.error('❌ Lỗi khởi tạo CleanupManager:', error);
            }
        }

        // Routes
        app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, 'views', 'index.html'));
        });

        // Link ẩn để truy cập dashboard - chỉ bạn biết
        app.get('/dashboard-secret', (req, res) => {
            res.sendFile(path.join(__dirname, 'views', 'dashboard.html'));
        });

        // API Routes
        app.post('/api/diem-danh', upload.single('hinhAnh'), async (req, res) => {
            try {
                const { mssv } = req.body;
                const clientIp = req.ip || req.connection.remoteAddress;
                
                // Force reload data from files to ensure fresh data
                await studentManager.initialize();
                await attendanceManager.initialize();
                
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
                
                // Get student info (if exists in list) or create temporary info
                let student = await studentManager.getStudentByMSSV(mssv.trim());
                if (!student) {
                    // Nếu không có trong danh sách, tạo thông tin tạm thời
                    student = {
                        mssv: mssv.trim(),
                        ten: `Sinh viên ${mssv.trim()}`
                    };
                }
                
                // Check if already attended today (chỉ kiểm tra MSSV, không kiểm tra IP)
                const alreadyAttended = await attendanceManager.checkAlreadyAttended(mssv.trim());
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
                    message: `${student.mssv} - ${student.ten} đã điểm danh thành công`,
                    data: {
                        mssv: student.mssv,
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
                // Force reload data from files
                await studentManager.initialize();
                
                const students = await studentManager.getAllStudents();
                console.log('📊 API danh sách sinh viên - Tổng số:', students.length);
                console.log('👥 Danh sách:', students);
                
                res.json(students);
            } catch (error) {
                console.error('Lỗi API danh sách sinh viên:', error);
                res.status(500).json({ error: 'Lỗi hệ thống' });
            }
        });

        app.get('/api/students', async (req, res) => {
            try {
                // Force reload data from files
                await studentManager.initialize();
                
                const students = await studentManager.getAllStudents();
                console.log('📊 API students - Tổng số:', students.length);
                
                res.json(students);
            } catch (error) {
                console.error('Lỗi API students:', error);
                res.status(500).json({ error: 'Lỗi hệ thống' });
            }
        });

        // API debug để kiểm tra sinh viên
        app.get('/api/debug/students', async (req, res) => {
            try {
                // Force reload data from files
                await studentManager.initialize();
                
                const students = await studentManager.getAllStudents();
                const testMSSV = req.query.mssv || 'SV010';
                const foundStudent = await studentManager.getStudentByMSSV(testMSSV);
                
                res.json({
                    total_students: students.length,
                    students: students,
                    test_mssv: testMSSV,
                    found_student: foundStudent,
                    search_result: foundStudent ? 'FOUND' : 'NOT_FOUND'
                });
            } catch (error) {
                console.error('Lỗi API debug students:', error);
                res.status(500).json({ error: 'Lỗi hệ thống' });
            }
        });

    app.get('/api/dashboard/attendance-data', async (req, res) => {
        try {
            const { date } = req.query;
            console.log(`📊 Loading attendance data for date: ${date}`);
            
            // Force reload data from files
            await studentManager.initialize();
            await attendanceManager.initialize();
            
            // Load data in parallel for better performance
            const [students, logs] = await Promise.all([
                studentManager.getAllStudents(),
                attendanceManager.getAttendanceLogs(date)
            ]);
            
            console.log(`✅ Loaded ${students.length} students and ${logs.length} attendance logs`);
            console.log(`📋 Logs for ${date}:`, logs.map(log => ({ mssv: log.mssv, ten: log.ten })));
            
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
            
            // Force reload data from files
            await studentManager.initialize();
            await attendanceManager.initialize();
            
            const students = await studentManager.getAllStudents();
            const summary = await attendanceManager.getAttendanceSummaryWithStudentList(students, date);
            
            console.log(`✅ Summary loaded: ${summary.total_students} total, ${summary.attended_count} attended`);
            console.log(`📋 Attended students:`, summary.attended_students);
            console.log(`📋 Not attended students:`, summary.not_attended_students);
            
            res.json(summary);
        } catch (error) {
            console.error('Lỗi API dashboard summary:', error);
            res.status(500).json({ error: 'Lỗi hệ thống' });
        }
    });

    // API để force reload tất cả dữ liệu
    app.post('/api/reload-data', async (req, res) => {
        try {
            console.log('🔄 Force reloading all data...');
            
            // Force reload cả hai managers
            await studentManager.initialize();
            await attendanceManager.initialize();
            
            // Lấy thống kê để xác nhận
            const students = await studentManager.getAllStudents();
            const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
            const todayLogs = await attendanceManager.getAttendanceLogs(today);
            
            console.log(`✅ Data reloaded: ${students.length} students, ${todayLogs.length} attendance logs for today`);
            
            res.json({
                success: true,
                message: 'Dữ liệu đã được reload thành công',
                data: {
                    students_count: students.length,
                    attendance_logs_today: todayLogs.length,
                    reload_time: moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD HH:mm:ss')
                }
            });
            
        } catch (error) {
            console.error('Lỗi khi reload dữ liệu:', error);
            res.status(500).json({
                success: false,
                message: 'Lỗi khi reload dữ liệu',
                error: error.message
            });
        }
});

// API để kiểm tra và sửa dữ liệu không nhất quán
app.get('/api/check-data-consistency', async (req, res) => {
    try {
        console.log('🔍 Checking data consistency...');
        
        // Force reload data
        await studentManager.initialize();
        await attendanceManager.initialize();
        
        const students = await studentManager.getAllStudents();
        const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
        const todayLogs = await attendanceManager.getAttendanceLogs(today);
        
        // Check for inconsistencies
        const issues = [];
        const studentMap = new Map(students.map(s => [s.mssv, s]));
        
        // Check 1: Logs with MSSV not in student list
        const unknownMSSVs = todayLogs.filter(log => !studentMap.has(log.mssv));
        if (unknownMSSVs.length > 0) {
            issues.push({
                type: 'unknown_mssv',
                message: `Có ${unknownMSSVs.length} bản ghi điểm danh với MSSV không có trong danh sách sinh viên`,
                details: unknownMSSVs.map(log => ({ mssv: log.mssv, ten: log.ten }))
            });
        }
        
        // Check 2: Logs with empty or missing names
        const emptyNames = todayLogs.filter(log => !log.ten || log.ten.trim() === '');
        if (emptyNames.length > 0) {
            issues.push({
                type: 'empty_names',
                message: `Có ${emptyNames.length} bản ghi điểm danh không có tên`,
                details: emptyNames.map(log => ({ mssv: log.mssv, ten: log.ten }))
            });
        }
        
        // Check 3: Duplicate attendance records for same MSSV
        const mssvCounts = {};
        todayLogs.forEach(log => {
            mssvCounts[log.mssv] = (mssvCounts[log.mssv] || 0) + 1;
        });
        const duplicates = Object.entries(mssvCounts).filter(([mssv, count]) => count > 1);
        if (duplicates.length > 0) {
            issues.push({
                type: 'duplicate_attendance',
                message: `Có ${duplicates.length} sinh viên điểm danh nhiều lần trong ngày`,
                details: duplicates.map(([mssv, count]) => ({ mssv, count }))
            });
        }
        
        // Check 4: Students in list but not in logs (normal case)
        const attendedMSSVs = new Set(todayLogs.map(log => log.mssv));
        const notAttendedStudents = students.filter(s => !attendedMSSVs.has(s.mssv));
        
        const summary = {
            total_students: students.length,
            total_attendance_logs: todayLogs.length,
            unique_attended_students: attendedMSSVs.size,
            not_attended_students: notAttendedStudents.length,
            issues_found: issues.length,
            issues: issues,
            date: today
        };
        
        console.log(`✅ Data consistency check completed: ${issues.length} issues found`);
        
        res.json({
            success: true,
            message: `Kiểm tra hoàn tất. Tìm thấy ${issues.length} vấn đề.`,
            data: summary
        });
        
    } catch (error) {
        console.error('Lỗi kiểm tra data consistency:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi kiểm tra tính nhất quán dữ liệu',
            error: error.message
        });
    }
});

// API để test logic điểm danh - cho phép 1 IP điểm danh nhiều MSSV
app.post('/api/test-attendance-logic', async (req, res) => {
    try {
        const { mssv, ip } = req.body;
        
        if (!mssv) {
            return res.status(400).json({
                success: false,
                message: 'Vui lòng cung cấp MSSV'
            });
        }
        
        // Force reload data
        await attendanceManager.initialize();
        
        const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
        const todayLogs = await attendanceManager.getAttendanceLogs(today);
        
        // Check if MSSV already attended today
        const alreadyAttended = await attendanceManager.checkAlreadyAttended(mssv.trim());
        
        // Get all attendance records for this IP today
        const ipAttendanceToday = todayLogs.filter(log => log.ip === ip);
        
        // Get all attendance records for this MSSV today
        const mssvAttendanceToday = todayLogs.filter(log => log.mssv === mssv.trim());
        
        const result = {
            mssv: mssv.trim(),
            ip: ip || 'N/A',
            date: today,
            already_attended: alreadyAttended,
            can_attend: !alreadyAttended,
            ip_attendance_count: ipAttendanceToday.length,
            mssv_attendance_count: mssvAttendanceToday.length,
            ip_attendance_details: ipAttendanceToday.map(log => ({
                mssv: log.mssv,
                ten: log.ten,
                thoiGian: log.thoiGian
            })),
            mssv_attendance_details: mssvAttendanceToday.map(log => ({
                mssv: log.mssv,
                ten: log.ten,
                thoiGian: log.thoiGian,
                ip: log.ip
            })),
            message: alreadyAttended 
                ? `MSSV ${mssv.trim()} đã điểm danh hôm nay rồi` 
                : `MSSV ${mssv.trim()} có thể điểm danh`
        };
        
        console.log(`🧪 Test attendance logic: MSSV ${mssv.trim()}, IP ${ip}, Can attend: ${!alreadyAttended}`);
        
        res.json({
            success: true,
            message: 'Test logic điểm danh hoàn tất',
            data: result
        });
        
    } catch (error) {
        console.error('Lỗi test attendance logic:', error);
        res.status(500).json({
            success: false,
            message: 'Lỗi khi test logic điểm danh',
            error: error.message
        });
    }
});

    // Error handling middleware
        app.use((error, req, res, next) => {
            if (error instanceof multer.MulterError) {
                if (error.code === 'LIMIT_FILE_SIZE') {
                    return res.status(400).json({
                        success: false,
                        message: 'File quá lớn. Kích thước tối đa 5MB.'
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

        // Start server
        async function startServer() {
            try {
                console.log('🔧 Đang khởi tạo server...');
                
                // Tạo thư mục cần thiết
                await ensureDirectories();
                console.log('✅ Đã tạo thư mục cần thiết');
                
                // Khởi tạo các manager
                console.log('🔧 Đang khởi tạo StudentManager...');
                await studentManager.initialize();
                console.log('✅ StudentManager đã khởi tạo');
                
                console.log('🔧 Đang khởi tạo AttendanceManager...');
                await attendanceManager.initialize();
                console.log('✅ AttendanceManager đã khởi tạo');
                
                // Test đọc file CSV
                console.log('🔍 Test đọc file CSV...');
                const students = await studentManager.getAllStudents();
                console.log(`📊 Đã load ${students.length} sinh viên từ CSV`);
                
                
                // Process-level error handlers
                process.on('uncaughtException', (error) => {
                    if (error && (error.code === 'EPIPE' || error.errno === 32)) {
                        // Ignore broken pipe errors (client disconnected)
                        return;
                    }
                    console.error('❌ Uncaught Exception:', error);
                });

                process.on('unhandledRejection', (reason, promise) => {
                    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
                });

                // API endpoints for cleanup management
                app.get('/api/cleanup/info', (req, res) => {
                    try {
                        const info = cleanupManager.getCleanupInfo();
                        res.json({
                            success: true,
                            data: info
                        });
                    } catch (error) {
                        res.status(500).json({
                            success: false,
                            message: 'Lỗi lấy thông tin cleanup'
                        });
                    }
                });

                app.post('/api/cleanup/manual', async (req, res) => {
                    try {
                        await cleanupManager.manualCleanup();
                        res.json({
                            success: true,
                            message: 'Cleanup thủ công đã hoàn thành'
                        });
                    } catch (error) {
                        res.status(500).json({
                            success: false,
                            message: 'Lỗi chạy cleanup thủ công'
                        });
                    }
                });

                app.listen(PORT, HOST, async () => {
                    console.log('🚀 Khởi động Node.js server cho cPanel...');
                    console.log('📋 Đảm bảo file danh_sach_sinh_vien.csv có trong thư mục gốc');
                    console.log(`🌐 Server chạy tại: http://${HOST}:${PORT}`);
                    console.log(`📊 Dashboard (link ẩn): http://${HOST}:${PORT}/dashboard-secret`);
                    
                    // Initialize cleanup manager
                    await initializeCleanup();
                });
            } catch (error) {
                console.error('❌ Lỗi khởi động server:', error);
                process.exit(1);
            }
        }

        startServer();
