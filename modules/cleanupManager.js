/**
 * CLEANUP MANAGER - QUẢN LÝ TỰ ĐỘNG XÓA HÌNH ẢNH SAU 48 GIỜ
 * 
 * Chức năng chính:
 * - Tự động xóa hình ảnh điểm danh sau 48 giờ
 * - Cập nhật log để xóa đường dẫn hình ảnh
 * - Quản lý bộ nhớ và tránh tràn dung lượng
 * - Chạy định kỳ mỗi giờ để kiểm tra
 * 
 * Tính năng:
 * - Xóa file hình ảnh cũ hơn 48 giờ
 * - Cập nhật diem_danh_log.json
 * - Hiển thị ảnh mặc định trong dashboard
 * - Logging chi tiết quá trình cleanup
 * 
 * Dependencies: fs, path, moment
 * Author: Your Name
 * Version: 1.0.0
 */

const fs = require('fs');
const path = require('path');
const moment = require('moment-timezone');

class CleanupManager {
    constructor() {
        this.logPath = path.join(__dirname, '..', 'logs', 'diem_danh_log.json');
        this.uploadsPath = path.join(__dirname, '..', 'uploads');
        this.cleanupInterval = null;
        this.cleanupThresholdHours = 48; // 48 giờ
    }

    /**
     * Khởi tạo cleanup manager
     */
    async initialize() {
        try {
            console.log('🧹 Khởi tạo CleanupManager...');
            
            // Đảm bảo thư mục uploads tồn tại
            if (!fs.existsSync(this.uploadsPath)) {
                fs.mkdirSync(this.uploadsPath, { recursive: true });
            }
            
            // Chạy cleanup ngay lập tức
            await this.performCleanup();
            
            // Thiết lập lịch trình chạy mỗi giờ
            this.startScheduledCleanup();
            
            console.log('✅ CleanupManager đã được khởi tạo');
        } catch (error) {
            console.error('❌ Lỗi khởi tạo CleanupManager:', error);
        }
    }

    /**
     * Bắt đầu lịch trình cleanup tự động
     */
    startScheduledCleanup() {
        // Chạy mỗi giờ (3600000 ms)
        this.cleanupInterval = setInterval(async () => {
            try {
                console.log('🕐 Chạy cleanup tự động...');
                await this.performCleanup();
            } catch (error) {
                console.error('❌ Lỗi trong cleanup tự động:', error);
            }
        }, 60 * 60 * 1000); // 1 giờ

        console.log('⏰ Đã thiết lập lịch trình cleanup mỗi giờ');
    }

    /**
     * Dừng lịch trình cleanup
     */
    stopScheduledCleanup() {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('⏹️ Đã dừng lịch trình cleanup');
        }
    }

    /**
     * Thực hiện cleanup
     */
    async performCleanup() {
        try {
            console.log('🧹 Bắt đầu quá trình cleanup...');
            
            const cutoffTime = moment().subtract(this.cleanupThresholdHours, 'hours');
            console.log(`📅 Xóa dữ liệu cũ hơn: ${cutoffTime.format('YYYY-MM-DD HH:mm:ss')}`);
            
            // Đọc log hiện tại
            const logData = await this.readLogData();
            if (!logData || logData.length === 0) {
                console.log('📝 Không có dữ liệu log để cleanup');
                return;
            }

            let cleanedCount = 0;
            let updatedLogs = [];

            // Xử lý từng bản ghi
            for (const record of logData) {
                const recordTime = moment(record.thoiGian, 'YYYY-MM-DD HH:mm:ss');
                
                if (recordTime.isBefore(cutoffTime)) {
                    // Bản ghi cũ hơn 48 giờ
                    if (record.hinhAnh && record.hinhAnh.trim() !== '') {
                        // Xóa file hình ảnh
                        const imagePath = path.join(__dirname, '..', record.hinhAnh);
                        await this.deleteImageFile(imagePath);
                        
                        // Cập nhật bản ghi để xóa đường dẫn hình ảnh
                        record.hinhAnh = '';
                        cleanedCount++;
                        
                        console.log(`🗑️ Đã xóa hình ảnh cho ${record.mssv} - ${record.ten}`);
                    }
                }
                
                updatedLogs.push(record);
            }

            // Lưu log đã cập nhật
            if (cleanedCount > 0) {
                await this.saveLogData(updatedLogs);
                console.log(`✅ Cleanup hoàn thành: ${cleanedCount} hình ảnh đã được xóa`);
            } else {
                console.log('✅ Không có hình ảnh nào cần xóa');
            }

        } catch (error) {
            console.error('❌ Lỗi trong quá trình cleanup:', error);
        }
    }

    /**
     * Đọc dữ liệu log
     */
    async readLogData() {
        try {
            if (!fs.existsSync(this.logPath)) {
                return [];
            }
            
            const data = fs.readFileSync(this.logPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            console.error('❌ Lỗi đọc log data:', error);
            return [];
        }
    }

    /**
     * Lưu dữ liệu log
     */
    async saveLogData(data) {
        try {
            fs.writeFileSync(this.logPath, JSON.stringify(data, null, 2), 'utf8');
            console.log('💾 Đã lưu log data sau cleanup');
        } catch (error) {
            console.error('❌ Lỗi lưu log data:', error);
        }
    }

    /**
     * Xóa file hình ảnh
     */
    async deleteImageFile(imagePath) {
        try {
            if (fs.existsSync(imagePath)) {
                fs.unlinkSync(imagePath);
                console.log(`🗑️ Đã xóa file: ${path.basename(imagePath)}`);
                return true;
            }
        } catch (error) {
            console.error(`❌ Lỗi xóa file ${imagePath}:`, error);
        }
        return false;
    }

    /**
     * Kiểm tra xem hình ảnh có còn hợp lệ không (dựa trên thời gian)
     */
    isImageValid(attendanceTime) {
        if (!attendanceTime) return false;
        
        const recordTime = moment(attendanceTime, 'YYYY-MM-DD HH:mm:ss');
        const cutoffTime = moment().subtract(this.cleanupThresholdHours, 'hours');
        
        return recordTime.isAfter(cutoffTime);
    }

    /**
     * Lấy đường dẫn hình ảnh mặc định
     */
    getDefaultImagePath() {
        return '/static/default-avatar.png';
    }

    /**
     * Lấy thông tin cleanup
     */
    getCleanupInfo() {
        return {
            thresholdHours: this.cleanupThresholdHours,
            isRunning: this.cleanupInterval !== null,
            nextCleanup: this.cleanupInterval ? 'Mỗi giờ' : 'Không chạy'
        };
    }

    /**
     * Chạy cleanup thủ công
     */
    async manualCleanup() {
        console.log('🔧 Chạy cleanup thủ công...');
        await this.performCleanup();
    }
}

module.exports = CleanupManager;
