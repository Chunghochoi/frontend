document.addEventListener('DOMContentLoaded', function() {
    // --- CONFIG ---
    const API_URL = 'https://coursehub-backend.onrender.com';
    let currentUser = null;

    // --- INITIALIZE ---
    initializeApp();

    function initializeApp() {
        initializeBackgroundAnimation();
        loadCourses();
        setupEventListeners();
        setupFooter();
    }

    // --- API HANDLERS ---
    async function apiRequest(endpoint, options = {}) {
        try {
            const response = await fetch(API_URL + endpoint, options);
            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || 'Có lỗi xảy ra');
            }
            return data;
        } catch (error) {
            showNotification(error.message, 'error');
            throw error;
        }
    }

    // --- COURSE HANDLING ---
    async function loadCourses() {
        try {
            const courses = await apiRequest('/api/courses');
            const courseGrid = document.getElementById('courseGrid');
            const recentGrid = document.getElementById('recentCourses');
            courseGrid.innerHTML = '';
            recentGrid.innerHTML = '';

            const hotCourses = [...courses].sort((a, b) => (b.views || 0) - (a.views || 0));
            hotCourses.forEach(course => courseGrid.appendChild(createCourseCard(course)));

            const recentCourses = [...courses].sort((a, b) => b.id - a.id).slice(0, 4);
            recentCourses.forEach(course => recentGrid.appendChild(createCourseCard(course)));
        } catch (error) {
            console.error('Failed to load courses:', error);
        }
    }

    function createCourseCard(course) {
        const card = document.createElement('div');
        card.className = 'course-card cursor-pointer';
        card.innerHTML = `
            <div class="course-image">
                <i class="${course.icon || 'fas fa-book-open'}" style="z-index: 1; position: relative;"></i>
            </div>
            <div class="course-content">
                <h3 class="course-title">${course.title}</h3>
                <p class="course-author">by @${course.author}</p>
                <div class="course-stats">
                    <span><i class="fas fa-eye"></i> ${course.views?.toLocaleString() || 0}</span>
                    <span class="course-category">${course.category}</span>
                </div>
            </div>`;
        card.addEventListener('click', () => window.open(course.link, '_blank'));
        return card;
    }

    // --- AUTHENTICATION ---
    async function handleLogin(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setButtonLoading(btn, 'Đang đăng nhập...');
        try {
            const data = await apiRequest('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    identifier: document.getElementById('loginIdentifier').value,
                    password: document.getElementById('loginPassword').value,
                }),
            });
            currentUser = data.user;
            setButtonSuccess(btn, 'Đăng nhập thành công!', () => {
                toggleModal('authModal', false);
                updateUIForLoggedInUser();
            });
            showNotification(`Chào mừng ${currentUser.username} trở lại!`, 'success');
        } catch (error) {
            resetButton(btn, '<i class="fas fa-sign-in-alt"></i> Đăng nhập');
        }
    }

    async function handleRegister(e) {
        e.preventDefault();
        const btn = e.target.querySelector('button[type="submit"]');
        setButtonLoading(btn, 'Đang đăng ký...');
        try {
            const data = await apiRequest('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: document.getElementById('registerUsername').value,
                    email: document.getElementById('registerEmail').value,
                    password: document.getElementById('registerPassword').value,
                }),
            });
            setButtonSuccess(btn, 'Đăng ký thành công!', () => {
                document.querySelector('.auth-tab[data-tab="login"]').click();
                document.getElementById('loginIdentifier').value = document.getElementById('registerEmail').value;
            });
            showNotification(data.message, 'success');
        } catch (error) {
            resetButton(btn, '<i class="fas fa-user-plus"></i> Đăng ký');
        }
    }
    
    async function handleUpload(e) {
        e.preventDefault();
        if(!currentUser) return showNotification('Bạn cần đăng nhập để đăng tải', 'error');

        const btn = e.target.querySelector('button[type="submit"]');
        setButtonLoading(btn, 'Đang tải lên...');

        try {
             await apiRequest('/api/courses', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title: document.getElementById('courseTitle').value,
                    link: document.getElementById('courseLink').value,
                    category: document.getElementById('courseCategory').value,
                    ownerId: currentUser.id,
                    ownerUsername: currentUser.username
                }),
            });
            setButtonSuccess(btn, 'Đăng tải thành công!', () => {
                toggleModal('uploadModal', false);
                e.target.reset();
                loadCourses();
            });
            showNotification('Khóa học của bạn đã được đăng tải!', 'success');
        } catch(error) {
             resetButton(btn, '<i class="fas fa-check"></i> Đăng tải ngay');
        }
    }


    // --- UI & EVENT LISTENERS ---
    function setupEventListeners() {
        document.getElementById('themeToggle').addEventListener('click', toggleTheme);
        document.getElementById('loginBtn').addEventListener('click', () => toggleModal('authModal', true));
        document.getElementById('uploadBtn').addEventListener('click', () => toggleModal('uploadModal', true));

        document.querySelectorAll('.modal-close').forEach(btn => {
            btn.addEventListener('click', () => toggleModal(btn.closest('.modal').id, false));
        });
        
        document.querySelectorAll('.modal').forEach(modal => {
            modal.addEventListener('click', (e) => e.target === modal && toggleModal(modal.id, false));
        });

        document.querySelectorAll('.auth-tab').forEach(tab => {
            tab.addEventListener('click', function() {
                document.querySelector('.auth-tab.active').classList.remove('active');
                document.querySelector('.auth-form.active').classList.remove('active');
                this.classList.add('active');
                document.getElementById(this.dataset.tab + 'Form').classList.add('active');
            });
        });

        document.getElementById('loginForm').addEventListener('submit', handleLogin);
        document.getElementById('registerForm').addEventListener('submit', handleRegister);
        document.getElementById('uploadForm').addEventListener('submit', handleUpload);
        
        document.getElementById('searchInput').addEventListener('input', handleSearch);

        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'k') {
                e.preventDefault();
                document.getElementById('searchInput').focus();
            }
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal').forEach(modal => toggleModal(modal.id, false));
            }
        });
    }
    
    function handleSearch(e) {
        const query = e.target.value.toLowerCase();
        document.querySelectorAll('#courseGrid .course-card, #recentCourses .course-card').forEach(card => {
            const title = card.querySelector('.course-title').textContent.toLowerCase();
            const author = card.querySelector('.course-author').textContent.toLowerCase();
            const category = card.querySelector('.course-category').textContent.toLowerCase();
            card.style.display = (title.includes(query) || author.includes(query) || category.includes(query)) ? 'block' : 'none';
        });
    }

    function updateUIForLoggedInUser() {
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('uploadBtn').style.display = 'flex';

        const navButtons = document.getElementById('navButtons');
        const logoutBtn = document.createElement('button');
        logoutBtn.className = 'btn btn-secondary cursor-pointer';
        logoutBtn.innerHTML = `<i class="fas fa-sign-out-alt"></i> ${currentUser.username}`;
        logoutBtn.onclick = () => {
            currentUser = null;
            showNotification('Đã đăng xuất!', 'info');
            // Simple reload to reset state
            location.reload();
        };
        navButtons.appendChild(logoutBtn);
    }

    // --- HELPERS ---
    function toggleModal(modalId, show) {
        const modal = document.getElementById(modalId);
        if (modal) modal.style.display = show ? 'flex' : 'none';
    }

    function toggleTheme() {
        document.body.classList.toggle('light-theme');
        const icon = document.querySelector('#themeToggle i');
        icon.className = document.body.classList.contains('light-theme') ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    function setButtonLoading(btn, text) {
        btn.disabled = true;
        btn.innerHTML = `<div class="loading"></div> ${text}`;
    }

    function setButtonSuccess(btn, text, callback) {
        btn.innerHTML = `<i class="fas fa-check"></i> ${text}`;
        btn.style.background = 'linear-gradient(45deg, #28a745, #20c997)';
        setTimeout(() => {
            callback();
            resetButton(btn, ''); // Reset button state after action
        }, 1500);
    }

    function resetButton(btn, originalText) {
        btn.disabled = false;
        btn.innerHTML = originalText;
        btn.style.background = '';
    }

    function showNotification(message, type = 'info') {
        const colors = { success: 'var(--accent-green)', error: '#ff4757', info: 'var(--accent-neon)' };
        const icon = { success: 'check-circle', error: 'exclamation-triangle', info: 'info-circle' };

        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed; top: 2rem; right: 2rem; background: var(--bg-card);
            color: var(--text-primary); padding: 1rem 1.5rem; border-radius: 12px;
            border: 2px solid ${colors[type]}; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
            z-index: 3000; animation: slideInRight 0.3s ease; max-width: 300px;
        `;
        notification.innerHTML = `
            <div style="display: flex; align-items: center; gap: 1rem;">
                <i class="fas fa-${icon[type]}" style="color: ${colors[type]}; font-size: 1.2rem;"></i>
                <div>${message}</div>
                <button onclick="this.parentElement.parentElement.remove()" style="background:none;border:none;color:var(--text-secondary);cursor:pointer;padding:0;"><i class="fas fa-times"></i></button>
            </div>`;
        document.body.appendChild(notification);
        setTimeout(() => {
            notification.style.animation = 'slideOutRight 0.3s ease forwards';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    function initializeBackgroundAnimation() {
        const container = document.getElementById('bgAnimation');
        for (let i = 0; i < 50; i++) {
            const p = document.createElement('div');
            p.className = 'particle';
            p.style.left = `${Math.random() * 100}%`;
            p.style.animationDelay = `${Math.random() * 10}s`;
            p.style.animationDuration = `${Math.random() * 10 + 10}s`;
            container.appendChild(p);
        }
    }
    
    function setupFooter() {
        const footer = document.querySelector('footer');
        footer.innerHTML = `
            <div><i class="fas fa-heart" style="color: #ff6b6b;"></i> Made with love by the dev community</div>
            <div style="font-size: 0.8rem; margin-top: 0.5rem;">© ${new Date().getFullYear()} CourseHub Infinity. All rights reserved.</div>
        `;
    }

    // --- DYNAMIC STYLES ---
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight { from { opacity: 0; transform: translateX(100%); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideOutRight { from { opacity: 1; transform: translateX(0); } to { opacity: 0; transform: translateX(100%); } }
    `;
    document.head.appendChild(style);
});
