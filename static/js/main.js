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

    // Send message to server
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Clear input
        userInput.value = '';

        // Show loading spinner
        loadingSpinner.classList.remove('hidden');

        try {
            // Add user message to UI immediately
            addMessage('user', message);

            // Send message to server
            const response = await fetch('/api/send_message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ message })
            });

            const data = await response.json();

            if (response.ok) {
                // Add assistant response to chat
                addMessage('assistant', data.response);

                // Update sources if available
                if (data.sources && data.sources.length > 0) {
                    updateSources(data.sources);
                    sourcesContainer.classList.remove('hidden');
                } else {
                    sourcesContainer.classList.add('hidden');
                }

                // Update button states
                updateButtonStates();
            } else {
                throw new Error(data.error || 'Failed to get response');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert(error.message || 'An error occurred while sending your message');
        } finally {
            // Hide loading spinner
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

        try {
            const response = await fetch('/api/generate_reflection', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                // Remove existing reflection if any
                const existingReflection = document.querySelector('.reflection-container');
                if (existingReflection) {
                    existingReflection.remove();
                }

                // Add new reflection
                const reflectionDiv = document.createElement('div');
                reflectionDiv.className = 'reflection-container';
                reflectionDiv.innerHTML = `<span class="reflection-icon">✨</span> <strong>Reflection:</strong> ${data.reflection}`;
                chatContainer.appendChild(reflectionDiv);
                chatContainer.scrollTop = chatContainer.scrollHeight;
            } else {
                throw new Error(data.error || 'Failed to generate reflection');
            }
        } catch (error) {
            console.error('Error generating reflection:', error);
            alert(error.message || 'An error occurred while generating the reflection');
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    }

    // Clear conversation
    async function clearConversation() {
        if (!confirm('Are you sure you want to clear the entire conversation?')) return;

        loadingSpinner.classList.remove('hidden');

        try {
            const response = await fetch('/api/clear_conversation', {
                method: 'POST'
            });

            if (response.ok) {
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
                throw new Error('Failed to clear conversation');
            }
        } catch (error) {
            console.error('Error clearing conversation:', error);
            alert('An error occurred while clearing the conversation');
        } finally {
            loadingSpinner.classList.add('hidden');
        }
    }

    // Change language
    async function changeLanguage() {
        const newLanguage = languageSelect.value;
        
        try {
            const response = await fetch('/api/set_language', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ language: newLanguage })
            });

            if (response.ok) {
                currentLanguage = newLanguage;
                updateUIText();
                updatePlaceholder();
                // Reload to refresh all UI elements
                window.location.reload();
            } else {
                throw new Error('Failed to change language');
            }
        } catch (error) {
            console.error('Error changing language:', error);
            alert('An error occurred while changing the language');
        }
    }

    // Update button states based on message count
    function updateButtonStates() {
        const messageCount = document.querySelectorAll('.user-message, .assistant-message').length;
        reflectionButton.disabled = messageCount < 4;
        clearButton.disabled = messageCount < 1;
    }

    // Event listeners
    sendButton.addEventListener('click', sendMessage);
    
    userInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });
    
    reflectionButton.addEventListener('click', generateReflection);
    clearButton.addEventListener('click', clearConversation);
    languageSelect.addEventListener('change', changeLanguage);
    document.querySelector('.sources-header').addEventListener('click', toggleSources);

    // Initialize
    updateUIText();
    updatePlaceholder();
    updateButtonStates();
}); 