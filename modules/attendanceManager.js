const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const moment = require('moment-timezone');

class AttendanceManager {
    constructor() {
        this.logFile = 'logs/diem_danh_log.json';
        this.logs = [];
    }

    async initialize() {
        await this.loadLogs();
    }

    async loadLogs() {
        try {
            const data = await fsPromises.readFile(this.logFile, 'utf8');
            this.logs = JSON.parse(data);
        } catch (error) {
            // Create empty logs if file doesn't exist
            this.logs = [];
            await this.saveLogs();
        }
    }

    async saveLogs() {
        try {
            await fsPromises.mkdir(path.dirname(this.logFile), { recursive: true });
            await fsPromises.writeFile(this.logFile, JSON.stringify(this.logs, null, 2), 'utf8');
            return true;
        } catch (error) {
            console.error('Lỗi save logs:', error);
            return false;
        }
    }

    async saveAttendance(attendanceData) {
        try {
            this.logs.push(attendanceData);
            return await this.saveLogs();
        } catch (error) {
            console.error('Lỗi save attendance:', error);
            return false;
        }
    }

    async checkAlreadyAttended(mssv) {
        try {
            const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
            
            return this.logs.some(log => 
                log.mssv === mssv && log.ngay === today
            );
        } catch (error) {
            console.error('Lỗi check already attended:', error);
            return false;
        }
    }

    async getAttendanceLogs(selectedDate = null) {
        try {
            if (selectedDate) {
                return this.logs.filter(log => log.ngay === selectedDate);
            }
            return this.logs;
        } catch (error) {
            console.error('Lỗi get attendance logs:', error);
            return [];
        }
    }

    async getAttendanceSummary(selectedDate = null) {
        try {
            let logs = this.logs;
            
            if (selectedDate) {
                logs = logs.filter(log => log.ngay === selectedDate);
            }

            // Get unique students who attended
            const attendedStudents = new Set();
            const attendanceDetails = {};

            for (const log of logs) {
                const mssv = log.mssv;
                attendedStudents.add(mssv);
                attendanceDetails[mssv] = {
                    ten: log.ten,
                    thoiGian: log.thoiGian,
                    hinhAnh: log.hinhAnh,
                    ip: log.ip
                };
            }

            // Get all students from student list (this would need to be passed in or loaded)
            // For now, we'll use the attended students as the total
            const totalStudents = attendedStudents.size;
            const attendedCount = attendedStudents.size;
            const notAttendedCount = 0; // This would be calculated with actual student list
            const attendanceRate = totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100 * 10) / 10 : 0;

            return {
                total_students: totalStudents,
                attended_count: attendedCount,
                not_attended_count: notAttendedCount,
                attendance_rate: attendanceRate,
                attended_students: Array.from(attendedStudents),
                not_attended_students: [],
                attendance_details: attendanceDetails,
                selected_date: selectedDate
            };
        } catch (error) {
            console.error('Lỗi get attendance summary:', error);
            return {
                total_students: 0,
                attended_count: 0,
                not_attended_count: 0,
                attendance_rate: 0,
                attended_students: [],
                not_attended_students: [],
                attendance_details: {},
                selected_date: selectedDate
            };
        }
    }

    async getAttendanceSummaryWithStudentList(studentList, selectedDate = null) {
        try {
            let logs = this.logs;
            
            if (selectedDate) {
                logs = logs.filter(log => log.ngay === selectedDate);
            }

            // Get unique students who attended
            const attendedStudents = new Set();
            const attendanceDetails = {};

            for (const log of logs) {
                const mssv = log.mssv;
                attendedStudents.add(mssv);
                attendanceDetails[mssv] = {
                    ten: log.ten,
                    thoiGian: log.thoiGian,
                    hinhAnh: log.hinhAnh,
                    ip: log.ip
                };
            }

            // Get all students from student list and create a map for quick lookup
            const studentMap = new Map();
            studentList.forEach(student => {
                studentMap.set(student.mssv, student);
            });

            // Get attended students with full info from student list
            const attendedStudentsWithInfo = [];
            const notAttendedStudents = [];

            for (const student of studentList) {
                if (attendedStudents.has(student.mssv)) {
                    // Student attended - use info from attendance log
                    attendedStudentsWithInfo.push({
                        mssv: student.mssv,
                        ten: attendanceDetails[student.mssv].ten || student.ten,
                        thoiGian: attendanceDetails[student.mssv].thoiGian,
                        hinhAnh: attendanceDetails[student.mssv].hinhAnh,
                        ip: attendanceDetails[student.mssv].ip
                    });
                } else {
                    // Student not attended
                    notAttendedStudents.push({
                        mssv: student.mssv,
                        ten: student.ten
                    });
                }
            }

            const totalStudents = studentList.length;
            const attendedCount = attendedStudentsWithInfo.length;
            const notAttendedCount = notAttendedStudents.length;
            const attendanceRate = totalStudents > 0 ? Math.round((attendedCount / totalStudents) * 100 * 10) / 10 : 0;

            return {
                total_students: totalStudents,
                attended_count: attendedCount,
                not_attended_count: notAttendedCount,
                attendance_rate: attendanceRate,
                attended_students: attendedStudentsWithInfo,
                not_attended_students: notAttendedStudents,
                attendance_details: attendanceDetails,
                selected_date: selectedDate
            };
        } catch (error) {
            console.error('Lỗi get attendance summary with student list:', error);
            return {
                total_students: 0,
                attended_count: 0,
                not_attended_count: 0,
                attendance_rate: 0,
                attended_students: [],
                not_attended_students: [],
                attendance_details: {},
                selected_date: selectedDate
            };
        }
    }

    async getAttendanceByDateRange(startDate, endDate) {
        try {
            return this.logs.filter(log => {
                const logDate = moment(log.ngay, 'YYYY-MM-DD');
                const start = moment(startDate, 'YYYY-MM-DD');
                const end = moment(endDate, 'YYYY-MM-DD');
                return logDate.isBetween(start, end, 'day', '[]');
            });
        } catch (error) {
            console.error('Lỗi get attendance by date range:', error);
            return [];
        }
    }

    async getAttendanceStats() {
        try {
            const totalLogs = this.logs.length;
            const today = moment().tz('Asia/Ho_Chi_Minh').format('YYYY-MM-DD');
            const todayLogs = this.logs.filter(log => log.ngay === today);
            
            // Get unique students by date
            const dailyStats = {};
            for (const log of this.logs) {
                const date = log.ngay;
                if (!dailyStats[date]) {
                    dailyStats[date] = new Set();
                }
                dailyStats[date].add(log.mssv);
            }

            const uniqueDates = Object.keys(dailyStats).length;
            const averageDailyAttendance = uniqueDates > 0 ? Math.round((totalLogs / uniqueDates) * 10) / 10 : 0;

            return {
                total_attendance_records: totalLogs,
                today_attendance: todayLogs.length,
                unique_dates: uniqueDates,
                average_daily_attendance: averageDailyAttendance,
                last_attendance: this.logs.length > 0 ? this.logs[this.logs.length - 1].thoiGian : null
            };
        } catch (error) {
            console.error('Lỗi get attendance stats:', error);
            return {
                total_attendance_records: 0,
                today_attendance: 0,
                unique_dates: 0,
                average_daily_attendance: 0,
                last_attendance: null
            };
        }
    }

    async exportAttendanceData(format = 'json', selectedDate = null) {
        try {
            let data = this.logs;
            
            if (selectedDate) {
                data = data.filter(log => log.ngay === selectedDate);
            }

            if (format === 'json') {
                return JSON.stringify(data, null, 2);
            } else if (format === 'csv') {
                if (data.length === 0) return '';
                
                const headers = ['MSSV', 'Tên', 'Thời gian', 'IP', 'Hình ảnh', 'Ngày'];
                const csvRows = [headers.join(',')];
                
                for (const log of data) {
                    const values = [
                        log.mssv,
                        `"${log.ten}"`,
                        log.thoiGian,
                        log.ip,
                        log.hinhAnh,
                        log.ngay
                    ];
                    csvRows.push(values.join(','));
                }
                
                return csvRows.join('\n');
            }
            
            return null;
        } catch (error) {
            console.error('Lỗi export attendance data:', error);
            return null;
        }
    }

    async deleteAttendanceRecord(recordId) {
        try {
            const index = this.logs.findIndex(log => log.id === recordId);
            if (index === -1) {
                return {
                    success: false,
                    message: 'Không tìm thấy bản ghi'
                };
            }

            this.logs.splice(index, 1);
            await this.saveLogs();
            
            return {
                success: true,
                message: 'Xóa bản ghi thành công'
            };
        } catch (error) {
            console.error('Lỗi delete attendance record:', error);
            return {
                success: false,
                message: 'Lỗi xóa bản ghi'
            };
        }
    }
}

module.exports = AttendanceManager;
