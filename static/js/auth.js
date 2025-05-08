/**
 * EchoMind Authentication Module
 * Handles user authentication, login/logout and session management
 */

class AuthManager {
    constructor() {
        this.isLoggedIn = false;
        this.currentUser = null;
        this.loginModal = document.getElementById('login-modal');
        this.signupModal = document.getElementById('signup-modal');
        this.loginForm = document.getElementById('login-form');
        this.signupForm = document.getElementById('signup-form');
        this.loginBtn = document.getElementById('login-btn');
        this.signupBtn = document.getElementById('signup-btn');
        this.logoutBtn = document.getElementById('logout-btn');
        this.authSection = document.getElementById('auth-section');
        this.userProfile = document.getElementById('user-profile');
        this.usernameDisplay = document.getElementById('username-display');
        
        this.uiText = {
            english: {
                login: "Login",
                signup: "Sign Up",
                logout: "Logout",
                welcomeBack: "Welcome back, ",
                loginSuccess: "Login successful!",
                signupSuccess: "Sign up successful!",
                loginError: "Login failed. Please check your credentials.",
                signupError: "Sign up failed. Please try again."
            },
            arabic: {
                login: "تسجيل الدخول",
                signup: "إنشاء حساب",
                logout: "تسجيل الخروج",
                welcomeBack: "مرحبًا بعودتك، ",
                loginSuccess: "تم تسجيل الدخول بنجاح!",
                signupSuccess: "تم إنشاء الحساب بنجاح!",
                loginError: "فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.",
                signupError: "فشل إنشاء الحساب. يرجى المحاولة مرة أخرى."
            },
            french: {
                login: "Connexion",
                signup: "S'inscrire",
                logout: "Déconnexion",
                welcomeBack: "Bon retour, ",
                loginSuccess: "Connexion réussie!",
                signupSuccess: "Inscription réussie!",
                loginError: "Échec de la connexion. Veuillez vérifier vos identifiants.",
                signupError: "Échec de l'inscription. Veuillez réessayer."
            }
        };
        
        this.currentLanguage = 'english';
        
        // Initialize
        this.init();
    }
    
    init() {
        // Check if user is already logged in
        this.checkAuthStatus();
        
        // Set up event listeners
        this.setupListeners();
    }
    
    setupListeners() {
        if (this.loginBtn) {
            this.loginBtn.addEventListener('click', () => this.openModal('login-modal'));
        }
        
        if (this.signupBtn) {
            this.signupBtn.addEventListener('click', () => this.openModal('signup-modal'));
        }
        
        if (this.logoutBtn) {
            this.logoutBtn.addEventListener('click', () => this.logout());
        }
        
        if (this.loginForm) {
            this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
        
        if (this.signupForm) {
            this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        }
        
        // Close modal triggers
        document.querySelectorAll('.close-modal').forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    this.closeModal(modal.id);
                }
            });
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                this.closeModal(event.target.id);
            }
        });
    }
    
    setLanguage(language) {
        this.currentLanguage = language;
        this.updateUIText();
    }
    
    updateUIText() {
        const text = this.uiText[this.currentLanguage] || this.uiText.english;
        
        if (this.loginBtn) this.loginBtn.textContent = text.login;
        if (this.signupBtn) this.signupBtn.textContent = text.signup;
        if (this.logoutBtn) this.logoutBtn.textContent = text.logout;
    }
    
    openModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'block';
        }
    }
    
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.style.display = 'none';
        }
    }
    
    async handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || this.uiText[this.currentLanguage].loginError);
            }
            
            this.loginSuccess(data.username);
            this.closeModal('login-modal');
            
        } catch (error) {
            alert(error.message);
            console.error('Login error:', error);
        }
    }
    
    async handleSignup(event) {
        event.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                throw new Error(data.error || this.uiText[this.currentLanguage].signupError);
            }
            
            this.loginSuccess(data.username);
            this.closeModal('signup-modal');
            
        } catch (error) {
            alert(error.message);
            console.error('Signup error:', error);
        }
    }
    
    async logout() {
        try {
            await fetch('/api/auth/logout', {
                method: 'POST'
            });
            
            this.logoutSuccess();
            
        } catch (error) {
            console.error('Logout error:', error);
        }
    }
    
    loginSuccess(username) {
        this.isLoggedIn = true;
        this.currentUser = username;
        
        // Update UI for logged in state
        if (this.authSection) this.authSection.classList.add('hidden');
        if (this.userProfile) this.userProfile.classList.remove('hidden');
        if (this.usernameDisplay) this.usernameDisplay.textContent = username;
        
        // Trigger event for other components that need to know about auth state
        document.dispatchEvent(new CustomEvent('auth:login', { 
            detail: { username } 
        }));
    }
    
    logoutSuccess() {
        this.isLoggedIn = false;
        this.currentUser = null;
        
        // Update UI for logged out state
        if (this.userProfile) this.userProfile.classList.add('hidden');
        if (this.authSection) this.authSection.classList.remove('hidden');
        
        // Trigger event for other components that need to know about auth state
        document.dispatchEvent(new CustomEvent('auth:logout'));
    }
    
    async checkAuthStatus() {
        try {
            const response = await fetch('/api/auth/status');
            const data = await response.json();
            
            if (data.isAuthenticated) {
                this.loginSuccess(data.user.name);
            }
        } catch (error) {
            console.error('Error checking auth status:', error);
        }
    }
}

// Initialize auth manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
}); 