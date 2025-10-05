// Script để sửa lỗi JSON và kiểm tra tính hợp lệ
const fs = require('fs');

function fixJSONFile(filePath) {
    try {
        console.log('🔍 Checking JSON file...');
        
        // Đọc file như text
        const fileContent = fs.readFileSync(filePath, 'utf8');
        console.log(`📄 File size: ${fileContent.length} characters`);
        
        // Kiểm tra xem có dấu phẩy thừa không
        const lines = fileContent.split('\n');
        console.log(`📄 Total lines: ${lines.length}`);
        
        // Tìm dấu phẩy thừa ở cuối object cuối cùng
        let fixedContent = fileContent;
        
        // Pattern để tìm dấu phẩy thừa trước dấu ]
        const trailingCommaPattern = /,(\s*\]\s*)$/;
        if (trailingCommaPattern.test(fixedContent)) {
            console.log('⚠️ Found trailing comma before closing bracket');
            fixedContent = fixedContent.replace(trailingCommaPattern, '$1');
            console.log('✅ Fixed trailing comma');
        }
        
        // Kiểm tra xem có dấu phẩy thừa trong object cuối cùng không
        const lastObjectPattern = /,(\s*}\s*,?\s*\]\s*)$/;
        if (lastObjectPattern.test(fixedContent)) {
            console.log('⚠️ Found trailing comma in last object');
            fixedContent = fixedContent.replace(lastObjectPattern, '$1');
            console.log('✅ Fixed trailing comma in last object');
        }
        
        // Thử parse JSON
        try {
            const data = JSON.parse(fixedContent);
            console.log(`✅ JSON is valid after fix, records: ${data.length}`);
            
            // Nếu có thay đổi, ghi lại file
            if (fixedContent !== fileContent) {
                fs.writeFileSync(filePath, fixedContent, 'utf8');
                console.log('💾 File has been fixed and saved');
            } else {
                console.log('✅ No fixes needed');
            }
            
            return data;
        } catch (parseError) {
            console.log('❌ JSON still invalid after fix:', parseError.message);
            return null;
        }
        
    } catch (error) {
        console.log('❌ Error reading file:', error.message);
        return null;
    }
}

// Chạy sửa lỗi
console.log('🚀 Starting JSON fix process...\n');
const data = fixJSONFile('logs/diem_danh_log.json');

if (data) {
    console.log('\n📊 Current data:');
    data.forEach((record, index) => {
        console.log(`${index + 1}. ${record.ten} (${record.mssv}) - ${record.thoiGian}`);
    });
    
    console.log(`\n✅ Total records: ${data.length}`);
} else {
    console.log('\n❌ Failed to fix JSON file');
}




