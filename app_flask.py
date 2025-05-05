import os
import json
from flask import Flask, render_template, request, jsonify, session
from flask_session import Session
from dotenv import load_dotenv

from therapeutic_assistant import (
    generate_therapeutic_response,
    generate_positive_reflection,
    SUPPORTED_LANGUAGES,
)

# Load environment variables
load_dotenv()

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "echomind_default_secret_key")

# Use Flask's built-in session on Windows, Flask-Session with Redis on other platforms
if os.name == "nt":
    # Use Flask's built-in cookie-based sessions (no Flask-Session)
    pass
else:
    # Use Flask-Session with Redis for non-Windows
    app.config["SESSION_TYPE"] = "redis"
    app.config["SESSION_PERMANENT"] = True
    app.config["SESSION_USE_SIGNER"] = True
    Session(app)


@app.route("/")
def index():
    """Main page - chat interface."""
    # Initialize session variables if not present
    if "messages" not in session:
        session["messages"] = []
    if "language" not in session:
        session["language"] = "english"
    if "reflection" not in session:
        session["reflection"] = None

    # Get language info for UI elements
    language = session["language"]
    language_info = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["english"])

    # Prepare language options for the dropdown
    language_options = [
        (lang, info["name"]) for lang, info in SUPPORTED_LANGUAGES.items()
    ]

    return render_template(
        "index.html",
        messages=session["messages"],
        reflection=session["reflection"],
        language=language,
        language_name=language_info["name"],
        language_options=language_options,
        welcome_message=get_welcome_message(language),
    )


@app.route("/api/send_message", methods=["POST"])
def send_message():
    """API endpoint to send a message and get a response."""
    data = request.json
    user_message = data.get("message", "")
    language = session.get("language", "english")

    if not user_message:
        return jsonify({"error": "Message is required"}), 400

    # Add user message to history
    messages = session.get("messages", [])
    messages.append({"role": "user", "content": user_message})
    session["messages"] = messages

    # Clear any previous reflection when new message is sent
    session["reflection"] = None

    # Generate response
    try:
        result = generate_therapeutic_response(
            user_message,
            conversation_history=messages[:-1],  # Exclude the current message
            language=language,
        )

        response_text = result["response"]
        sources = result["sources"]

        # Add AI response to history
        messages.append({"role": "assistant", "content": response_text})
        session["messages"] = messages

        return jsonify({"response": response_text, "sources": sources})

    except Exception as e:
        return jsonify({"error": f"Error generating response: {str(e)}"}), 500


@app.route("/api/generate_reflection", methods=["POST"])
def generate_reflection():
    """API endpoint to generate a reflection based on conversation history."""
    messages = session.get("messages", [])
    language = session.get("language", "english")

    if len(messages) < 4:
        return jsonify({"error": get_not_enough_history_text(language)}), 400

    try:
        reflection_result = generate_positive_reflection(messages, language=language)

        reflection_text = reflection_result["reflection"]
        session["reflection"] = reflection_text

        return jsonify({"reflection": reflection_text})

    except Exception as e:
        return jsonify({"error": f"Error generating reflection: {str(e)}"}), 500


@app.route("/api/clear_conversation", methods=["POST"])
def clear_conversation():
    """API endpoint to clear the conversation history."""
    session["messages"] = []
    session["reflection"] = None
    return jsonify({"status": "cleared"})


@app.route("/api/set_language", methods=["POST"])
def set_language():
    """API endpoint to change the interface language."""
    data = request.json
    language = data.get("language")

    if language not in SUPPORTED_LANGUAGES:
        return jsonify({"error": "Unsupported language"}), 400

    session["language"] = language
    return jsonify({"status": "language updated"})


# Helper functions for multilingual support
def get_welcome_message(language):
    """Get welcome message based on language."""
    welcome_messages = {
        "english": """
            <h3>Welcome to EchoMind</h3>
            <p>I'm here to listen, support, and offer guidance based on therapeutic principles. 
            Share your thoughts, concerns, or feelings, and I'll respond with empathy and understanding.</p>
            <p>How are you feeling today?</p>
        """,
        "arabic": """
            <h3>مرحبًا بك في إيكو مايند</h3>
            <p>أنا هنا للاستماع والدعم وتقديم التوجيه بناءً على المبادئ العلاجية.
            شارك أفكارك أو مخاوفك أو مشاعرك، وسأرد بتعاطف وتفهم.</p>
            <p>كيف تشعر اليوم؟</p>
        """,
        "french": """
            <h3>Bienvenue à EchoMind</h3>
            <p>Je suis là pour écouter, soutenir et offrir des conseils basés sur des principes thérapeutiques.
            Partagez vos pensées, préoccupations ou sentiments, et je répondrai avec empathie et compréhension.</p>
            <p>Comment vous sentez-vous aujourd'hui ?</p>
        """,
    }
    return welcome_messages.get(language, welcome_messages["english"])


def get_placeholder_text(language):
    """Get placeholder text for the input area based on language."""
    placeholders = {
        "english": "Share what's on your mind...",
        "arabic": "شارك ما يدور في ذهنك...",
        "french": "Partagez ce qui vous préoccupe...",
    }
    return placeholders.get(language, placeholders["english"])


def get_not_enough_history_text(language):
    """Get message for not enough history for reflection."""
    texts = {
        "english": "We need to chat a bit more before I can offer a meaningful reflection.",
        "arabic": "نحتاج إلى الدردشة قليلاً أكثر قبل أن أتمكن من تقديم تفكير مفيد.",
        "french": "Nous devons discuter un peu plus avant que je puisse offrir une réflexion significative.",
    }
    return texts.get(language, texts["english"])


if __name__ == "__main__":
    # Check for API key
    gemini_api_key = os.environ.get("GEMINI_API_KEY")
    if not gemini_api_key:
        print(
            "Gemini API key not found. Please add it to your .env file as GEMINI_API_KEY."
        )
    else:
        # Check for AstraDB credentials - warning only, not blocking
        astra_token = os.environ.get("ASTRA_DB_APPLICATION_TOKEN")
        astra_endpoint = os.environ.get("ASTRA_DB_API_ENDPOINT")

        if not (astra_token and astra_endpoint):
            print(
                "Some AstraDB credentials are missing. The app will run, but without knowledge base access."
            )
            print(
                "For full functionality, please add ASTRA_DB_APPLICATION_TOKEN and ASTRA_DB_API_ENDPOINT to your .env file."
            )

        app.run(debug=True)
