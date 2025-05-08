document.addEventListener('DOMContentLoaded', () => {
    // DOM Elements
    const chatContainer = document.getElementById('chat-container');
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const reflectionButton = document.getElementById('reflection-button');
    const clearButton = document.getElementById('clear-button');
    const loadingSpinner = document.getElementById('loading-spinner');
    const thinkingText = document.getElementById('thinking-text');
    const languageSelect = document.getElementById('language-select');
    const sourcesContainer = document.getElementById('sources-container');
    const sourcesContent = document.getElementById('sources-content');
    const sourcesToggleText = document.getElementById('sources-toggle-text');
    const sourcesChevron = document.getElementById('sources-chevron');
    const ttsToggle = document.getElementById('tts-toggle');
    const temperatureSlider = document.getElementById('temperature-slider');
    let temperatureValue = document.getElementById('temperature-value');
    
    // New UI Elements
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanes = document.querySelectorAll('.tab-pane');
    const themeToggle = document.getElementById('theme-toggle');
    const loginBtn = document.getElementById('login-btn');
    const signupBtn = document.getElementById('signup-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const loginModal = document.getElementById('login-modal');
    const signupModal = document.getElementById('signup-modal');
    const closeModalButtons = document.querySelectorAll('.close-modal');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const authSection = document.getElementById('auth-section');
    const userProfile = document.getElementById('user-profile');
    const usernameDisplay = document.getElementById('username-display');

    // Text-to-speech related variables
    let currentSpeech = null;
    let isTtsEnabled = localStorage.getItem('ttsEnabled') === 'true';
    
    // Authentication state
    let isLoggedIn = false;
    let currentUser = null;
    
    // Initialize TTS toggle based on saved preference
    if (ttsToggle) {
        ttsToggle.checked = isTtsEnabled;
    }
    
    // Initialize theme based on saved preference
    let isDarkMode = localStorage.getItem('darkMode') === 'true';
    if (themeToggle) {
        themeToggle.checked = isDarkMode;
        setTheme(isDarkMode);
    }

    // Failsafe: Ensure spinner is hidden on page load
    loadingSpinner.classList.add('hidden');
    
    // Failsafe: Add a backup timer to hide spinner after 10 seconds in case something goes wrong
    function ensureSpinnerHidden() {
        setTimeout(() => {
            if (!loadingSpinner.classList.contains('hidden')) {
                console.warn('Spinner failsafe triggered: hiding spinner after timeout');
                loadingSpinner.classList.add('hidden');
            }
        }, 10000); // 10 seconds timeout
    }

    // UI text based on language
    const uiText = {
        english: {
            thinking: "EchoMind is reflecting on your message...",
            sources: "View sources EchoMind consulted",
            hideSources: "Hide sources",
            reflectionBtn: "✨ Generate Reflection",
            clearBtn: "Clear Conversation",
            send: "Send",
            ttsEnabled: "Text-to-Speech Enabled",
            ttsDisabled: "Text-to-Speech Disabled",
            readAloud: "Read Aloud",
            creativityLevel: "AI Creativity Level:",
            focused: "Focused",
            creative: "Creative",
            // Auth related text
            login: "Login",
            signup: "Sign Up",
            logout: "Logout",
            welcomeBack: "Welcome back, ",
            loginSuccess: "Login successful!",
            signupSuccess: "Sign up successful!",
            loginError: "Login failed. Please check your credentials.",
            signupError: "Sign up failed. Please try again.",
            // Tab names
            chatTab: "Chat",
            insightsTab: "Insights",
            resourcesTab: "Resources"
        },
        arabic: {
            thinking: "إيكو مايند يفكر في رسالتك...",
            sources: "عرض المصادر التي استشارها إيكو مايند",
            hideSources: "إخفاء المصادر",
            reflectionBtn: "✨ إنشاء تفكير",
            clearBtn: "مسح المحادثة",
            send: "إرسال",
            ttsEnabled: "تم تمكين تحويل النص إلى كلام",
            ttsDisabled: "تم تعطيل تحويل النص إلى كلام",
            readAloud: "قراءة بصوت عالٍ",
            creativityLevel: "مستوى إبداع الذكاء الاصطناعي:",
            focused: "مركّز",
            creative: "إبداعي",
            // Auth related text
            login: "تسجيل الدخول",
            signup: "إنشاء حساب",
            logout: "تسجيل الخروج",
            welcomeBack: "مرحبًا بعودتك، ",
            loginSuccess: "تم تسجيل الدخول بنجاح!",
            signupSuccess: "تم إنشاء الحساب بنجاح!",
            loginError: "فشل تسجيل الدخول. يرجى التحقق من بيانات الاعتماد الخاصة بك.",
            signupError: "فشل إنشاء الحساب. يرجى المحاولة مرة أخرى.",
            // Tab names
            chatTab: "دردشة",
            insightsTab: "رؤى",
            resourcesTab: "موارد"
        },
        french: {
            thinking: "EchoMind réfléchit à votre message...",
            sources: "Voir les sources consultées par EchoMind",
            hideSources: "Masquer les sources",
            reflectionBtn: "✨ Générer une réflexion",
            clearBtn: "Effacer la conversation",
            send: "Envoyer",
            ttsEnabled: "Synthèse vocale activée",
            ttsDisabled: "Synthèse vocale désactivée",
            readAloud: "Lire à haute voix",
            creativityLevel: "Niveau de créativité de l'IA:",
            focused: "Concentré",
            creative: "Créatif",
            // Auth related text
            login: "Connexion",
            signup: "S'inscrire",
            logout: "Déconnexion",
            welcomeBack: "Bon retour, ",
            loginSuccess: "Connexion réussie!",
            signupSuccess: "Inscription réussie!",
            loginError: "Échec de la connexion. Veuillez vérifier vos identifiants.",
            signupError: "Échec de l'inscription. Veuillez réessayer.",
            // Tab names
            chatTab: "Discuter",
            insightsTab: "Aperçus",
            resourcesTab: "Ressources"
        }
    };

    // Current language
    let currentLanguage = languageSelect.value;

    // Update UI text based on language
    function updateUIText() {
        const text = uiText[currentLanguage] || uiText.english;
        thinkingText.textContent = text.thinking;
        sourcesToggleText.textContent = text.sources;
        reflectionButton.innerHTML = `<i class="fas fa-sparkles"></i> ${text.reflectionBtn}`;
        clearButton.innerHTML = `<i class="fas fa-trash-alt"></i> ${text.clearBtn}`;
        sendButton.innerHTML = `<i class="fas fa-paper-plane"></i> ${text.send}`;
        
        // Update all read-aloud button titles
        document.querySelectorAll('.read-aloud-btn').forEach(btn => {
            btn.title = text.readAloud;
        });
        
        // Update temperature control labels
        if (temperatureSlider && temperatureValue) {
            const temperatureLabel = document.querySelector('.temperature-control label');
            if (temperatureLabel) {
                // Save the current display value
                const currentValue = temperatureValue.textContent;
                // Update the label
                temperatureLabel.innerHTML = `${text.creativityLevel} <span id="temperature-value">${currentValue}</span>`;
                // Re-assign the temperatureValue element since we recreated it
                temperatureValue = document.getElementById('temperature-value');
            }
            
            // Update min/max labels
            const tempLabels = document.querySelectorAll('.temperature-labels span');
            if (tempLabels && tempLabels.length === 2) {
                tempLabels[0].textContent = text.focused;
                tempLabels[1].textContent = text.creative;
            }
        }
        
        // Update auth buttons
        if (loginBtn) loginBtn.textContent = text.login;
        if (signupBtn) signupBtn.textContent = text.signup;
        if (logoutBtn) logoutBtn.textContent = text.logout;
        
        // Update tab names
        if (tabButtons && tabButtons.length >= 3) {
            tabButtons[0].textContent = text.chatTab;
            tabButtons[1].textContent = text.insightsTab;
            tabButtons[2].textContent = text.resourcesTab;
        }
    }

    // Update placeholder text based on language
    function updatePlaceholder() {
        const placeholders = {
            english: "Share what's on your mind...",
            arabic: "شارك ما يدور في ذهنك...",
            french: "Partagez ce qui vous préoccupe..."
        };
        userInput.placeholder = placeholders[currentLanguage] || placeholders.english;
    }

    // Toggle sources visibility
    function toggleSources() {
        const isHidden = sourcesContent.classList.contains('hidden');
        if (isHidden) {
            sourcesContent.classList.remove('hidden');
            sourcesChevron.classList.remove('fa-chevron-down');
            sourcesChevron.classList.add('fa-chevron-up');
            sourcesToggleText.textContent = uiText[currentLanguage].hideSources || uiText.english.hideSources;
        } else {
            sourcesContent.classList.add('hidden');
            sourcesChevron.classList.remove('fa-chevron-up');
            sourcesChevron.classList.add('fa-chevron-down');
            sourcesToggleText.textContent = uiText[currentLanguage].sources || uiText.english.sources;
        }
    }

    // Text-to-speech function
    function speakText(text) {
        if (!isTtsEnabled) return;
        
        // Stop any currently speaking synthesis
        if (currentSpeech) {
            window.speechSynthesis.cancel();
        }
        
        // Create a new utterance
        const utterance = new SpeechSynthesisUtterance(text);
        
        // Set language based on current interface language
        switch (currentLanguage) {
            case 'arabic':
                utterance.lang = 'ar';
                break;
            case 'french':
                utterance.lang = 'fr-FR';
                break;
            default:
                utterance.lang = 'en-US';
        }
        
        // Start speaking
        window.speechSynthesis.speak(utterance);
        currentSpeech = utterance;
        
        // Handle when speech has finished
        utterance.onend = () => {
            currentSpeech = null;
        };
    }
    
    // Toggle text-to-speech functionality
    function toggleTts() {
        isTtsEnabled = ttsToggle.checked;
        localStorage.setItem('ttsEnabled', isTtsEnabled);
        
        if (!isTtsEnabled && currentSpeech) {
            window.speechSynthesis.cancel();
            currentSpeech = null;
        }
        
        // Also update server-side setting
        fetch('/api/set_tts', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ enabled: isTtsEnabled })
        })
        .catch(error => console.error('Error updating TTS setting:', error));
    }
    
    // Toggle theme (dark/light mode)
    function toggleTheme() {
        const isDark = themeToggle.checked;
        setTheme(isDark);
        localStorage.setItem('darkMode', isDark);
    }
    
    // Set theme based on preference
    function setTheme(isDark) {
        document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    }
    
    // Handle tab switching
    function switchTab(tabId) {
        // Hide all tab panes
        tabPanes.forEach(pane => {
            pane.classList.remove('active');
        });
        
        // Deactivate all tab buttons
        tabButtons.forEach(btn => {
            btn.classList.remove('active');
        });
        
        // Activate the selected tab and its content
        document.querySelector(`.tab-btn[data-tab="${tabId}"]`).classList.add('active');
        document.getElementById(`${tabId}-tab`).classList.add('active');
    }
    
    // Authentication Functions
    function openModal(modalId) {
        document.getElementById(modalId).style.display = 'block';
    }
    
    function closeModal(modalId) {
        document.getElementById(modalId).style.display = 'none';
    }
    
    function handleLogin(event) {
        event.preventDefault();
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        
        // Simulate login - in a real app, this would call an API
        if (email && password) {
            // Mock successful login
            const username = email.split('@')[0];
            loginSuccess(username);
            closeModal('login-modal');
            
            // In a real app, you would make an API call like:
            /*
            fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            })
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('Login failed');
            })
            .then(data => {
                loginSuccess(data.username);
                closeModal('login-modal');
            })
            .catch(error => {
                alert(uiText[currentLanguage].loginError || uiText.english.loginError);
                console.error('Login error:', error);
            });
            */
        }
    }
    
    function handleSignup(event) {
        event.preventDefault();
        const name = document.getElementById('signup-name').value;
        const email = document.getElementById('signup-email').value;
        const password = document.getElementById('signup-password').value;
        
        // Simulate signup - in a real app, this would call an API
        if (name && email && password) {
            // Mock successful signup
            loginSuccess(name);
            closeModal('signup-modal');
            
            // In a real app, you would make an API call like:
            /*
            fetch('/api/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            })
            .then(response => {
                if (response.ok) return response.json();
                throw new Error('Signup failed');
            })
            .then(data => {
                loginSuccess(data.username);
                closeModal('signup-modal');
            })
            .catch(error => {
                alert(uiText[currentLanguage].signupError || uiText.english.signupError);
                console.error('Signup error:', error);
            });
            */
        }
    }
    
    function loginSuccess(username) {
        isLoggedIn = true;
        currentUser = username;
        
        // Update UI for logged in state
        authSection.classList.add('hidden');
        userProfile.classList.remove('hidden');
        usernameDisplay.textContent = username;
        
        // Store login state in localStorage (for demo purposes)
        localStorage.setItem('isLoggedIn', true);
        localStorage.setItem('currentUser', username);
    }
    
    function handleLogout() {
        isLoggedIn = false;
        currentUser = null;
        
        // Update UI for logged out state
        userProfile.classList.add('hidden');
        authSection.classList.remove('hidden');
        
        // Clear login state from localStorage
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('currentUser');
        
        // In a real app, you would make an API call:
        /*
        fetch('/api/logout', {
            method: 'POST'
        })
        .then(() => {
            // UI changes after successful logout
        })
        .catch(error => console.error('Logout error:', error));
        */
    }
    
    // Check if user was previously logged in
    function checkLoginState() {
        const storedLoginState = localStorage.getItem('isLoggedIn') === 'true';
        const storedUser = localStorage.getItem('currentUser');
        
        if (storedLoginState && storedUser) {
            loginSuccess(storedUser);
        }
    }

    // Update temperature setting
    function updateTemperature() {
        const temperature = parseFloat(temperatureSlider.value);
        temperatureValue.textContent = temperature;
        
        // Update the server-side setting
        fetch('/api/set_temperature', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ temperature })
        })
        .catch(error => console.error('Error updating temperature setting:', error));
    }

    // Safe fetch with error handling
    async function safeFetch(url, options) {
        try {
            const response = await fetch(url, options);
            
            if (!response.ok) {
                const errorText = await response.text();
                let errorMessage;
                
                try {
                    // Try to parse the error response as JSON
                    const errorData = JSON.parse(errorText);
                    errorMessage = errorData.error || 'An unknown error occurred';
                } catch (e) {
                    // If not JSON, use the text directly
                    errorMessage = errorText || `Error: ${response.status} ${response.statusText}`;
                }
                
                throw new Error(errorMessage);
            }
            
            return response.json();
        } catch (error) {
            console.error('Network error:', error.message);
            throw error;
        }
    }

    // Send message to server
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Clear input
        userInput.value = '';

        // Show loading spinner
        loadingSpinner.classList.remove('hidden');
        ensureSpinnerHidden(); // Start failsafe timer

        // Add user message to UI immediately
        addMessage('user', message);

        try {
            // Send message to server using safeFetch
            const result = await safeFetch('/api/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            if (result.ok) {
                // Add assistant response to chat
                addMessage('assistant', result.data.response);

                // Update sources if available
                if (result.data.sources && result.data.sources.length > 0) {
                    updateSources(result.data.sources);
                    sourcesContainer.classList.remove('hidden');
                } else {
                    sourcesContainer.classList.add('hidden');
                }

                // Update button states
                updateButtonStates();
            } else {
                throw new Error(result.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            // Add error message to chat so user knows something went wrong
            addMessage('assistant', 'Sorry, I encountered an error processing your message. Please try again.');
        } finally {
            // Always hide loading spinner, even if there was an error
            loadingSpinner.classList.add('hidden');
        }
    }

    // Add message to chat UI
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = role === 'user' ? 'user-message' : 'assistant-message';
        
        if (role === 'user') {
            messageDiv.textContent = content;
        } else {
            // For assistant messages, add message content and read-aloud button
            const messageContent = document.createElement('div');
            messageContent.className = 'message-content';
            messageContent.textContent = content;
            
            const readButton = document.createElement('button');
            readButton.className = 'read-aloud-btn';
            readButton.title = uiText[currentLanguage].readAloud || uiText.english.readAloud;
            readButton.innerHTML = '<i class="fas fa-volume-up"></i>';
            readButton.addEventListener('click', () => speakText(content));
            
            messageDiv.appendChild(messageContent);
            messageDiv.appendChild(readButton);
            
            // Auto-read if TTS is enabled
            if (isTtsEnabled) {
                setTimeout(() => speakText(content), 500);
            }
        }
        
        chatContainer.appendChild(messageDiv);
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    // Update sources in the UI
    function updateSources(sources) {
        sourcesContent.innerHTML = '';
        sources.forEach(source => {
            const sourceItem = document.createElement('div');
            sourceItem.className = 'source-item';
            sourceItem.textContent = `• ${source}`;
            sourcesContent.appendChild(sourceItem);
        });
    }

    // Generate reflection
    async function generateReflection() {
        loadingSpinner.classList.remove('hidden');
        ensureSpinnerHidden(); // Start failsafe timer

        try {
            // Send request using safeFetch
            const result = await safeFetch('/api/generate_reflection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            if (result.ok) {
                // Remove existing reflection if any
                const existingReflection = document.querySelector('.reflection-container');
                if (existingReflection) {
                    existingReflection.remove();
                }

                // Add new reflection
                const reflectionDiv = document.createElement('div');
                reflectionDiv.className = 'reflection-container';
                
                const contentSpan = document.createElement('span');
                contentSpan.innerHTML = `<span class="reflection-icon">✨</span> <strong>Reflection:</strong> ${result.data.reflection}`;
                
                const readButton = document.createElement('button');
                readButton.className = 'read-aloud-btn';
                readButton.title = uiText[currentLanguage].readAloud || uiText.english.readAloud;
                readButton.innerHTML = '<i class="fas fa-volume-up"></i>';
                readButton.addEventListener('click', () => speakText(result.data.reflection));
                
                reflectionDiv.appendChild(contentSpan);
                reflectionDiv.appendChild(readButton);
                chatContainer.appendChild(reflectionDiv);
                
                // Auto-read if TTS is enabled
                if (isTtsEnabled) {
                    setTimeout(() => speakText(result.data.reflection), 500);
                }
                
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } else {
                throw new Error(result.error || 'Failed to generate reflection');
            }
        } catch (error) {
            console.error('Error generating reflection:', error);
            // Add error message to chat
            addMessage('assistant', 'Sorry, I encountered an error generating a reflection. Please try again.');
        } finally {
            // Always hide loading spinner
            loadingSpinner.classList.add('hidden');
        }
    }

    // Clear conversation
    async function clearConversation() {
        if (!confirm('Are you sure you want to clear the entire conversation?')) return;

        loadingSpinner.classList.remove('hidden');
        ensureSpinnerHidden(); // Start failsafe timer

        try {
            // Use safeFetch for the request
            const result = await safeFetch('/api/clear_conversation', {
                method: 'POST'
            });

            if (result.ok) {
                // Get welcome message based on current language
                let welcomeMessage;
                switch (currentLanguage) {
                    case 'arabic':
                        welcomeMessage = `
                            <h3>مرحبًا بك في إيكو مايند</h3>
                            <p>أنا هنا للاستماع والدعم وتقديم التوجيه بناءً على المبادئ العلاجية.
                            شارك أفكارك أو مخاوفك أو مشاعرك، وسأرد بتعاطف وتفهم.</p>
                            <p>كيف تشعر اليوم؟</p>
                        `;
                        break;
                    case 'french':
                        welcomeMessage = `
                            <h3>Bienvenue à EchoMind</h3>
                            <p>Je suis là pour écouter, soutenir et offrir des conseils basés sur des principes thérapeutiques.
                            Partagez vos pensées, préoccupations ou sentiments, et je répondrai avec empathie et compréhension.</p>
                            <p>Comment vous sentez-vous aujourd'hui ?</p>
                        `;
                        break;
                    default: // english
                        welcomeMessage = `
                            <h3>Welcome to EchoMind</h3>
                            <p>I'm here to listen, support, and offer guidance based on therapeutic principles. 
                            Share your thoughts, concerns, or feelings, and I'll respond with empathy and understanding.</p>
                            <p>How are you feeling today?</p>
                        `;
                }
                
                // Clear chat UI
                chatContainer.innerHTML = `
                    <div class="intro-card">
                        ${welcomeMessage}
                    </div>
                `;

                // Hide sources
                sourcesContainer.classList.add('hidden');

                // Update button states
                reflectionButton.disabled = true;
                clearButton.disabled = true;
            } else {
                throw new Error(result.error || 'Failed to clear conversation');
            }
        } catch (error) {
            console.error('Error clearing conversation:', error);
            // Show error in chat instead of alert
            addMessage('assistant', 'Sorry, I encountered an error clearing the conversation. Please try again.');
        } finally {
            // Always hide loading spinner
            loadingSpinner.classList.add('hidden');
        }
    }

    // Change language
    async function changeLanguage() {
        const newLanguage = languageSelect.value;
        
        // Show loading spinner
        loadingSpinner.classList.remove('hidden');
        ensureSpinnerHidden(); // Start failsafe timer
        
        try {
            // Use safeFetch for the request
            const result = await safeFetch('/api/set_language', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ language: newLanguage })
            });

            if (result.ok) {
                currentLanguage = newLanguage;
                updateUIText();
                updatePlaceholder();
                // Reload to refresh all UI elements
                window.location.reload();
            } else {
                // Hide spinner if there's an error and we don't reload
                loadingSpinner.classList.add('hidden');
                throw new Error(result.error || 'Failed to change language');
            }
        } catch (error) {
            console.error('Error changing language:', error);
            // Hide spinner in case of error and reload doesn't happen
            loadingSpinner.classList.add('hidden');
            // Show error message in chat
            addMessage('assistant', 'Sorry, I encountered an error changing the language. Please try again.');
        }
    }

    // Update button states based on message count
    function updateButtonStates() {
        const messageCount = document.querySelectorAll('.user-message, .assistant-message').length;
        reflectionButton.disabled = messageCount < 4;
        clearButton.disabled = messageCount < 1;
    }

    // Set up event listeners
    function setupEventListeners() {
        // Send message on button click
        sendButton.addEventListener('click', sendMessage);

        // Send message on Enter key (Shift+Enter for new line)
        userInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
            }
        });

        // Language change
        languageSelect.addEventListener('change', changeLanguage);

        // Generate reflection
        reflectionButton.addEventListener('click', generateReflection);

        // Clear conversation
        clearButton.addEventListener('click', clearConversation);

        // Sources toggle
        document.querySelector('.sources-header').addEventListener('click', toggleSources);
        
        // TTS toggle
        if (ttsToggle) {
            ttsToggle.addEventListener('change', toggleTts);
        }
        
        // Temperature slider
        if (temperatureSlider) {
            // Update display value when slider changes
            temperatureSlider.addEventListener('input', () => {
                temperatureValue.textContent = parseFloat(temperatureSlider.value).toFixed(1);
            });
            
            // Send value to server when slider is released
            temperatureSlider.addEventListener('change', updateTemperature);
        }
        
        // Add click handlers to existing read-aloud buttons
        document.querySelectorAll('.read-aloud-btn').forEach(button => {
            const parentMessage = button.closest('.assistant-message, .reflection-container');
            if (parentMessage) {
                const contentElement = parentMessage.querySelector('.message-content') || parentMessage;
                const textToRead = contentElement.textContent.replace('Reflection:', '').trim();
                button.addEventListener('click', () => speakText(textToRead));
            }
        });
        
        // New UI event listeners
        if (themeToggle) {
            themeToggle.addEventListener('change', toggleTheme);
        }
        
        // Tab navigation
        tabButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const tabId = btn.getAttribute('data-tab');
                switchTab(tabId);
            });
        });
        
        // Auth related listeners
        if (loginBtn) loginBtn.addEventListener('click', () => openModal('login-modal'));
        if (signupBtn) signupBtn.addEventListener('click', () => openModal('signup-modal'));
        if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
        
        // Modal close buttons
        closeModalButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const modal = btn.closest('.modal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
        });
        
        // Close modal when clicking outside
        window.addEventListener('click', (event) => {
            if (event.target.classList.contains('modal')) {
                event.target.style.display = 'none';
            }
        });
        
        // Form submissions
        if (loginForm) loginForm.addEventListener('submit', handleLogin);
        if (signupForm) signupForm.addEventListener('submit', handleSignup);
    }

    // Initialize UI
    function initializeUI() {
        // Update UI text based on current language
        updateUIText();
        updatePlaceholder();
        
        // Initial button states
        updateButtonStates();
        checkLoginState();
        
        // Set up event listeners
        setupEventListeners();
        
        // Scroll chat to bottom on load
        if (chatContainer) {
            chatContainer.scrollTop = chatContainer.scrollHeight;
        }
    }

    // Initialize the UI
    initializeUI();
}); 