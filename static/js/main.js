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
    const sourcesCountBadge = document.getElementById('sources-count-badge');
    const ttsToggle = document.getElementById('tts-toggle');
    const micButton = document.getElementById('mic-button');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const reflectionHint = document.getElementById('reflection-hint');

    // Theme Management
    function initTheme() {
        const savedTheme = localStorage.getItem('echomind_theme');
        const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
        const currentTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
        document.documentElement.setAttribute('data-theme', currentTheme);

        if (themeToggleBtn) {
            themeToggleBtn.addEventListener('click', () => {
                const active = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', active);
                localStorage.setItem('echomind_theme', active);
                showToast(active === 'dark' ? '🌙 Twilight Dark Mode active' : '☀️ Serene Light Mode active');
            });
        }
    }

    // Voice recognition variables & state
    let recognition = null;
    let isListening = false;
    let currentSpeech = null;
    let activeSpeakingButton = null;

    // Supported translations for UI
    const uiText = {
        english: {
            thinking: "EchoMind is reflecting on your message with care...",
            sources: "View therapeutic sources consulted",
            hideSources: "Hide therapeutic sources",
            reflectionBtn: "Generate Reflection",
            reflectionHintReady: "Ready to reflect ✨",
            reflectionHintNeed: "Needs 2+ exchanges",
            clearBtn: "Clear Conversation",
            send: "Send",
            readAloud: "Read aloud",
            stopSpeaking: "Stop audio",
            copied: "Copied to clipboard",
            copy: "Copy",
            startListening: "Start voice input",
            stopListening: "Listening... (click to stop)",
            voiceNotSupported: "Speech recognition is not supported in this browser.",
            voicePermDenied: "Microphone permission was denied.",
            clearConfirm: "Are you sure you want to clear this sanctuary session?",
            errorGeneric: "An unexpected error occurred. Please try again."
        },
        arabic: {
            thinking: "إيكو مايند يتأمل في رسالتك بعناية...",
            sources: "عرض المصادر العلاجية المستشارة",
            hideSources: "إخفاء المصادر العلاجية",
            reflectionBtn: "إنشاء تأمل علاجي",
            reflectionHintReady: "جاهز للتأمل ✨",
            reflectionHintNeed: "يتطلب تبادلين على الأقل",
            clearBtn: "مسح الجلسة",
            send: "إرسال",
            readAloud: "قراءة بصوت عالٍ",
            stopSpeaking: "إيقاف الصوت",
            copied: "تم النسخ إلى الحافظة",
            copy: "نسخ",
            startListening: "بدء الإدخال الصوتي",
            stopListening: "جاري الاستماع... (انقر للإيقاف)",
            voiceNotSupported: "التعرف الصوتي غير مدعوم في هذا المتصفح.",
            voicePermDenied: "تم رفض إذن الميكروفون.",
            clearConfirm: "هل أنت متأكد من رغبتك في مسح هذه الجلسة العلاجية؟",
            errorGeneric: "حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى."
        },
        french: {
            thinking: "EchoMind réfléchit à votre message avec bienveillance...",
            sources: "Consulter les sources thérapeutiques",
            hideSources: "Masquer les sources thérapeutiques",
            reflectionBtn: "Générer une réflexion",
            reflectionHintReady: "Prêt à réfléchir ✨",
            reflectionHintNeed: "Nécessite 2+ échanges",
            clearBtn: "Effacer la session",
            send: "Envoyer",
            readAloud: "Lecture à voix haute",
            stopSpeaking: "Arrêter l'audio",
            copied: "Copié dans le presse-papiers",
            copy: "Copier",
            startListening: "Commencer la saisie vocale",
            stopListening: "Écoute en cours... (cliquer pour arrêter)",
            voiceNotSupported: "La reconnaissance vocale n'est pas prise en charge sur ce navigateur.",
            voicePermDenied: "L'autorisation d'accès au micro a été refusée.",
            clearConfirm: "Êtes-vous sûr de vouloir effacer cette conversation ?",
            errorGeneric: "Une erreur est survenue. Veuillez réessayer."
        }
    };

    let currentLanguage = (languageSelect ? languageSelect.value : 'english') || 'english';
    let isTtsEnabled = localStorage.getItem('ttsEnabled') === 'true';

    if (ttsToggle) {
        ttsToggle.checked = isTtsEnabled;
    }

    // Function to update recognition language (FIXES BUG where updateRecognitionLanguage was undefined)
    function updateRecognitionLanguage() {
        if (recognition) {
            const langMap = {
                english: 'en-US',
                arabic: 'ar-SA',
                french: 'fr-FR'
            };
            recognition.lang = langMap[currentLanguage] || 'en-US';
        }
    }

    // Initialize Speech Recognition
    function initSpeechRecognition() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

        if (!SpeechRecognition) {
            console.warn('Speech recognition not supported in this browser.');
            if (micButton) {
                micButton.title = uiText[currentLanguage]?.voiceNotSupported || uiText.english.voiceNotSupported;
                micButton.style.opacity = '0.5';
            }
            return false;
        }

        const createNewRecognition = () => {
            const instance = new SpeechRecognition();
            instance.continuous = false;
            instance.interimResults = true;

            const langMap = {
                english: 'en-US',
                arabic: 'ar-SA',
                french: 'fr-FR'
            };
            instance.lang = langMap[currentLanguage] || 'en-US';

            instance.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map(result => result[0].transcript)
                    .join('');

                userInput.value = transcript;
                autoResizeTextarea();
            };

            instance.onerror = (event) => {
                console.warn('Speech recognition status:', event.error);
                isListening = false;
                if (micButton) micButton.classList.remove('listening');
                if (event.error === 'not-allowed') {
                    showToast(uiText[currentLanguage]?.voicePermDenied || uiText.english.voicePermDenied);
                }
            };

            instance.onend = () => {
                isListening = false;
                if (micButton) {
                    micButton.classList.remove('listening');
                    micButton.title = uiText[currentLanguage]?.startListening || uiText.english.startListening;
                }
            };

            return instance;
        };

        if (micButton) {
            micButton.addEventListener('click', () => {
                if (isListening) {
                    if (recognition) {
                        try { recognition.stop(); } catch (e) { /* ignore */ }
                    }
                    isListening = false;
                    micButton.classList.remove('listening');
                } else {
                    try {
                        recognition = createNewRecognition();
                        isListening = true;
                        micButton.classList.add('listening');
                        micButton.title = uiText[currentLanguage]?.stopListening || uiText.english.stopListening;
                        recognition.start();
                    } catch (err) {
                        console.error('Failed to start speech recognition:', err);
                        isListening = false;
                        micButton.classList.remove('listening');
                    }
                }
            });
        }

        return true;
    }

    // Auto resize textarea
    function autoResizeTextarea() {
        if (!userInput) return;
        userInput.style.height = 'auto';
        userInput.style.height = `${Math.min(userInput.scrollHeight, 140)}px`;
    }

    // Text-to-Speech function
    function speakText(text, triggerButton = null) {
        if (!window.speechSynthesis) return;

        // If clicking the currently speaking button, stop speech
        if (currentSpeech && activeSpeakingButton === triggerButton) {
            window.speechSynthesis.cancel();
            if (activeSpeakingButton) activeSpeakingButton.classList.remove('speaking');
            currentSpeech = null;
            activeSpeakingButton = null;
            return;
        }

        // Stop any ongoing speech
        window.speechSynthesis.cancel();
        if (activeSpeakingButton) activeSpeakingButton.classList.remove('speaking');

        const cleanText = text.replace(/[*#_~`]/g, '').trim();
        if (!cleanText) return;

        const utterance = new SpeechSynthesisUtterance(cleanText);

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

        utterance.rate = 0.95; // Gentle therapeutic cadence

        utterance.onstart = () => {
            currentSpeech = utterance;
            if (triggerButton) {
                activeSpeakingButton = triggerButton;
                triggerButton.classList.add('speaking');
            }
        };

        utterance.onend = () => {
            if (activeSpeakingButton) activeSpeakingButton.classList.remove('speaking');
            currentSpeech = null;
            activeSpeakingButton = null;
        };

        utterance.onerror = () => {
            if (activeSpeakingButton) activeSpeakingButton.classList.remove('speaking');
            currentSpeech = null;
            activeSpeakingButton = null;
        };

        window.speechSynthesis.speak(utterance);
    }

    // Toggle TTS
    function toggleTts() {
        isTtsEnabled = ttsToggle.checked;
        localStorage.setItem('ttsEnabled', isTtsEnabled);

        if (!isTtsEnabled && currentSpeech) {
            window.speechSynthesis.cancel();
            if (activeSpeakingButton) activeSpeakingButton.classList.remove('speaking');
            currentSpeech = null;
            activeSpeakingButton = null;
        }

        fetch('/api/set_tts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled: isTtsEnabled })
        }).catch(err => console.error('Error saving TTS preference:', err));

        showToast(isTtsEnabled ? '🔊 Voice Narration turned ON' : '🔇 Voice Narration turned OFF');
    }

    // Copy to clipboard helper
    async function copyToClipboard(text, btn) {
        try {
            await navigator.clipboard.writeText(text);
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-check" style="color: #10b981;"></i> <span class="btn-micro-text">Copied!</span>';
            showToast(uiText[currentLanguage]?.copied || uiText.english.copied);
            setTimeout(() => {
                btn.innerHTML = originalHTML;
            }, 2000);
        } catch (err) {
            console.error('Clipboard copy failed:', err);
        }
    }

    // Toggle Sources Accordion
    function toggleSources() {
        if (!sourcesContent) return;
        const isHidden = sourcesContent.classList.contains('hidden');
        if (isHidden) {
            sourcesContent.classList.remove('hidden');
            if (sourcesChevron) sourcesChevron.style.transform = 'rotate(180deg)';
            if (sourcesToggleText) {
                sourcesToggleText.textContent = uiText[currentLanguage]?.hideSources || uiText.english.hideSources;
            }
        } else {
            sourcesContent.classList.add('hidden');
            if (sourcesChevron) sourcesChevron.style.transform = 'rotate(0deg)';
            if (sourcesToggleText) {
                sourcesToggleText.textContent = uiText[currentLanguage]?.sources || uiText.english.sources;
            }
        }
    }

    // Safe Fetch wrapper
    async function safeFetch(url, options) {
        try {
            const response = await fetch(url, options);
            let data = null;
            try {
                data = await response.json();
            } catch (jsonErr) {
                return { ok: false, status: response.status, error: 'Invalid response format' };
            }
            return {
                ok: response.ok,
                status: response.status,
                data: data,
                error: !response.ok ? (data.error || `Server returned error ${response.status}`) : null
            };
        } catch (netErr) {
            return {
                ok: false,
                status: 0,
                error: 'Network connection issue. Please check your network and server.'
            };
        }
    }

    // Send Message
    async function sendMessage() {
        const message = userInput.value.trim();
        if (!message) return;

        // Reset textarea height
        userInput.value = '';
        autoResizeTextarea();

        // Remove welcome card if visible
        const welcomeCard = document.getElementById('welcome-card');
        if (welcomeCard) welcomeCard.remove();

        // Add user message
        addMessage('user', message);

        // Show thinking indicator
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        scrollChatToBottom();

        try {
            const result = await safeFetch('/api/send_message', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message })
            });

            if (result.ok && result.data) {
                addMessage('assistant', result.data.response);

                if (result.data.sources && result.data.sources.length > 0) {
                    updateSources(result.data.sources);
                    if (sourcesContainer) sourcesContainer.classList.remove('hidden');
                } else {
                    if (sourcesContainer) sourcesContainer.classList.add('hidden');
                }

                updateButtonStates();
            } else {
                throw new Error(result.error || 'Failed to receive a therapeutic response');
            }
        } catch (err) {
            console.error('Error sending message:', err);
            addMessage('assistant', `I apologize, but I encountered an issue: ${err.message || 'Please try again in a moment.'}`);
        } finally {
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            scrollChatToBottom();
        }
    }

    // Add Message to DOM
    function addMessage(role, content) {
        const messageDiv = document.createElement('div');
        messageDiv.className = role === 'user' ? 'user-message' : 'assistant-message';

        if (role === 'user') {
            const bubble = document.createElement('div');
            bubble.className = 'message-bubble';
            bubble.textContent = content;
            messageDiv.appendChild(bubble);
        } else {
            // Assistant Avatar
            const avatar = document.createElement('div');
            avatar.className = 'assistant-avatar';
            avatar.innerHTML = `<img src="/static/images/logo.svg" alt="EchoMind" onerror="this.src='/static/images/logo.png'">`;

            // Bubble Wrap
            const bubbleWrap = document.createElement('div');
            bubbleWrap.className = 'assistant-bubble-wrap';

            const contentDiv = document.createElement('div');
            contentDiv.className = 'message-content';
            contentDiv.textContent = content;

            // Meta controls (Read aloud + Copy)
            const metaDiv = document.createElement('div');
            metaDiv.className = 'message-meta';

            const listenBtn = document.createElement('button');
            listenBtn.className = 'action-micro-btn read-aloud-btn';
            listenBtn.title = uiText[currentLanguage]?.readAloud || uiText.english.readAloud;
            listenBtn.innerHTML = '<i class="fas fa-volume-up"></i> <span class="btn-micro-text">Listen</span>';
            listenBtn.addEventListener('click', () => speakText(content, listenBtn));

            const copyBtn = document.createElement('button');
            copyBtn.className = 'action-micro-btn copy-msg-btn';
            copyBtn.title = uiText[currentLanguage]?.copy || uiText.english.copy;
            copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span class="btn-micro-text">Copy</span>';
            copyBtn.addEventListener('click', () => copyToClipboard(content, copyBtn));

            metaDiv.appendChild(listenBtn);
            metaDiv.appendChild(copyBtn);

            bubbleWrap.appendChild(contentDiv);
            bubbleWrap.appendChild(metaDiv);

            messageDiv.appendChild(avatar);
            messageDiv.appendChild(bubbleWrap);

            // Auto-narration if TTS enabled
            if (isTtsEnabled) {
                setTimeout(() => speakText(content, listenBtn), 400);
            }
        }

        chatContainer.appendChild(messageDiv);
        scrollChatToBottom();
    }

    // Update Sources
    function updateSources(sources) {
        if (!sourcesContent) return;
        sourcesContent.innerHTML = '';

        if (sourcesCountBadge) {
            sourcesCountBadge.textContent = `${sources.length} Consulted`;
        }

        sources.forEach(src => {
            const item = document.createElement('div');
            item.className = 'source-item';
            item.textContent = src;
            sourcesContent.appendChild(item);
        });
    }

    // Generate Reflection
    async function generateReflection() {
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');
        scrollChatToBottom();

        try {
            const result = await safeFetch('/api/generate_reflection', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (result.ok && result.data) {
                const existing = document.querySelector('.reflection-container');
                if (existing) existing.remove();

                const refDiv = document.createElement('div');
                refDiv.className = 'reflection-container';

                const header = document.createElement('div');
                header.className = 'reflection-header';
                header.innerHTML = '<span class="reflection-icon">✨</span> <span class="reflection-title">Mindful Reflection & Growth</span>';

                const textDiv = document.createElement('div');
                textDiv.className = 'reflection-text';
                textDiv.textContent = result.data.reflection;

                const actions = document.createElement('div');
                actions.className = 'reflection-actions';

                const listenBtn = document.createElement('button');
                listenBtn.className = 'action-micro-btn read-aloud-btn';
                listenBtn.innerHTML = '<i class="fas fa-volume-up"></i> <span class="btn-micro-text">Listen</span>';
                listenBtn.addEventListener('click', () => speakText(result.data.reflection, listenBtn));

                const copyBtn = document.createElement('button');
                copyBtn.className = 'action-micro-btn copy-msg-btn';
                copyBtn.innerHTML = '<i class="fas fa-copy"></i> <span class="btn-micro-text">Copy</span>';
                copyBtn.addEventListener('click', () => copyToClipboard(result.data.reflection, copyBtn));

                actions.appendChild(listenBtn);
                actions.appendChild(copyBtn);

                refDiv.appendChild(header);
                refDiv.appendChild(textDiv);
                refDiv.appendChild(actions);

                chatContainer.appendChild(refDiv);
                scrollChatToBottom();

                if (isTtsEnabled) {
                    setTimeout(() => speakText(result.data.reflection, listenBtn), 400);
                }
            } else {
                throw new Error(result.error || 'Failed to generate reflection');
            }
        } catch (err) {
            console.error('Error in reflection:', err);
            showToast(err.message || 'Could not generate reflection yet.');
        } finally {
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
        }
    }

    // Clear Conversation
    async function clearConversation() {
        const confirmMsg = uiText[currentLanguage]?.clearConfirm || uiText.english.clearConfirm;
        if (!confirm(confirmMsg)) return;

        if (loadingSpinner) loadingSpinner.classList.remove('hidden');

        try {
            const result = await safeFetch('/api/clear_conversation', { method: 'POST' });
            if (result.ok) {
                window.location.reload();
            } else {
                throw new Error(result.error || 'Clear failed');
            }
        } catch (err) {
            console.error('Clear conversation error:', err);
            showToast('Failed to clear conversation.');
        } finally {
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
        }
    }

    // Change Language (Fixed Bug: No unhandled exceptions)
    async function changeLanguage() {
        const newLanguage = languageSelect.value;
        if (loadingSpinner) loadingSpinner.classList.remove('hidden');

        try {
            const result = await safeFetch('/api/set_language', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ language: newLanguage })
            });

            if (result.ok) {
                currentLanguage = newLanguage;
                updateRecognitionLanguage();
                window.location.reload();
            } else {
                throw new Error(result.error || 'Failed to update language');
            }
        } catch (err) {
            console.error('Error changing language:', err);
            if (loadingSpinner) loadingSpinner.classList.add('hidden');
            showToast('Error changing language.');
        }
    }

    // Update Button States
    function updateButtonStates() {
        const messageCount = document.querySelectorAll('.user-message, .assistant-message').length;
        const canReflect = messageCount >= 4;
        const canClear = messageCount > 0;

        if (reflectionButton) {
            reflectionButton.disabled = !canReflect;
        }

        if (clearButton) {
            clearButton.disabled = !canClear;
        }

        if (reflectionHint) {
            if (canReflect) {
                reflectionHint.textContent = uiText[currentLanguage]?.reflectionHintReady || uiText.english.reflectionHintReady;
                reflectionHint.style.color = 'var(--primary-color)';
                reflectionHint.style.fontWeight = '600';
            } else {
                reflectionHint.textContent = uiText[currentLanguage]?.reflectionHintNeed || uiText.english.reflectionHintNeed;
                reflectionHint.style.color = 'var(--text-muted)';
                reflectionHint.style.fontWeight = '400';
            }
        }
    }

    // Scroll chat smoothly to bottom
    function scrollChatToBottom() {
        if (chatContainer) {
            chatContainer.scrollTo({
                top: chatContainer.scrollHeight,
                behavior: 'smooth'
            });
        }
    }

    // Setup Event Listeners
    function setupEventListeners() {
        // Send button
        if (sendButton) sendButton.addEventListener('click', sendMessage);

        // Enter key to send, Shift+Enter for newline
        if (userInput) {
            userInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                }
            });
            userInput.addEventListener('input', autoResizeTextarea);
        }

        // Language select
        if (languageSelect) languageSelect.addEventListener('change', changeLanguage);

        // Reflection button
        if (reflectionButton) reflectionButton.addEventListener('click', generateReflection);

        // Clear button
        if (clearButton) clearButton.addEventListener('click', clearConversation);

        // TTS Toggle
        if (ttsToggle) ttsToggle.addEventListener('change', toggleTts);

        // Sources Header Click
        const sourcesHeader = document.querySelector('.sources-header');
        if (sourcesHeader) sourcesHeader.addEventListener('click', toggleSources);

        // Quick prompt chips
        document.querySelectorAll('.prompt-chip').forEach(chip => {
            chip.addEventListener('click', () => {
                const prompt = chip.getAttribute('data-prompt');
                if (prompt && userInput) {
                    userInput.value = prompt;
                    autoResizeTextarea();
                    sendMessage();
                }
            });
        });

        // Existing read aloud buttons on page load
        document.querySelectorAll('.read-aloud-btn').forEach(btn => {
            const parent = btn.closest('.assistant-bubble-wrap, .reflection-container');
            if (parent) {
                const textElem = parent.querySelector('.message-content, .reflection-text');
                if (textElem) {
                    btn.addEventListener('click', () => speakText(textElem.textContent, btn));
                }
            }
        });

        // Existing copy buttons on page load
        document.querySelectorAll('.copy-msg-btn').forEach(btn => {
            const parent = btn.closest('.assistant-bubble-wrap, .reflection-container');
            if (parent) {
                const textElem = parent.querySelector('.message-content, .reflection-text');
                if (textElem) {
                    btn.addEventListener('click', () => copyToClipboard(textElem.textContent, btn));
                }
            }
        });
    }

    // Toast Notification Utility
    function showToast(message, duration = 2800) {
        const existing = document.getElementById('toast-notification');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.id = 'toast-notification';
        toast.className = 'toast';
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => toast.classList.add('show'), 20);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 350);
        }, duration);
    }

    // Initialization
    function initialize() {
        initTheme();
        initSpeechRecognition();
        setupEventListeners();
        updateButtonStates();
        autoResizeTextarea();
        scrollChatToBottom();
    }

    initialize();
});