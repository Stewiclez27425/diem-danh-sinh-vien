/**
 * SCRIPT CHÍNH CHO TRANG ĐIỂM DANH SINH VIÊN
 * 
 * Chức năng chính:
 * - Quản lý camera và chụp ảnh điểm danh
 * - Xử lý form submission và validation
 * - Upload ảnh và gửi dữ liệu lên server
 * - Hiển thị thông báo thành công/lỗi
 * - Quản lý theme toggle (light/dark)
 * - Xử lý các sự kiện UI và user interaction
 * 
 * Các function chính:
 * - startCamera() - Khởi động camera
 * - stopCamera() - Dừng camera
 * - capturePhoto() - Chụp ảnh từ camera
 * - retakePhoto() - Chụp lại ảnh
 * - submitAttendance() - Gửi dữ liệu điểm danh
 * - showSuccessModal() - Hiển thị modal thành công
 * - showError() - Hiển thị thông báo lỗi
 * 
 * Dependencies: WebRTC API, Fetch API, Bootstrap Modal
 * Author: Your Name
 * Version: 1.0.0
 */

// Biến toàn cục
let stream = null;
let capturedImageData = null;
let currentCameraIndex = 0;
let availableCameras = [];

// DOM Elements
const form = document.getElementById('attendanceForm');
const mssvInput = document.getElementById('mssv');
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const capturedImage = document.getElementById('capturedImage');
const cameraContainer = document.getElementById('cameraContainer');
const cameraPlaceholder = document.getElementById('cameraPlaceholder');
const startCameraBtn = document.getElementById('startCamera');
const switchCameraBtn = document.getElementById('switchCamera');
const capturePhotoBtn = document.getElementById('capturePhoto');
const retakePhotoBtn = document.getElementById('retakePhoto');
const submitBtn = document.getElementById('submitBtn');
const loading = document.querySelector('.loading');
const successModal = new bootstrap.Modal(document.getElementById('successModal'));
const successMessage = document.getElementById('successMessage');
const successTime = document.getElementById('successTime');

// Event Listeners
document.addEventListener('DOMContentLoaded', function() {
    startCameraBtn.addEventListener('click', startCamera);
    switchCameraBtn.addEventListener('click', switchCamera);
    capturePhotoBtn.addEventListener('click', capturePhoto);
    retakePhotoBtn.addEventListener('click', retakePhoto);
    form.addEventListener('submit', handleSubmit);
});

// Lấy danh sách camera có sẵn
async function getAvailableCameras() {
    try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        availableCameras = devices.filter(device => device.kind === 'videoinput');
        return availableCameras;
    } catch (error) {
        console.error('Lỗi khi lấy danh sách camera:', error);
        return [];
    }
}

// Bật camera
async function startCamera() {
    try {
        // Lấy danh sách camera nếu chưa có
        if (availableCameras.length === 0) {
            await getAvailableCameras();
        }
        
        // Cấu hình camera
        const constraints = {
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 }
            }
        };
        
        // Nếu có nhiều camera, sử dụng camera đầu tiên (thường là camera trước)
        if (availableCameras.length > 0) {
            constraints.video.deviceId = { exact: availableCameras[currentCameraIndex].deviceId };
        } else {
            // Fallback: sử dụng camera trước
            constraints.video.facingMode = 'user';
        }
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        
        video.srcObject = stream;
        video.style.display = 'block';
        cameraPlaceholder.style.display = 'none';
        startCameraBtn.style.display = 'none';
        capturePhotoBtn.style.display = 'inline-block';
        
        // Hiển thị nút chuyển camera nếu có nhiều hơn 1 camera
        if (availableCameras.length > 1) {
            switchCameraBtn.style.display = 'inline-block';
        }
        
        // Hiển thị thông báo thành công
        showAlert('Camera đã được bật thành công!', 'success');
        
    } catch (error) {
        console.error('Lỗi khi bật camera:', error);
        showAlert('Không thể truy cập camera. Vui lòng kiểm tra quyền truy cập.', 'danger');
    }
}

// Chuyển camera
async function switchCamera() {
    if (availableCameras.length <= 1) {
        showAlert('Chỉ có 1 camera khả dụng', 'warning');
        return;
    }
    
    try {
        // Dừng camera hiện tại
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        
        // Chuyển sang camera tiếp theo
        currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
        
        // Cấu hình camera mới
        const constraints = {
            video: { 
                width: { ideal: 640 },
                height: { ideal: 480 },
                deviceId: { exact: availableCameras[currentCameraIndex].deviceId }
            }
        };
        
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        
        // Cập nhật text nút chuyển camera
        const cameraLabel = availableCameras[currentCameraIndex].label || `Camera ${currentCameraIndex + 1}`;
        switchCameraBtn.innerHTML = `<i class="fas fa-sync-alt me-2"></i>Đổi Camera (${cameraLabel})`;
        
        showAlert(`Đã chuyển sang ${cameraLabel}`, 'success');
        
    } catch (error) {
        console.error('Lỗi khi chuyển camera:', error);
        showAlert('Không thể chuyển camera. Vui lòng thử lại.', 'danger');
    }
}

// Chụp ảnh
function capturePhoto() {
    const context = canvas.getContext('2d');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Vẽ frame hiện tại lên canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Chuyển canvas thành blob
    canvas.toBlob(function(blob) {
        capturedImageData = blob;
        
        // Hiển thị ảnh đã chụp
        const imageUrl = URL.createObjectURL(blob);
        capturedImage.src = imageUrl;
        capturedImage.style.display = 'block';
        video.style.display = 'none';
        
        // Ẩn nút chụp, hiện nút chụp lại
        capturePhotoBtn.style.display = 'none';
        retakePhotoBtn.style.display = 'inline-block';
        
        // Dừng camera
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            stream = null;
        }
        
        showAlert('Ảnh đã được chụp thành công!', 'success');
    }, 'image/jpeg', 0.8);
}

// Chụp lại ảnh
function retakePhoto() {
    // Reset UI
    capturedImage.style.display = 'none';
    capturedImageData = null;
    retakePhotoBtn.style.display = 'none';
    startCameraBtn.style.display = 'inline-block';
    cameraPlaceholder.style.display = 'block';
    
    // Bật lại camera
    startCamera();
}

// Xử lý submit form
async function handleSubmit(e) {
    e.preventDefault();
    
    const mssv = mssvInput.value.trim();
    
    // Kiểm tra dữ liệu đầu vào
    if (!mssv) {
        showAlert('Vui lòng nhập MSSV', 'danger');
        return;
    }
    
    if (!capturedImageData) {
        showAlert('Vui lòng chụp ảnh chứng minh', 'danger');
        return;
    }
    
    // Hiển thị loading
    showLoading(true);
    
    try {
        // Tạo FormData để gửi file
        const formData = new FormData();
        formData.append('mssv', mssv);
        formData.append('hinhAnh', capturedImageData, 'photo.jpg');
        
        // Gửi request đến Node.js server
        const response = await fetch('/api/diem-danh', {
            method: 'POST',
            body: formData
        });
        
        const result = await response.json();
        
        if (result.success) {
            // Hiển thị modal thành công
            successMessage.textContent = result.message;
            successTime.textContent = `Thời gian: ${result.data.thoiGian}`;
            successModal.show();
            
            // Reset form
            resetForm();
            
        } else {
            showAlert(result.message, 'danger');
        }
        
    } catch (error) {
        console.error('Lỗi khi gửi dữ liệu:', error);
        showAlert('Lỗi kết nối. Vui lòng thử lại.', 'danger');
    } finally {
        showLoading(false);
    }
}

// Reset form về trạng thái ban đầu
function resetForm() {
    form.reset();
    capturedImageData = null;
    capturedImage.style.display = 'none';
    video.style.display = 'none';
    cameraPlaceholder.style.display = 'block';
    startCameraBtn.style.display = 'inline-block';
    switchCameraBtn.style.display = 'none';
    capturePhotoBtn.style.display = 'none';
    retakePhotoBtn.style.display = 'none';
    
    // Reset camera index về 0
    currentCameraIndex = 0;
    
    // Dừng camera nếu đang chạy
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
        stream = null;
    }
}

// Hiển thị loading
function showLoading(show) {
    if (show) {
        loading.style.display = 'block';
        submitBtn.disabled = true;
    } else {
        loading.style.display = 'none';
        submitBtn.disabled = false;
    }
}

// Hiển thị thông báo
function showAlert(message, type) {
    // Xóa alert cũ nếu có
    const existingAlert = document.querySelector('.alert');
    if (existingAlert) {
        existingAlert.remove();
    }
    
    // Tạo alert mới
    const alertDiv = document.createElement('div');
    alertDiv.className = `alert alert-${type} alert-dismissible fade show`;
    alertDiv.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;
    
    // Thêm vào form
    form.insertBefore(alertDiv, form.firstChild);
    
    // Tự động ẩn sau 5 giây
    setTimeout(() => {
        if (alertDiv.parentNode) {
            alertDiv.remove();
        }
    }, 5000);
}

// Xử lý khi đóng modal thành công
document.getElementById('successModal').addEventListener('hidden.bs.modal', function() {
    resetForm();
});

// Kiểm tra hỗ trợ camera
if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    showAlert('Trình duyệt không hỗ trợ camera. Vui lòng sử dụng trình duyệt khác.', 'danger');
    startCameraBtn.disabled = true;
}


