/**
 * MODULE QUẢN LÝ DỮ LIỆU SINH VIÊN
 * 
 * Chức năng chính:
 * - Đọc và xử lý dữ liệu sinh viên từ file CSV và Excel
 * - Validate và làm sạch dữ liệu sinh viên
 * - Hỗ trợ tìm kiếm sinh viên theo MSSV hoặc tên
 * - Xử lý trường hợp dữ liệu thiếu hoặc không hợp lệ
 * - Cung cấp interface để load dữ liệu từ nhiều nguồn khác nhau
 * 
 * Các method chính:
 * - loadFromCSV() - Đọc dữ liệu từ file CSV
 * - loadFromExcel() - Đọc dữ liệu từ file Excel
 * - loadStudents() - Load dữ liệu từ file được chỉ định
 * - findStudentByMSSV() - Tìm sinh viên theo MSSV
 * - findStudentByName() - Tìm sinh viên theo tên
 * 
 * Dependencies: fs, csv-parser, xlsx
 * Author: Your Name
 * Version: 1.0.0
 */

const fs = require('fs');
const fsPromises = require('fs').promises;
const path = require('path');
const csv = require('csv-parser');
const XLSX = require('xlsx');

class StudentManager {
    constructor() {
        this.csvFile = 'danh_sach_sinh_vien.csv';
        this.excelFile = 'danh_sach_sinh_vien.xlsx';
        this.students = [];
    }

    async initialize() {
        console.log('🔧 StudentManager đang khởi tạo...');
        console.log('📁 Đường dẫn hiện tại:', process.cwd());
        console.log('📁 File CSV:', path.resolve(this.csvFile));
        console.log('📁 File Excel:', path.resolve(this.excelFile));
        
        await this.loadStudents();
        console.log('✅ StudentManager đã khởi tạo xong');
    }

    async loadStudents() {
        try {
            // Try to load from Excel first
            if (await this.fileExists(this.excelFile)) {
                await this.loadFromExcel();
            } else if (await this.fileExists(this.csvFile)) {
                await this.loadFromCSV();
            } else {
                console.log("Không tìm thấy file danh sách sinh viên. Tạo file mẫu...");
                await this.createSampleCSV();
                this.students = [];
            }
        } catch (error) {
            console.error('Lỗi load students:', error);
            this.students = [];
        }
    }

    async fileExists(filePath) {
        try {
            await fsPromises.access(filePath);
            return true;
        } catch {
            return false;
        }
    }

    async loadFromExcel() {
        try {
            const workbook = XLSX.readFile(this.excelFile);
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const data = XLSX.utils.sheet_to_json(worksheet);

            this.students = [];
            for (const row of data) {
                const mssv = String(row['MSSV'] || '').trim();
                const ten = String(row['Tên Sinh Viên'] || '').trim();
                
                // Bỏ qua dòng trống
                if (!mssv && !ten) {
                    continue;
                }
                
                // Bỏ qua header
                if (mssv === 'MSSV' || ten === 'Tên Sinh Viên') {
                    continue;
                }
                
                // Chấp nhận sinh viên có MSSV hoặc tên (hoặc cả hai)
                if ((mssv || ten) && mssv !== 'nan' && ten !== 'nan') {
                    // Tạo tên mặc định nếu thiếu
                    const finalTen = ten || `Sinh viên ${mssv}`;
                    // Tạo MSSV mặc định nếu thiếu
                    const finalMssv = mssv || `UNKNOWN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    
                    this.students.push({ 
                        mssv: finalMssv, 
                        ten: finalTen 
                    });
                }
            }
            
            console.log(`Đã load ${this.students.length} sinh viên từ file Excel`);
        } catch (error) {
            console.error('Lỗi load từ Excel:', error);
            throw error;
        }
    }

    async loadFromCSV() {
        return new Promise((resolve, reject) => {
            const students = [];
            
            console.log('📁 Đang load file CSV:', this.csvFile);
            console.log('📁 Đường dẫn tuyệt đối:', path.resolve(this.csvFile));
            
            // Kiểm tra file có tồn tại không
            fsPromises.access(this.csvFile)
                .then(() => {
                    console.log('✅ File CSV tồn tại');
                    
                    fs.createReadStream(this.csvFile)
                        .pipe(csv())
                        .on('data', (row) => {
                            const mssv = String(row['MSSV'] || '').trim();
                            const ten = String(row['Tên Sinh Viên'] || '').trim();
                            
                            console.log('📝 Đọc dòng CSV:', { mssv, ten, raw: row });
                            
                            // Kiểm tra dòng trống hoặc không hợp lệ
                            if (!mssv && !ten) {
                                console.log('⏭️ Bỏ qua dòng trống');
                                return;
                            }
                            
                            // Bỏ qua header
                            if (mssv === 'MSSV' || ten === 'Tên Sinh Viên') {
                                console.log('⏭️ Bỏ qua header');
                                return;
                            }
                            
                            // Chấp nhận sinh viên có MSSV hoặc tên (hoặc cả hai)
                            if ((mssv || ten) && mssv !== 'nan' && ten !== 'nan') {
                                // Tạo tên mặc định nếu thiếu
                                const finalTen = ten || `Sinh viên ${mssv}`;
                                // Tạo MSSV mặc định nếu thiếu
                                const finalMssv = mssv || `UNKNOWN_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                                
                                students.push({ 
                                    mssv: finalMssv, 
                                    ten: finalTen 
                                });
                                console.log('✅ Đã thêm sinh viên:', { mssv: finalMssv, ten: finalTen });
                            } else {
                                console.log('❌ Bỏ qua dòng không hợp lệ:', { mssv, ten });
                            }
                        })
                        .on('end', () => {
                            this.students = students;
                            console.log(`✅ Đã load ${this.students.length} sinh viên từ file CSV`);
                            console.log('📊 Danh sách sinh viên:', this.students);
                            resolve();
                        })
                        .on('error', (error) => {
                            console.error('❌ Lỗi load từ CSV:', error);
                            reject(error);
                        });
                })
                .catch((error) => {
                    console.error('❌ File CSV không tồn tại:', error.message);
                    console.log('🔧 Tạo file CSV mẫu...');
                    this.createSampleCSV().then(() => {
                        this.students = [];
                        console.log('⚠️ Đã tạo file CSV mẫu, danh sách sinh viên trống');
                        resolve();
                    }).catch(reject);
                });
        });
    }

    async createSampleCSV() {
        const sampleData = [
            { 'MSSV': 'SV001', 'Tên Sinh Viên': 'Nguyễn Văn A' },
            { 'MSSV': 'SV002', 'Tên Sinh Viên': 'Trần Thị B' },
            { 'MSSV': 'SV003', 'Tên Sinh Viên': 'Lê Văn C' },
            { 'MSSV': 'SV004', 'Tên Sinh Viên': 'Phạm Thị D' },
            { 'MSSV': 'SV005', 'Tên Sinh Viên': 'Hoàng Văn E' },
            { 'MSSV': 'SV006', 'Tên Sinh Viên': 'Vũ Thị F' },
            { 'MSSV': 'SV007', 'Tên Sinh Viên': 'Đặng Văn G' },
            { 'MSSV': 'SV008', 'Tên Sinh Viên': 'Bùi Thị H' },
            { 'MSSV': 'SV009', 'Tên Sinh Viên': 'Phan Văn I' },
            { 'MSSV': 'SV010', 'Tên Sinh Viên': 'Võ Thị K' }
        ];

        try {
            const csvContent = this.convertToCSV(sampleData);
            await fsPromises.writeFile(this.csvFile, csvContent, 'utf8');
            console.log(`Đã tạo file CSV mẫu: ${this.csvFile}`);
        } catch (error) {
            console.error('Lỗi tạo file CSV mẫu:', error);
        }
    }

    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]);
        const csvRows = [headers.join(',')];
        
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                // Escape commas and quotes
                if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
                    return `"${value.replace(/"/g, '""')}"`;
                }
                return value;
            });
            csvRows.push(values.join(','));
        }
        
        return csvRows.join('\n');
    }

    getAllStudents() {
        return this.students;
    }

    getStudentByMSSV(mssv) {
        if (!mssv) return null;
        
        // Debug log
        console.log('🔍 Tìm kiếm MSSV:', mssv);
        console.log('📊 Danh sách sinh viên hiện tại:', this.students);
        
        // Tìm kiếm với trim và case insensitive
        const foundStudent = this.students.find(student => 
            student.mssv && student.mssv.trim().toLowerCase() === mssv.trim().toLowerCase()
        );
        
        console.log('✅ Kết quả tìm kiếm:', foundStudent);
        return foundStudent;
    }

    async addStudent(mssv, ten) {
        try {
            // Check if student already exists
            if (this.getStudentByMSSV(mssv)) {
                return {
                    success: false,
                    message: 'Sinh viên đã tồn tại'
                };
            }

            this.students.push({ mssv, ten });
            await this.saveToCSV();
            
            return {
                success: true,
                message: 'Thêm sinh viên thành công'
            };
        } catch (error) {
            console.error('Lỗi add student:', error);
            return {
                success: false,
                message: 'Lỗi thêm sinh viên'
            };
        }
    }

    async updateStudent(mssv, newData) {
        try {
            const studentIndex = this.students.findIndex(s => s.mssv === mssv);
            if (studentIndex === -1) {
                return {
                    success: false,
                    message: 'Không tìm thấy sinh viên'
                };
            }

            this.students[studentIndex] = { ...this.students[studentIndex], ...newData };
            await this.saveToCSV();
            
            return {
                success: true,
                message: 'Cập nhật sinh viên thành công'
            };
        } catch (error) {
            console.error('Lỗi update student:', error);
            return {
                success: false,
                message: 'Lỗi cập nhật sinh viên'
            };
        }
    }

    async deleteStudent(mssv) {
        try {
            const studentIndex = this.students.findIndex(s => s.mssv === mssv);
            if (studentIndex === -1) {
                return {
                    success: false,
                    message: 'Không tìm thấy sinh viên'
                };
            }

            this.students.splice(studentIndex, 1);
            await this.saveToCSV();
            
            return {
                success: true,
                message: 'Xóa sinh viên thành công'
            };
        } catch (error) {
            console.error('Lỗi delete student:', error);
            return {
                success: false,
                message: 'Lỗi xóa sinh viên'
            };
        }
    }

    async saveToCSV() {
        try {
            const csvContent = this.convertToCSV(this.students);
            await fsPromises.writeFile(this.csvFile, csvContent, 'utf8');
            return true;
        } catch (error) {
            console.error('Lỗi save CSV:', error);
            return false;
        }
    }

    async exportToExcel() {
        try {
            const workbook = XLSX.utils.book_new();
            const worksheet = XLSX.utils.json_to_sheet(this.students);
            XLSX.utils.book_append_sheet(workbook, worksheet, 'Danh sách sinh viên');
            
            const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
            return excelBuffer;
        } catch (error) {
            console.error('Lỗi export Excel:', error);
            return null;
        }
    }
}

module.exports = StudentManager;
