document.addEventListener('DOMContentLoaded', () => {
    // !!! QUAN TRỌNG: Thay thế URL này bằng URL backend của bạn trên Render.com
    const API_URL = 'https://coursehub-backend.onrender.com';

    let currentUser = null; // Biến toàn cục lưu trữ thông tin người dùng đã đăng nhập

    // --- KHỞI TẠO CÁC CHỨC NĂNG CHÍNH ---
    function initializeApp() {
        setupEventListeners();
        updateUIForLoggedInUser();
        loadCourses();
        initializeBackgroundAnimation();
    }

    // --- TẢI DỮ LIỆU ---
    async function loadCourses() {
        try {
            const response = await fetch(`${API_URL}/api/courses`);
            const courses = await response.json();
            displayCourses(courses);
        } catch (error) {
            console.error('Lỗi khi tải khóa học:', error);
            showNotification('Không thể tải danh sách khóa học.', 'error');
        }
    }

    // --- HIỂN THỊ DỮ LIỆU ---
    function displayCourses(courses) {
        const courseGrid = document.getElementById('courseGrid');
        const recentGrid = document.getElementById('recentCourses');
        courseGrid.innerHTML = '';
        recentGrid.innerHTML = '';

        const hotCourses = [...courses].sort((a, b) => (b.views || 0) - (a.views || 0));
        hotCourses.forEach(course => courseGrid.appendChild(createCourseCard(course)));

        const recentCourses = [...courses].sort((a, b) => b.id - a.id).slice(0, 4);
        recentCourses.forEach(course => recentGrid.appendChild(createCourseCard(course)));
    }

    function createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'course-card cursor-pointer';

        const userRole = currentUser ? currentUser.role : null;
        const userId = currentUser ? currentUser.id : null;
        
        let canDelete = false;
        if (userRole === 'ADMIN') {
            canDelete = true;
        } else if (userRole === 'SUB_ADMIN' && course.ownerRole !== 'ADMIN') {
            canDelete = true;
        } else if (course.ownerId === userId) {
            canDelete = true;
        }

        card.innerHTML = `
            <div class="course-image"><i class="${course.icon || 'fas fa-book'}"></i></div>
            <div class="course-content">
                <h3 class="course-title">${course.title}</h3>
                <p class="course-author">by @${course.author}</p>
                <div class="course-stats">
                    <span><i class="fas fa-eye"></i> ${course.views?.toLocaleString() || 0}</span>
                    <span class="course-category">${course.category}</span>
                </div>
            </div>
            ${canDelete ? `
            <div class="course-actions">
                <button class="action-btn delete-btn" title="Xóa khóa học" data-course-id="${course.id}" data-course-title="${course.title}">
                    <i class="fas fa-trash"></i>
                </button>
            </div>` : ''}`;

        card.addEventListener('click', (e) => {
            if (!e.target.closest('.action-btn')) {
                window.open(course.link, '_blank');
            }
        });
        
        return card;
    }

    // --- CẬP NHẬT GIAO DIỆN NGƯỜI DÙNG ---
    function updateUIForLoggedInUser() {
        const userActionsDiv = document.getElementById('user-actions');
        const adminPanelBtn = document.getElementById('adminPanelBtn');
        const uploadBtn = document.getElementById('uploadBtn');

        if (currentUser) {
            const isAdmin = currentUser.role === 'ADMIN';
            userActionsDiv.innerHTML = `
                <button class="btn btn-secondary" id="userBtn">
                    <i class="fas ${isAdmin ? 'fa-crown' : 'fa-user'}"></i> ${currentUser.username}
                </button>
                <button class="btn btn-secondary cursor-pointer" id="logoutBtn" title="Đăng xuất">
                    <i class="fas fa-sign-out-alt"></i>
                </button>`;
            
            document.getElementById('logoutBtn').addEventListener('click', logout);
            adminPanelBtn.style.display = isAdmin ? 'inline-flex' : 'none';
            uploadBtn.disabled = false;
        } else {
            userActionsDiv.innerHTML = `
                <button class="btn btn-secondary cursor-pointer" id="loginBtn">
                    <i class="fas fa-sign-in-alt"></i> Đăng nhập
                </button>`;
            
            document.getElementById('loginBtn').addEventListener('click', () => toggleModal('authModal', true));
            adminPanelBtn.style.display = 'none';
            uploadBtn.disabled = true;
        }
    }

    // --- XÁC THỰC VÀ HÀNH ĐỘNG ---
    async function login(email) {
        try {
            const response = await fetch(`${API_URL}/api/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);

            currentUser = data.user;
            showNotification(`Chào mừng ${currentUser.username}!`, 'success');
            toggleModal('authModal', false);
            updateUIForLoggedInUser();
            loadCourses();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    function logout() {
        currentUser = null;
        showNotification('Đã đăng xuất.', 'info');
        updateUIForLoggedInUser();
        loadCourses();
    }

    async function handleCourseUpload(title, link, category) {
        try {
            const response = await fetch(`${API_URL}/api/courses`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, link, category, ownerId: currentUser.id, ownerUsername: currentUser.username })
            });
            if (!response.ok) throw new Error((await response.json()).message);

            showNotification('Đăng tải khóa học thành công!', 'success');
            toggleModal('uploadModal', false);
            loadCourses();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }

    async function handleCourseDelete(courseId) {
        try {
            const response = await fetch(`${API_URL}/api/courses/${courseId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: currentUser.id, userRole: currentUser.role })
            });
            if (!response.ok) throw new Error((await response.json()).message);

            showNotification('Đã xóa khóa học thành công.', 'success');
            loadCourses();
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
    
    // --- ADMIN PANEL ---
    async function openAdminPanel() {
        const userListDiv = document.getElementById('userList');
        userListDiv.innerHTML = 'Đang tải...';
        toggleModal('adminModal', true);

        try {
            const response = await fetch(`${API_URL}/api/users`);
            const users = await response.json();
            
            userListDiv.innerHTML = '';
            users.forEach(user => {
                const userItem = document.createElement('div');
                userItem.className = 'user-item';
                userItem.innerHTML = `
                    <div class="user-info">
                        <span class="username">${user.username}</span>
                        <span class="role ${user.role}">${user.role}</span>
                    </div>
                    <button class="btn promote-btn" data-user-id="${user.id}" ${user.role !== 'MEMBER' ? 'disabled' : ''}>
                        ${user.role === 'MEMBER' ? 'Thăng cấp' : 'Đã thăng cấp'}
                    </button>`;
                userListDiv.appendChild(userItem);
            });
        } catch (error) {
            userListDiv.innerHTML = 'Không thể tải danh sách người dùng.';
        }
    }
    
    async function handleUserPromotion(userId) {
        try {
            const response = await fetch(`${API_URL}/api/users/${userId}/promote`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ adminId: currentUser.id, adminRole: currentUser.role })
            });
            const data = await response.json();
            if (!response.ok) throw new Error(data.message);
            
            showNotification(data.message, 'success');
            openAdminPanel(); // Tải lại danh sách
        } catch (error) {
            showNotification(error.message, 'error');
        }
    }
    
    // --- CÁC HÀM TIỆN ÍCH ---
    function toggleModal(modalId, show) {
        document.getElementById(modalId).style.display = show ? 'flex' : 'none';
    }

    function showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.className = 'notification';
        const colors = { success: 'green', error: 'red', info: 'blue' };
        notification.style.borderColor = colors[type];
        notification.textContent = message;
        container.appendChild(notification);
        setTimeout(() => notification.remove(), 4000);
    }
    
    function initializeBackgroundAnimation() { /* Có thể thêm hiệu ứng nếu muốn */ }

    // --- LẮNG NGHE SỰ KIỆN ---
    function setupEventListeners() {
        // Đóng Modal
        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => btn.closest('.modal').style.display = 'none');
        });

        // Mở Modal
        document.getElementById('uploadBtn').addEventListener('click', () => toggleModal('uploadModal', true));
        document.getElementById('adminPanelBtn').addEventListener('click', openAdminPanel);

        // Form Submit
        document.getElementById('loginForm').addEventListener('submit', (e) => {
            e.preventDefault();
            login(document.getElementById('loginEmail').value);
        });
        document.getElementById('uploadForm').addEventListener('submit', (e) => {
            e.preventDefault();
            handleCourseUpload(
                document.getElementById('courseTitle').value,
                document.getElementById('courseLink').value,
                document.getElementById('courseCategory').value
            );
            e.target.reset();
        });

        // Event Delegation cho các nút động
        document.body.addEventListener('click', (e) => {
            const deleteBtn = e.target.closest('.delete-btn');
            if (deleteBtn) {
                const { courseId, courseTitle } = deleteBtn.dataset;
                if (confirm(`Bạn có chắc muốn xóa khóa học "${courseTitle}"?`)) {
                    handleCourseDelete(courseId);
                }
            }
            
            const promoteBtn = e.target.closest('.promote-btn');
            if (promoteBtn && !promoteBtn.disabled) {
                 const { userId } = promoteBtn.dataset;
                 if (confirm(`Bạn có muốn thăng cấp người dùng này lên Phó Admin?`)) {
                    handleUserPromotion(userId);
                }
            }
        });
        
        // Theme Toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            document.body.classList.toggle('light-theme');
        });
    }

    // --- KHỞI CHẠY ỨNG DỤNG ---
    initializeApp();
});