/**
 * EchoMind Theme Manager
 * Handles dark/light mode theme switching
 */

class ThemeManager {
    constructor() {
        this.themeToggle = document.getElementById('theme-toggle');
        this.htmlRoot = document.documentElement;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        
        // Initialize
        this.init();
    }
    
    init() {
        // Apply saved theme
        this.applyTheme(this.currentTheme);
        
        // Update toggle state based on current theme
        if (this.themeToggle) {
            this.themeToggle.checked = this.currentTheme === 'dark';
            this.themeToggle.addEventListener('change', () => this.toggleTheme());
        }
        
        // Listen for system theme changes
        this.listenForSystemThemeChanges();
    }
    
    toggleTheme() {
        const isDarkMode = this.themeToggle.checked;
        const newTheme = isDarkMode ? 'dark' : 'light';
        
        this.applyTheme(newTheme);
        this.saveTheme(newTheme);
    }
    
    applyTheme(theme) {
        this.htmlRoot.setAttribute('data-theme', theme);
        this.currentTheme = theme;
        
        // Update toggle if it exists
        if (this.themeToggle) {
            this.themeToggle.checked = theme === 'dark';
        }
    }
    
    saveTheme(theme) {
        localStorage.setItem('theme', theme);
        
        // Also save on server if possible
        this.updateServerTheme(theme);
    }
    
    async updateServerTheme(theme) {
        try {
            await fetch('/api/set_theme', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ theme })
            });
        } catch (error) {
            console.error('Error updating theme setting on server:', error);
        }
    }
    
    listenForSystemThemeChanges() {
        // Check if browser supports system color scheme media queries
        if (window.matchMedia) {
            const darkModeMediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            
            // Initial check
            if (localStorage.getItem('theme') === null) {
                // Only apply system preference if user hasn't set a preference
                const systemPrefersDark = darkModeMediaQuery.matches;
                this.applyTheme(systemPrefersDark ? 'dark' : 'light');
            }
            
            // Listen for changes
            try {
                // Modern browsers
                darkModeMediaQuery.addEventListener('change', (e) => {
                    // Only apply if user hasn't set a preference
                    if (localStorage.getItem('theme') === null) {
                        this.applyTheme(e.matches ? 'dark' : 'light');
                    }
                });
            } catch (error) {
                // Fallback for older browsers
                darkModeMediaQuery.addListener((e) => {
                    // Only apply if user hasn't set a preference
                    if (localStorage.getItem('theme') === null) {
                        this.applyTheme(e.matches ? 'dark' : 'light');
                    }
                });
            }
        }
    }
}

// Initialize theme manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.themeManager = new ThemeManager();
}); 