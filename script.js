document.addEventListener('DOMContentLoaded', () => {
    // URL của backend server (thay bằng URL của bạn trên Render.com)
    const API_URL = 'https://coursehub-backend-9cn8.onrender.com'; // Hoặc 'https://your-backend-name.onrender.com'

    let currentUser = null;

    // --- KHỞI TẠO ---
    initializeBackgroundAnimation();
    loadCourses();
    setupEventListeners();

    // --- TẢI DỮ LIỆU ---
    async function loadCourses() {
        try {
            const response = await fetch(`${API_URL}/api/courses`);
            if (!response.ok) throw new Error('Network response was not ok');
            const courses = await response.json();

            const courseGrid = document.getElementById('courseGrid');
            const recentGrid = document.getElementById('recentCourses');
            courseGrid.innerHTML = '';
            recentGrid.innerHTML = '';

            // Sắp xếp theo lượt xem
            const hotCourses = [...courses].sort((a, b) => b.views - a.views);
            hotCourses.forEach(course => courseGrid.appendChild(createCourseCard(course)));

            // Sắp xếp theo ID (mới nhất)
            const recentCourses = [...courses].sort((a, b) => b.id - a.id).slice(0, 4);
            recentCourses.forEach(course => recentGrid.appendChild(createCourseCard(course)));

        } catch (error) {
            console.error('Failed to load courses:', error);
            showNotification('Không thể tải danh sách khóa học.', 'error');
        }
    }

    // --- TẠO GIAO DIỆN ---
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
            if (!e.target.closest('.action-btn')) {
                 showNotification(`Đang chuyển hướng đến khóa học: ${course.title}`, 'info');
            }
        });
        
        return card;
    }

    // --- CẬP NHẬT UI SAU KHI ĐĂNG NHẬP ---
    function updateUIForLoggedInUser() {
        const userActions = document.getElementById('user-actions');
        if (currentUser) {
            const isAdmin = currentUser.role === 'ADMIN';
            userActions.innerHTML = `
                <button class="btn btn-secondary ${isAdmin ? 'cursor-admin' : 'cursor-pointer'}" id="userBtn">
                    <i class="fas ${isAdmin ? 'fa-crown' : 'fa-user-circle'}"></i> ${currentUser.username}
                </button>
                <button class="btn btn-secondary cursor-pointer" id="logoutBtn" title="Đăng xuất">
                    <i class="fas fa-sign-out-alt"></i>
                </button>
            `;
            document.getElementById('logoutBtn').addEventListener('click', () => {
                currentUser = null;
                updateUIForLoggedInUser();
                loadCourses(); // Tải lại khóa học với giao diện chưa đăng nhập
                showNotification('Đã đăng xuất thành công!', 'info');
            });
        } else {
             userActions.innerHTML = `
                <button class="btn btn-secondary cursor-pointer" id="loginBtn">
                    <i class="fas fa-sign-in-alt"></i> Đăng nhập
                </button>
            `;
            document.getElementById('loginBtn').addEventListener('click', () => {
                document.getElementById('authModal').style.display = 'flex';
            });
        }
    }


    // --- LẮNG NGHE SỰ KIỆN ---
    function setupEventListeners() {
        // Mở modal đăng nhập
        document.getElementById('loginBtn').addEventListener('click', () => {
            document.getElementById('authModal').style.display = 'flex';
        });

        // Đóng modal
        document.getElementById('closeAuthModal').addEventListener('click', () => {
            document.getElementById('authModal').style.display = 'none';
        });
        document.getElementById('authModal').addEventListener('click', (e) => {
            if (e.target === e.currentTarget) e.currentTarget.style.display = 'none';
        });
        
        // Đăng nhập
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button[type="submit"]');
            const originalText = btn.innerHTML;
            btn.innerHTML = '<div class="loading"></div> Đang xử lý...';
            btn.disabled = true;

            const email = e.target.querySelector('input[type="text"]').value;

            try {
                const response = await fetch(`${API_URL}/api/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });
                const data = await response.json();
                if (!response.ok) throw new Error(data.message);

                currentUser = data.user;
                btn.innerHTML = '<i class="fas fa-check"></i> Thành công!';
                btn.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
                
                setTimeout(() => {
                    document.getElementById('authModal').style.display = 'none';
                    showNotification(`Chào mừng ${currentUser.role === 'ADMIN' ? 'Admin' : 'bạn'} trở lại!`, 'success');
                    updateUIForLoggedInUser();
                    loadCourses();
                }, 1500);

            } catch (error) {
                showNotification(error.message, 'error');
            } finally {
                 setTimeout(() => {
                    btn.innerHTML = originalText;
                    btn.disabled = false;
                    btn.style.background = '';
                }, 2000);
            }
        });

        // Toggle theme
        document.getElementById('themeToggle').addEventListener('click', function() {
            document.body.classList.toggle('light-theme');
            this.querySelector('i').className = document.body.classList.contains('light-theme') ? 'fas fa-sun' : 'fas fa-moon';
        });
    }

    // --- CÁC HÀM TIỆN ÍCH ---
    function showNotification(message, type = 'info') {
        const colors = {
            success: 'var(--accent-green)',
            error: '#ff4757',
            info: 'var(--accent-neon)'
        };
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.style.borderColor = colors[type];
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}" style="color: ${colors[type]};"></i>
            <span>${message}</span>
        `;
        document.body.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
    
    function initializeBackgroundAnimation() {
       // ... (code animation nền của bạn)
    }
});