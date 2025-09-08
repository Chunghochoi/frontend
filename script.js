document.addEventListener('DOMContentLoaded', () => {
    // URL của backend server trên Render.com
    // ĐẢM BẢO BẠN THAY THẾ CHỖ NÀY BẰNG URL BACKEND CỦA BẠN TRÊN RENDER
    const API_URL = 'https://coursehub-backend-9cn8.onrender.com'; 

    let currentUser = null; // Biến lưu trữ thông tin người dùng hiện tại

    // --- KHỞI TẠO CÁC CHỨC NĂNG KHI TRANG TẢI XONG ---
    initializeBackgroundAnimation(); // Khởi tạo hiệu ứng nền
    setupEventListeners();          // Thiết lập các sự kiện cho nút bấm, form
    updateUIForLoggedInUser();      // Cập nhật giao diện người dùng (đăng nhập/chưa đăng nhập)
    loadCourses();                  // Tải danh sách khóa học

    // --- TẢI DỮ LIỆU KHÓA HỌC TỪ BACKEND ---
    async function loadCourses() {
        try {
            const response = await fetch(`${API_URL}/api/courses`);
            if (!response.ok) throw new Error('Network response was not ok');
            const courses = await response.json();

            const courseGrid = document.getElementById('courseGrid');
            const recentGrid = document.getElementById('recentCourses');
            
            // Xóa nội dung cũ trước khi thêm mới
            courseGrid.innerHTML = ''; 
            recentGrid.innerHTML = '';

            // Tải các khóa học nổi bật (ví dụ: sắp xếp theo lượt xem giảm dần)
            const hotCourses = [...courses].sort((a, b) => b.views - a.views);
            hotCourses.forEach(course => courseGrid.appendChild(createCourseCard(course)));

            // Tải 4 khóa học mới nhất (ví dụ: sắp xếp theo ID giảm dần)
            const recentCourses = [...courses].sort((a, b) => b.id - a.id).slice(0, 4);
            recentCourses.forEach(course => recentGrid.appendChild(createCourseCard(course)));

        } catch (error) {
            console.error('Lỗi khi tải khóa học:', error);
            showNotification('Không thể tải danh sách khóa học. Vui lòng thử lại sau.', 'error');
        }
    }

    // --- TẠO THẺ KHÓA HỌC (UI) ---
    function createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'course-card cursor-pointer';
        card.dataset.courseId = course.id;

        const isAdmin = currentUser && currentUser.role === 'ADMIN';
        const isOwner = currentUser && currentUser.id === course.ownerId;

        card.innerHTML = `
            <div class="course-image">
                <i class="${course.icon}" style="z-index: 1; position: relative;"></i>
            </div>
            <div class="course-content">
                <h3 class="course-title">${course.title}</h3>
                <p class="course-author">by @${course.author}</p>
                <div class="course-stats">
                    <span><i class="fas fa-eye"></i> ${course.views.toLocaleString()}</span>
                    <span class="course-category">${course.category}</span>
                </div>
            </div>
            ${(isAdmin || isOwner) ? `
            <div class="course-actions">
                ${isOwner ? `<button class="action-btn edit-btn cursor-pointer" title="Chỉnh sửa"><i class="fas fa-edit"></i></button>` : ''}
                ${(isAdmin || isOwner) ? `<button class="action-btn delete-btn cursor-delete" title="Xóa khóa học"><i class="fas fa-trash"></i></button>` : ''}
                ${isAdmin && !isOwner ? `<button class="action-btn admin-btn cursor-admin" title="Quản lý Admin"><i class="fas fa-crown"></i></button>` : ''}
            </div>` : ''}
            ${isOwner ? `<div class="user-badge owner-badge"><i class="fas fa-user"></i> Của bạn</div>` : ''}
            ${isAdmin && !isOwner ? `<div class="user-badge admin-badge"><i class="fas fa-shield-alt"></i> ADMIN</div>` : ''}
        `;

        card.addEventListener('click', (e) => {
            // Ngăn chặn chuyển hướng khi click vào các nút actions
            if (e.target.closest('.action-btn')) {
                return; 
            }
            // Logic xử lý khi nhấp vào thẻ khóa học (ví dụ: chuyển đến trang chi tiết khóa học)
            showNotification(`Đang chuyển hướng đến khóa học: ${course.title}`, 'info');
            // window.location.href = course.link; // Nếu có link chi tiết
        });
        
        return card;
    }

    // --- CẬP NHẬT GIAO DIỆN DỰA TRÊN TRẠNG THÁI ĐĂNG NHẬP ---
    function updateUIForLoggedInUser() {
        const userActionsDiv = document.getElementById('user-actions');
        if (currentUser) {
            // Nếu đã đăng nhập, hiển thị tên người dùng và nút đăng xuất
            const isAdmin = currentUser.role === 'ADMIN';
            userActionsDiv.innerHTML = `
                <button class="btn btn-secondary ${isAdmin ? 'cursor-admin' : 'cursor-pointer'}" id="userBtn">
                    <i class="fas ${isAdmin ? 'fa-crown' : 'fa-user-circle'}"></i> ${currentUser.username}
                </button>
                <button class="btn btn-secondary cursor-pointer" id="logoutBtn" title="Đăng xuất">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;
            document.getElementById('logoutBtn').addEventListener('click', () => {
                currentUser = null; // Xóa thông tin người dùng
                updateUIForLoggedInUser(); // Cập nhật lại UI
                loadCourses(); // Tải lại khóa học để ẩn các nút quản lý nếu có
                showNotification('Đã đăng xuất thành công!', 'info');
            });
        } else {
            // Nếu chưa đăng nhập, hiển thị nút "Đăng nhập"
            userActionsDiv.innerHTML = `
                <button class="btn btn-secondary cursor-pointer" id="loginBtn">
                    <i class="fas fa-sign-in-alt"></i> Đăng nhập
                </button>
            `;
            document.getElementById('loginBtn').addEventListener('click', () => {
                document.getElementById('authModal').style.display = 'flex'; // Mở modal đăng nhập
            });
        }
    }


    // --- THIẾT LẬP CÁC LẮNG NGHE SỰ KIỆN ---
    function setupEventListeners() {
        // Mở modal đăng nhập (nếu nút "Đăng nhập" tồn tại ban đầu)
        const initialLoginBtn = document.getElementById('loginBtn');
        if (initialLoginBtn) {
            initialLoginBtn.addEventListener('click', () => {
                document.getElementById('authModal').style.display = 'flex';
            });
        }
        
        // Mở modal tải lên khóa học
        document.getElementById('uploadBtn').addEventListener('click', () => {
            document.getElementById('uploadModal').style.display = 'flex';
        });

        // Đóng modal đăng nhập
        document.getElementById('closeAuthModal').addEventListener('click', () => {
            document.getElementById('authModal').style.display = 'none';
        });
        document.getElementById('authModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) { // Chỉ đóng khi click vào nền modal, không phải nội dung
                e.currentTarget.style.display = 'none';
            }
        });

        // Đóng modal tải lên
        document.getElementById('closeUploadModal').addEventListener('click', () => {
            document.getElementById('uploadModal').style.display = 'none';
        });
        document.getElementById('uploadModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) { 
                e.currentTarget.style.display = 'none';
            }
        });

        // Xử lý form đăng nhập
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault(); // Ngăn chặn tải lại trang
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML; // Lưu trữ trạng thái ban đầu của nút
            
            // Hiển thị trạng thái đang tải
            btn.innerHTML = '<div class="loading"></div> Đang xử lý...';
            btn.disabled = true; // Vô hiệu hóa nút để tránh gửi nhiều lần

            const email = e.target.querySelector('input[type="email"]').value; // Lấy email từ input

            try {
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email }) // Gửi email lên backend
                });
                const data = await response.json(); // Phân tích phản hồi JSON

                if (!response.ok) { // Nếu backend trả về lỗi (ví dụ: 401 Unauthorized)
                    throw new Error(data.message || 'Đăng nhập thất bại.');
                }

                currentUser = data.user; // Cập nhật thông tin người dùng
                btn.innerHTML = '<i class="fas fa-check"></i> Thành công!';
                btn.style.background = 'linear-gradient(45deg, #28a745, #20c997)'; // Nút xanh lá

                // Đóng modal và hiển thị thông báo thành công sau 1.5 giây
                setTimeout(() => {
                    document.getElementById('authModal').style.display = 'none';
                    showNotification(`Chào mừng ${currentUser.role === 'ADMIN' ? 'Admin' : 'bạn'} trở lại!`, 'success');
                    updateUIForLoggedInUser(); // Cập nhật lại giao diện người dùng
                    loadCourses(); // Tải lại danh sách khóa học để hiển thị/ẩn các nút quản lý
                }, 1500);

            } catch (error) {
                showNotification(error.message, 'error'); // Hiển thị thông báo lỗi
            } finally {
                 // Khôi phục nút bấm sau 2 giây
                 setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    btn.style.background = ''; // Xóa style background tùy chỉnh
                }, 2000);
            }
        });

        // Toggle theme (sáng/tối)
        document.getElementById('themeToggle').addEventListener('click', function() {
            document.body.classList.toggle('light-theme');
            // Thay đổi icon dựa trên theme hiện tại
            this.querySelector('i').className = document.body.classList.contains('light-theme') ? 'fas fa-sun' : 'fas fa-moon';
        });

        // Search functionality (hiện tại chỉ là placeholder)
        document.getElementById('searchInput').addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase();
            console.log('Searching for:', searchTerm);
            // TODO: Triển khai logic lọc khóa học hoặc gọi API tìm kiếm
            // Ví dụ: loadCourses(searchTerm);
        });

        // Hotkeys
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
        });
    }

    // --- CÁC HÀM TIỆN ÍCH KHÁC ---

    // Hiển thị thông báo (notification)
    function showNotification(message, type = 'info') {
        const notificationContainer = document.getElementById('notification-container') || document.body;
        const colors = {
            success: 'var(--accent-green)',
            error: '#ff4757',
            info: 'var(--accent-neon)'
        };
        const icon = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.borderColor = colors[type];
        notification.innerHTML = `
            <i class="${icon[type]}" style="color: ${colors[type]};"></i>
            <span>${message}</span>
        `;
        notificationContainer.appendChild(notification); // Thêm vào container

        setTimeout(() => notification.remove(), 4000); // Tự động xóa sau 4 giây
    }
    
    // Hiệu ứng hình nền động
    function initializeBackgroundAnimation() {
        const bgAnimation = document.getElementById('bgAnimation');
        if (!bgAnimation) return;

        const numDots = 50;
        for (let i = 0; i < numDots; i++) {
            const dot = document.createElement('div');
            dot.className = 'dot';
            const size = Math.random() * 8 + 2; // Kích thước từ 2px đến 10px
            dot.style.width = `${size}px`;
            dot.style.height = `${size}px`;
            dot.style.left = `${Math.random() * 100}%`;
            dot.style.top = `${Math.random() * 100}%`;
            dot.style.animationDelay = `${Math.random() * 10}s`;
            
            // Randomize end position for each dot
            dot.style.setProperty('--x-end', `${(Math.random() - 0.5) * 200}px`);
            dot.style.setProperty('--y-end', `${(Math.random() - 0.5) * 200}px`);

            bgAnimation.appendChild(dot);
        }
    }
});