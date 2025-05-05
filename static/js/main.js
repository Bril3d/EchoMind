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
            send: "Send"
        },
        arabic: {
            thinking: "إيكو مايند يفكر في رسالتك...",
            sources: "عرض المصادر التي استشارها إيكو مايند",
            hideSources: "إخفاء المصادر",
            reflectionBtn: "✨ إنشاء تفكير",
            clearBtn: "مسح المحادثة",
            send: "إرسال"
        },
        french: {
            thinking: "EchoMind réfléchit à votre message...",
            sources: "Voir les sources consultées par EchoMind",
            hideSources: "Masquer les sources",
            reflectionBtn: "✨ Générer une réflexion",
            clearBtn: "Effacer la conversation",
            send: "Envoyer"
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

    // Helper function to handle fetch API errors
    async function safeFetch(url, options) {
        try {
            const response = await fetch(url, options);
            
            // Try to parse the JSON response
            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Error parsing JSON response:', jsonError);
                return { 
                    ok: false, 
                    status: response.status,
                    error: 'Failed to parse server response' 
                };
            }
            
            // Return combined response
            return {
                ok: response.ok,
                status: response.status,
                data: data,
                error: !response.ok ? (data.error || `Error ${response.status}`) : null
            };
        } catch (fetchError) {
            console.error('Network error:', fetchError);
            return { 
                ok: false, 
                status: 0,
                error: 'Network connection error. Please check your internet connection.'
            };
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
        messageDiv.textContent = content;
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
                reflectionDiv.innerHTML = `<span class="reflection-icon">✨</span> <strong>Reflection:</strong> ${result.data.reflection}`;
                chatContainer.appendChild(reflectionDiv);
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
                // Clear chat UI
                chatContainer.innerHTML = `
                    <div class="intro-card">
                        <h3>Welcome to EchoMind</h3>
                        <p>I'm here to listen, support, and offer guidance based on therapeutic principles. 
                        Share your thoughts, concerns, or feelings, and I'll respond with empathy and understanding.</p>
                        <p>How are you feeling today?</p>
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
    }

    // Initialize UI
    function initializeUI() {
        // Update UI text based on current language
        updateUIText();
        updatePlaceholder();
        
        // Initial button states
        updateButtonStates();
        
        // Set up event listeners
        setupEventListeners();
    }

    // Initialize the UI
    initializeUI();
}); 