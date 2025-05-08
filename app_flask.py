import os
import json
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_session import Session
from dotenv import load_dotenv
from werkzeug.security import generate_password_hash, check_password_hash

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

# Mock user database - in production, use a real database
users_db = {}


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
    if "tts_enabled" not in session:
        session["tts_enabled"] = False
    if "temperature" not in session:
        session["temperature"] = 0.3  # Default temperature for the LLM
    if "theme" not in session:
        session["theme"] = "light"  # Default theme

    # Get language info for UI elements
    language = session["language"]
    language_info = SUPPORTED_LANGUAGES.get(language, SUPPORTED_LANGUAGES["english"])

    # Prepare language options for the dropdown
    language_options = [
        (lang, info["name"]) for lang, info in SUPPORTED_LANGUAGES.items()
    ]

    # Get logged in user if available
    current_user = session.get("user", None)

    return render_template(
        "index.html",
        messages=session["messages"],
        reflection=session["reflection"],
        language=language,
        language_name=language_info["name"],
        language_options=language_options,
        welcome_message=get_welcome_message(language),
        tts_enabled=session["tts_enabled"],
        temperature=session["temperature"],
        current_user=current_user,
        theme=session["theme"],
    )


@app.route("/api/send_message", methods=["POST"])
def send_message():
    """API endpoint to send a message and get a response."""
    data = request.json
    user_message = data.get("message", "")
    language = session.get("language", "english")
    temperature = session.get(
        "temperature", 0.3
    )  # Get temperature setting from session

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
            temperature=temperature,  # Pass temperature to the function
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
    temperature = session.get(
        "temperature", 0.3
    )  # Get temperature setting from session

    if len(messages) < 4:
        return jsonify({"error": get_not_enough_history_text(language)}), 400

    try:
        reflection_result = generate_positive_reflection(
            messages,
            language=language,
            temperature=temperature,  # Pass temperature to the function
        )

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


@app.route("/api/set_tts", methods=["POST"])
def set_tts():
    """API endpoint to toggle text-to-speech setting."""
    data = request.json
    tts_enabled = data.get("enabled", False)

    # Update session with the new TTS setting
    session["tts_enabled"] = bool(tts_enabled)
    return jsonify({"status": "tts setting updated"})


@app.route("/api/set_temperature", methods=["POST"])
def set_temperature():
    """API endpoint to adjust the LLM temperature (creativity level)."""
    data = request.json
    temperature = data.get("temperature")

    # Validate temperature value
    try:
        temperature = float(temperature)
        if temperature < 0.0 or temperature > 1.0:
            return jsonify({"error": "Temperature must be between 0.0 and 1.0"}), 400
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid temperature value"}), 400

    # Update session with the new temperature setting
    session["temperature"] = temperature
    return jsonify({"status": "temperature updated", "temperature": temperature})


@app.route("/api/set_theme", methods=["POST"])
def set_theme():
    """API endpoint to toggle theme (dark/light mode)."""
    data = request.json
    theme = data.get("theme", "light")

    if theme not in ["light", "dark"]:
        return jsonify({"error": "Invalid theme value"}), 400

    session["theme"] = theme
    return jsonify({"status": "theme updated"})


@app.route("/api/auth/signup", methods=["POST"])
def signup():
    """API endpoint to register a new user."""
    data = request.json
    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    # Basic validation
    if not all([name, email, password]):
        return jsonify({"error": "All fields are required"}), 400

    if email in users_db:
        return jsonify({"error": "User already exists"}), 400

    # Hash the password
    hashed_password = generate_password_hash(password)

    # In production, store in a real database
    users_db[email] = {"name": name, "password": hashed_password}

    # Create user session
    session["user"] = {"email": email, "name": name}

    return jsonify({"message": "User created successfully", "username": name})


@app.route("/api/auth/login", methods=["POST"])
def login():
    """API endpoint to log in a user."""
    data = request.json
    email = data.get("email")
    password = data.get("password")

    # Basic validation
    if not all([email, password]):
        return jsonify({"error": "Email and password are required"}), 400

    user = users_db.get(email)
    if not user or not check_password_hash(user["password"], password):
        return jsonify({"error": "Invalid email or password"}), 401

    # Create user session
    session["user"] = {"email": email, "name": user["name"]}

    return jsonify({"message": "Login successful", "username": user["name"]})


@app.route("/api/auth/logout", methods=["POST"])
def logout():
    """API endpoint to log out a user."""
    # Clear user session
    session.pop("user", None)
    return jsonify({"message": "Logout successful"})


@app.route("/api/auth/status", methods=["GET"])
def auth_status():
    """API endpoint to check authentication status."""
    user = session.get("user")
    if user:
        return jsonify(
            {
                "isAuthenticated": True,
                "user": {"email": user["email"], "name": user["name"]},
            }
        )
    else:
        return jsonify({"isAuthenticated": False})


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
