import os
import streamlit as st
from dotenv import load_dotenv
import eventlet

# Set the event loop policy before any Cassandra operations
eventlet.monkey_patch()

from therapeutic_assistant import (
    generate_therapeutic_response,
    generate_positive_reflection,
    SUPPORTED_LANGUAGES,
)

# Load environment variables
load_dotenv()

# App configuration
st.set_page_config(
    page_title="EchoMind Therapeutic Assistant", page_icon="🧘‍♀️", layout="centered"
)

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
    .source-container {
        background-color: #f0f2f5;
        border-radius: 5px;
        padding: 10px;
        margin-top: 10px;
        font-size: 0.8em;
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

    # Check for AstraDB credentials - warning only, not blocking
    astra_db_id = os.environ.get("ASTRA_DB_ID")
    astra_keyspace = os.environ.get("ASTRA_DB_KEYSPACE")

    if not (astra_db_id and astra_keyspace):
        st.warning(
            "Some AstraDB credentials are missing. The app will run, but without knowledge base access. "
            "For full functionality, please add ASTRA_DB_ID, ASTRA_DB_REGION, ASTRA_DB_APPLICATION_TOKEN, "
            "and ASTRA_DB_KEYSPACE to your .env file."
        )

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
    with st.form(key="user_input_form", clear_on_submit=True):
        placeholder_text = get_placeholder_text(st.session_state.language)
        user_query = st.text_area(
            placeholder_text,
            height=100,
            key="user_input",
            label_visibility="collapsed",
        )
        button_text = get_button_text(st.session_state.language)
        submit_button = st.form_submit_button(label=button_text)

    # Action buttons row (outside the form)
    col1, col2 = st.columns(2)

    # Reflection button
    # Reflection button
    with col1:
        reflection_text = get_reflection_text(st.session_state.language)
        reflection_button = st.form_submit_button(
            reflection_text,
            disabled=len(st.session_state.messages) < 4,
            key="reflection_button",
            help="Generate a positive reflection based on your conversation",
        )

    # Clear conversation button
    with col2:
        clear_text = get_clear_text(st.session_state.language)
        clear_button = st.form_submit_button(
            clear_text,
            disabled=len(st.session_state.messages) < 1,
            key="clear_button",
            help="Clear the entire conversation history",
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
            sources = result["sources"]

            # Add AI response to history
            st.session_state.messages.append(
                {"role": "assistant", "content": response_text}
            )

        # Display sources in an expander after response
        if sources:
            sources_text = get_sources_text(st.session_state.language)
            with st.expander(sources_text):
                st.markdown("<div class='source-container'>", unsafe_allow_html=True)
                for source in sources:
                    st.markdown(f"• {source}")
                st.markdown("</div>", unsafe_allow_html=True)

        # Force a rerun to display the new messages
        st.rerun()


if __name__ == "__main__":
    main()
