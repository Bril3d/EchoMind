import os
import json
import streamlit as st
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

# Define the model name - updated to use the latest available model
GEMINI_MODEL = "gemini-2.0-flash"

# App configuration
st.set_page_config(
    page_title="EchoMind Therapeutic Assistant", page_icon="🧘‍♀️", layout="centered"
)

# Supported languages
SUPPORTED_LANGUAGES = {
    "english": {
        "code": "en",
        "name": "English",
        "welcome": "How are you feeling today? What's on your mind?",
        "thinking": "Thinking...",
        "bye_message": "Take care of yourself. Remember that healing takes time, and you're making progress. I'm here when you need me.",
    },
    "arabic": {
        "code": "ar",
        "name": "العربية",
        "welcome": "كيف تشعر اليوم؟ ما الذي يدور في ذهنك؟",
        "thinking": "جاري التفكير...",
        "bye_message": "اعتن بنفسك. تذكر أن الشفاء يستغرق وقتاً، وأنت تحرز تقدماً. أنا هنا عندما تحتاجني.",
    },
    "french": {
        "code": "fr",
        "name": "Français",
        "welcome": "Comment vous sentez-vous aujourd'hui ? Qu'est-ce qui vous préoccupe ?",
        "thinking": "Réflexion en cours...",
        "bye_message": "Prenez soin de vous. N'oubliez pas que la guérison prend du temps, et vous faites des progrès. Je suis là quand vous avez besoin de moi.",
    },
}

# EchoMind Prompt Template with multilingual support
ECHOMIND_PROMPT_TEMPLATE = """
You are EchoMind, a compassionate AI therapist with expertise in mental wellness, emotional support, and personal growth.

## YOUR PERSONALITY:
- Warm, empathetic, and genuinely caring
- Patient and attentive to subtle emotional cues
- Gently encouraging without being pushy
- Thoughtful and reflective, often asking meaningful questions
- Knowledgeable but humble, sharing wisdom in an accessible way
- Calming presence that helps people feel safe and heard

## YOUR TONE:
- Speak in a soothing, reassuring manner
- Use a conversational, natural style that feels human
- Balance professionalism with approachability
- Use gentle metaphors when helpful
- Validate feelings without judgment
- Convey genuine care through your words

## YOUR APPROACH:
- Always acknowledge the person's feelings first
- Listen deeply and reflect back what you hear
- Offer support, not just solutions
- Share relevant therapeutic insights from the context provided
- Provide gentle guidance and perspective
- End with encouragement and an invitation to continue sharing

## GUIDELINES:
- Never be judgmental or dismissive of someone's feelings
- Don't give medical advice or attempt to diagnose
- Maintain appropriate boundaries
- If someone is in crisis, gently suggest they seek professional help

## LANGUAGE INSTRUCTIONS:
- Respond in {language}

## PERSON'S MESSAGE:
{query}

Now respond as EchoMind, drawing on your therapeutic knowledge, and maintaining your supportive persona throughout. Your response must be in {language}.
"""

# Reflection prompt template
REFLECTION_PROMPT_TEMPLATE = """
You are EchoMind, a compassionate AI therapist. You're reviewing the conversation with a person to identify themes, patterns, and opportunities for growth.

## CONVERSATION HISTORY:
{conversation_history}

## TASK:
Create a brief, positive reflection based on the person's messages. Your reflection should:

1. Identify 1-2 key themes, emotions, or patterns in what they've shared
2. Highlight any strengths, insights, or growth you observe
3. Offer a gentle, supportive perspective that fosters hope
4. End with a single uplifting takeaway or affirmation

The reflection should be brief (3-5 sentences maximum), warm, and encouraging without being unrealistically positive. Focus on progress, resilience, and possibilities.

Respond in {language}, using a thoughtful, empathetic tone.
"""

# Custom CSS
st.markdown(
    """
<style>
    .stApp {
        background-color: #f5f7f9;
    }
    .app-header {
        color: #4a6572;
    }
    .app-subtitle {
        color: #718792;
        font-style: italic;
    }
    .response-container {
        background-color: #ffffff;
        border-radius: 10px;
        padding: 20px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        margin-bottom: 20px;
    }
    .user-message {
        background-color: #e6f4ea;
        border-radius: 10px;
        padding: 10px 15px;
        margin: 10px 0;
        text-align: right;
        max-width: 80%;
        margin-left: auto;
    }
    .assistant-message {
        background-color: #ffffff;
        border-radius: 10px;
        padding: 15px;
        margin: 10px 0;
        border-left: 4px solid #4a6572;
        max-width: 80%;
    }
    .reflection-container {
        background-color: #f8f1e8;
        border-radius: 10px;
        padding: 15px;
        margin: 20px 0;
        border-left: 4px solid #d4af7a;
        max-width: 90%;
    }
    .intro-card {
        background-color: #eef2f5;
        border-radius: 10px;
        padding: 20px;
        margin-bottom: 20px;
        border-left: 4px solid #7c98b3;
    }
    .stButton>button {
        background-color: #4a6572;
        color: white;
        border-radius: 8px;
    }
    .stButton>button:hover {
        background-color: #5f7d8c;
    }
    .language-selector {
        max-width: 200px;
        margin-bottom: 20px;
    }
    [data-testid="stSelectbox"] {
        max-width: 200px;
    }
    .reflection-button {
        background-color: #d4af7a !important;
    }
    .reflection-button:hover {
        background-color: #c39c69 !important;
    }
    .clear-button {
        background-color: #718792 !important;
    }
</style>
""",
    unsafe_allow_html=True,
)

# Welcome messages in different languages
WELCOME_MESSAGES = {
    "english": """
    <div class="intro-card">
        <h3>Welcome to EchoMind</h3>
        <p>I'm here to listen, support, and offer guidance based on therapeutic principles. 
        Share your thoughts, concerns, or feelings, and I'll respond with empathy and understanding.</p>
        <p>How are you feeling today?</p>
    </div>
    """,
    "arabic": """
    <div class="intro-card">
        <h3>مرحبًا بك في إيكو مايند</h3>
        <p>أنا هنا للاستماع والدعم وتقديم التوجيه بناءً على المبادئ العلاجية.
        شارك أفكارك أو مخاوفك أو مشاعرك، وسأرد بتعاطف وتفهم.</p>
        <p>كيف تشعر اليوم؟</p>
    </div>
    """,
    "french": """
    <div class="intro-card">
        <h3>Bienvenue à EchoMind</h3>
        <p>Je suis là pour écouter, soutenir et offrir des conseils basés sur des principes thérapeutiques.
        Partagez vos pensées, préoccupations ou sentiments, et je répondrai avec empathie et compréhension.</p>
        <p>Comment vous sentez-vous aujourd'hui ?</p>
    </div>
    """,
}


def generate_therapeutic_response(
    user_query: str, conversation_history=None, language="english"
):
    """
    Generate a therapeutic response using Gemini, without relying on AstraDB.

    Args:
        user_query: The user's question or concern
        conversation_history: Optional list of previous messages for context
        language: Language for the response (default: english)

    Returns:
        A therapeutic response from Gemini
    """
    try:
        # Set default language if not supported
        if language not in SUPPORTED_LANGUAGES:
            language = "english"

        language_info = SUPPORTED_LANGUAGES[language]
        language_name = language_info["name"]

        # Add conversation history context if provided
        conversation_context = ""
        if conversation_history and len(conversation_history) > 0:
            conversation_context = "## PREVIOUS CONVERSATION:\n"
            for msg in conversation_history:
                role = "Person" if msg["role"] == "user" else "EchoMind"
                conversation_context += f"{role}: {msg['content']}\n\n"
            conversation_context += "\n"

        # Create prompt from template
        prompt = ECHOMIND_PROMPT_TEMPLATE.format(
            query=user_query, language=language_name
        )

        # Add conversation history to the prompt if available
        if conversation_context:
            prompt = prompt.replace(
                "## PERSON'S MESSAGE:", f"{conversation_context}## PERSON'S MESSAGE:"
            )

        # Initialize Gemini model - using the updated model name
        model = genai.GenerativeModel(GEMINI_MODEL)

        # Generate the response
        response = model.generate_content(prompt)

        # Return the response and empty sources (for compatibility)
        return {"response": response.text, "sources": []}

    except Exception as e:
        error_messages = {
            "english": f"I'm sorry, I encountered an error: {str(e)}",
            "arabic": f"أنا آسف، لقد واجهت خطأ: {str(e)}",
            "french": f"Je suis désolé, j'ai rencontré une erreur: {str(e)}",
        }

        error_msg = error_messages.get(language, error_messages["english"])

        return {"response": error_msg, "sources": []}


def generate_positive_reflection(conversation_history, language="english"):
    """
    Analyze the user's messages from the conversation history and generate
    a short positive reflection or takeaway using Gemini.

    Args:
        conversation_history: List of message dictionaries with 'role' and 'content' keys
        language: Language for the reflection (default: english)

    Returns:
        A dictionary containing the reflection text
    """
    try:
        # Set default language if not supported
        if language not in SUPPORTED_LANGUAGES:
            language = "english"

        language_info = SUPPORTED_LANGUAGES[language]
        language_name = language_info["name"]

        # Filter to get only user messages
        user_messages = [
            msg["content"] for msg in conversation_history if msg["role"] == "user"
        ]

        # If there are not enough user messages, return empty reflection
        if len(user_messages) < 2:
            no_reflection_messages = {
                "english": "Not enough conversation history for a meaningful reflection yet.",
                "arabic": "لا يوجد تاريخ محادثة كافٍ للتفكير المفيد بعد.",
                "french": "Pas encore assez d'historique de conversation pour une réflexion significative.",
            }
            return {
                "reflection": no_reflection_messages.get(
                    language, no_reflection_messages["english"]
                )
            }

        # Format conversation history for the prompt
        formatted_history = ""
        for msg in conversation_history:
            role = "Person" if msg["role"] == "user" else "EchoMind"
            formatted_history += f"{role}: {msg['content']}\n\n"

        # Create prompt from template
        prompt = REFLECTION_PROMPT_TEMPLATE.format(
            conversation_history=formatted_history, language=language_name
        )

        # Initialize Gemini model - using the updated model name
        model = genai.GenerativeModel(GEMINI_MODEL)

        # Generate the reflection
        response = model.generate_content(prompt)

        return {"reflection": response.text}

    except Exception as e:
        error_messages = {
            "english": f"I couldn't generate a reflection at this time: {str(e)}",
            "arabic": f"لم أتمكن من إنشاء تفكير في هذا الوقت: {str(e)}",
            "french": f"Je n'ai pas pu générer une réflexion pour le moment: {str(e)}",
        }

        error_msg = error_messages.get(language, error_messages["english"])

        return {"reflection": error_msg}


def get_placeholder_text(language):
    """Get placeholder text for the input area based on language."""
    placeholders = {
        "english": "Share what's on your mind...",
        "arabic": "شارك ما يدور في ذهنك...",
        "french": "Partagez ce qui vous préoccupe...",
    }
    return placeholders.get(language, placeholders["english"])


def get_button_text(language):
    """Get button text based on language."""
    texts = {"english": "Send", "arabic": "إرسال", "french": "Envoyer"}
    return texts.get(language, texts["english"])


def get_thinking_text(language):
    """Get thinking spinner text based on language."""
    texts = {
        "english": "EchoMind is reflecting on your message...",
        "arabic": "إيكو مايند يفكر في رسالتك...",
        "french": "EchoMind réfléchit à votre message...",
    }
    return texts.get(language, texts["english"])


def get_sources_text(language):
    """Get sources expander text based on language."""
    texts = {
        "english": "View sources EchoMind consulted",
        "arabic": "عرض المصادر التي استشارها إيكو مايند",
        "french": "Voir les sources consultées par EchoMind",
    }
    return texts.get(language, texts["english"])


def get_clear_text(language):
    """Get clear conversation button text based on language."""
    texts = {
        "english": "Clear Conversation",
        "arabic": "مسح المحادثة",
        "french": "Effacer la conversation",
    }
    return texts.get(language, texts["english"])


def get_reflection_text(language):
    """Get reflection button text based on language."""
    texts = {
        "english": "✨ Generate Reflection",
        "arabic": "✨ إنشاء تفكير",
        "french": "✨ Générer une réflexion",
    }
    return texts.get(language, texts["english"])


def get_not_enough_history_text(language):
    """Get message for not enough history for reflection."""
    texts = {
        "english": "We need to chat a bit more before I can offer a meaningful reflection.",
        "arabic": "نحتاج إلى الدردشة قليلاً أكثر قبل أن أتمكن من تقديم تفكير مفيد.",
        "french": "Nous devons discuter un peu plus avant que je puisse offrir une réflexion significative.",
    }
    return texts.get(language, texts["english"])


def save_conversation(conversation_history, reflection=None):
    """Save the conversation history to a file."""
    try:
        data = {"messages": conversation_history, "reflection": reflection}
        os.makedirs("conversations", exist_ok=True)
        filename = (
            f"conversations/conversation_{len(os.listdir('conversations')) + 1}.json"
        )
        with open(filename, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        return True
    except Exception as e:
        st.error(f"Failed to save conversation: {str(e)}")
        return False


def main():
    # Header
    st.markdown("<h1 class='app-header'>EchoMind</h1>", unsafe_allow_html=True)
    st.markdown(
        "<p class='app-subtitle'>A calming presence for your mental wellbeing journey</p>",
        unsafe_allow_html=True,
    )

    # Check for API key
    gemini_api_key = os.environ.get("GEMINI_API_KEY")

    if not gemini_api_key:
        st.error(
            "Gemini API key not found. Please add it to your .env file as GEMINI_API_KEY."
        )
        return

    # Initialize session state
    if "messages" not in st.session_state:
        st.session_state.messages = []

    if "language" not in st.session_state:
        st.session_state.language = "english"

    if "reflection" not in st.session_state:
        st.session_state.reflection = None

    # Language selector
    language_options = {
        lang_info["name"]: lang for lang, lang_info in SUPPORTED_LANGUAGES.items()
    }
    selected_language_name = st.selectbox(
        "Select Language / اختر اللغة / Choisir la langue",
        options=list(language_options.keys()),
        index=list(language_options.keys()).index(
            SUPPORTED_LANGUAGES[st.session_state.language]["name"]
        ),
        key="language_selector",
    )

    # Update session language when changed
    selected_language = language_options[selected_language_name]
    if selected_language != st.session_state.language:
        st.session_state.language = selected_language
        # Force rerun to update UI with new language
        st.rerun()

    # Show welcome message if no messages yet
    if len(st.session_state.messages) == 0:
        welcome_html = WELCOME_MESSAGES.get(
            st.session_state.language, WELCOME_MESSAGES["english"]
        )
        st.markdown(welcome_html, unsafe_allow_html=True)

    # Display chat messages
    chat_container = st.container()
    with chat_container:
        for message in st.session_state.messages:
            role = message["role"]
            content = message["content"]

            if role == "user":
                st.markdown(
                    f"<div class='user-message'>{content}</div>",
                    unsafe_allow_html=True,
                )
            else:
                st.markdown(
                    f"<div class='assistant-message'>{content}</div>",
                    unsafe_allow_html=True,
                )

        # Display reflection if available
        if st.session_state.reflection:
            st.markdown(
                f"<div class='reflection-container'>✨ <strong>Reflection:</strong> {st.session_state.reflection}</div>",
                unsafe_allow_html=True,
            )

    # User input
    with st.container():
        with st.form(key="user_input_form", clear_on_submit=True):
            placeholder_text = get_placeholder_text(st.session_state.language)
            user_query = st.text_area(
                placeholder_text,
                height=100,
                key="user_input",
                label_visibility="collapsed",
            )
            col1, col2 = st.columns([4, 1])
            with col2:
                button_text = get_button_text(st.session_state.language)
                submit_button = st.form_submit_button(label=button_text)

    # Action buttons row
    col1, col2, col3 = st.columns(3)

    # Reflection button
    with col1:
        reflection_text = get_reflection_text(st.session_state.language)
        reflection_button = st.button(
            reflection_text,
            disabled=len(st.session_state.messages) < 4,
            key="reflection_button",
            type="primary",
            help="Generate a positive reflection based on your conversation",
        )

    # Clear conversation button
    with col2:
        clear_text = get_clear_text(st.session_state.language)
        clear_button = st.button(
            clear_text,
            disabled=len(st.session_state.messages) < 1,
            key="clear_button",
            help="Clear the entire conversation history",
        )

    # Save conversation button
    with col3:
        save_text = "Save Conversation"
        save_button = st.button(
            save_text,
            disabled=len(st.session_state.messages) < 2,
            key="save_button",
            help="Save this conversation to a file",
        )

    # Process reflection button
    if reflection_button and len(st.session_state.messages) >= 4:
        thinking_text = get_thinking_text(st.session_state.language)
        with st.spinner(thinking_text):
            reflection_result = generate_positive_reflection(
                st.session_state.messages, language=st.session_state.language
            )
            st.session_state.reflection = reflection_result["reflection"]
            st.rerun()

    # Process clear button
    if clear_button:
        st.session_state.messages = []
        st.session_state.reflection = None
        st.rerun()

    # Process save button
    if save_button and len(st.session_state.messages) >= 2:
        success = save_conversation(
            st.session_state.messages, st.session_state.reflection
        )
        if success:
            st.success("Conversation saved successfully!")

    # Process user input
    if submit_button and user_query:
        # Add user message to history
        st.session_state.messages.append({"role": "user", "content": user_query})

        # Clear any previous reflection when new message is sent
        st.session_state.reflection = None

        # Show spinner while processing
        thinking_text = get_thinking_text(st.session_state.language)
        with st.spinner(thinking_text):
            # Call the therapeutic response function with conversation history and language
            result = generate_therapeutic_response(
                user_query,
                conversation_history=st.session_state.messages[
                    :-1
                ],  # Exclude the current message
                language=st.session_state.language,
            )
            response_text = result["response"]

            # Add AI response to history
            st.session_state.messages.append(
                {"role": "assistant", "content": response_text}
            )

        # Force a rerun to display the new messages
        st.rerun()


if __name__ == "__main__":
    main()
