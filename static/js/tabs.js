/**
 * EchoMind Tab Manager
 * Handles the tabbed interface navigation
 */

class TabManager {
    constructor() {
        this.tabButtons = document.querySelectorAll('.tab-btn');
        this.tabPanes = document.querySelectorAll('.tab-pane');
        this.activeTab = 'chat'; // Default active tab
        
        this.uiText = {
            english: {
                chatTab: "Chat",
                insightsTab: "Insights",
                resourcesTab: "Resources"
            },
            arabic: {
                chatTab: "دردشة",
                insightsTab: "رؤى",
                resourcesTab: "موارد"
            },
            french: {
                chatTab: "Discuter",
                insightsTab: "Aperçus",
                resourcesTab: "Ressources"
            }
        };
        
        this.currentLanguage = 'english';
        
        // Initialize
        this.init();
    }
    
    init() {
        // Set up event listeners for tab buttons
        this.setupTabListeners();
        
        // Try to restore last active tab from localStorage
        this.restoreActiveTab();
    }
    
    setupTabListeners() {
        this.tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                this.switchTab(tabId);
            });
        });
    }
    
    switchTab(tabId) {
        // Store active tab in localStorage
        localStorage.setItem('activeTab', tabId);
        this.activeTab = tabId;
        
        // Hide all tab panes
        this.tabPanes.forEach(pane => {
            pane.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        this.tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activate the selected tab and its content
        const selectedButton = document.querySelector(`.tab-btn[data-tab="${tabId}"]`);
        const selectedPane = document.getElementById(`${tabId}-tab`);
        
        if (selectedButton && selectedPane) {
            selectedButton.classList.add('active');
            selectedPane.classList.add('active');
        }
        
        // Dispatch a custom event that other components can listen for
        document.dispatchEvent(new CustomEvent('tab:changed', { 
            detail: { tabId } 
        }));
    }
    
    restoreActiveTab() {
        const savedTab = localStorage.getItem('activeTab');
        if (savedTab) {
            this.switchTab(savedTab);
        }
    }
    
    setLanguage(language) {
        this.currentLanguage = language;
        this.updateTabLabels();
    }
    
    updateTabLabels() {
        const text = this.uiText[this.currentLanguage] || this.uiText.english;
        
        if (this.tabButtons && this.tabButtons.length >= 3) {
            const buttons = Array.from(this.tabButtons);
            const chatButton = buttons.find(btn => btn.getAttribute('data-tab') === 'chat');
            const insightsButton = buttons.find(btn => btn.getAttribute('data-tab') === 'insights');
            const resourcesButton = buttons.find(btn => btn.getAttribute('data-tab') === 'resources');
            
            if (chatButton) chatButton.textContent = text.chatTab;
            if (insightsButton) insightsButton.textContent = text.insightsTab;
            if (resourcesButton) resourcesButton.textContent = text.resourcesTab;
        }
    }
}

// Initialize tab manager when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.tabManager = new TabManager();
    
    // Listen for language changes
    document.addEventListener('language:changed', (event) => {
        if (window.tabManager && event.detail && event.detail.language) {
            window.tabManager.setLanguage(event.detail.language);
        }
    });
}); 