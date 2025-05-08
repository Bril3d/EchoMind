import os
import google.generativeai as genai
from dotenv import load_dotenv
from text_to_vector_db import search_similar_text
from astra_connection import connect_to_astradb

# Load environment variables
load_dotenv()

# Configure Gemini API
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
if not GEMINI_API_KEY:
    raise ValueError("GEMINI_API_KEY environment variable is required")

genai.configure(api_key=GEMINI_API_KEY)

# Define the model name
GEMINI_MODEL = "gemini-2.0-flash"  # Using the currently available model name

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
- If the context is in English but you need to respond in another language, translate the key insights before incorporating them

## CONTEXT FROM KNOWLEDGE BASE:
{context}

## PERSON'S MESSAGE:
{query}

Now respond as EchoMind, drawing on the relevant knowledge provided in the context, but maintaining your therapeutic, supportive persona throughout. Your response must be in {language}.
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


def generate_therapeutic_response(
    user_query: str,
    top_k: int = 3,
    conversation_history=None,
    language="english",
    temperature=0.3,
):
    """
    Retrieve relevant text chunks from AstraDB based on the user query,
    and use Gemini to generate a therapeutic response using those chunks as context.

    Args:
        user_query: The user's question or concern
        top_k: Number of relevant chunks to retrieve (default: 3)
        conversation_history: Optional list of previous messages for context
        language: Language for the response (default: english)
        temperature: Controls the randomness of responses (0.0 to 1.0, default: 0.3)
                     Lower values are more deterministic, higher values more creative

    Returns:
        A therapeutic response from Gemini
    """
    try:
        # Set default language if not supported
        if language not in SUPPORTED_LANGUAGES:
            language = "english"

        language_info = SUPPORTED_LANGUAGES[language]
        language_name = language_info["name"]

        # Set up context and sources
        context = ""
        sources = []

        try:
            # Connect to AstraDB
            db = connect_to_astradb()

            # Retrieve relevant chunks from the vector database
            relevant_chunks = search_similar_text(
                db=db, query=user_query, limit=top_k, collection_name="text_vectors"
            )

            # Extract the text from the chunks
            context_texts = [chunk["chunk_text"] for chunk in relevant_chunks]

            # Format source information for reference
            sources = [
                f"From: {chunk['file_path']}, Chunk: {chunk['chunk_index']}"
                for chunk in relevant_chunks
            ]

            # Combine the chunks into a single context
            context = "\n\n".join(context_texts)

        except Exception as db_error:
            # Log the error but continue without database content
            print(f"AstraDB connection error: {str(db_error)}")
            db_error_messages = {
                "english": "Note: I couldn't access my knowledge base at the moment, but I'll still do my best to help you.",
                "arabic": "ملاحظة: لم أتمكن من الوصول إلى قاعدة معرفتي في الوقت الحالي، لكنني سأبذل قصارى جهدي لمساعدتك.",
                "french": "Remarque: Je n'ai pas pu accéder à ma base de connaissances pour le moment, mais je ferai de mon mieux pour vous aider.",
            }
            context = db_error_messages.get(language, db_error_messages["english"])

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
            context=context, query=user_query, language=language_name
        )

        # Add conversation history to the prompt if available
        if conversation_context:
            prompt = prompt.replace(
                "## CONTEXT FROM KNOWLEDGE BASE:",
                f"{conversation_context}## CONTEXT FROM KNOWLEDGE BASE:",
            )

        # Initialize Gemini model
        model = genai.GenerativeModel(GEMINI_MODEL)

        # Generate the response with the specified temperature
        generation_config = {"temperature": temperature}
        response = model.generate_content(prompt, generation_config=generation_config)

        # Return the response and sources
        return {"response": response.text, "sources": sources}

    except Exception as e:
        error_messages = {
            "english": f"I'm sorry, I encountered an error: {str(e)}",
            "arabic": f"أنا آسف، لقد واجهت خطأ: {str(e)}",
            "french": f"Je suis désolé, j'ai rencontré une erreur: {str(e)}",
        }

        error_msg = error_messages.get(language, error_messages["english"])

        return {"response": error_msg, "sources": []}


def generate_positive_reflection(
    conversation_history, language="english", temperature=0.3
):
    """
    Analyze the user's messages from the conversation history and generate
    a short positive reflection or takeaway using Gemini.

    Args:
        conversation_history: List of message dictionaries with 'role' and 'content' keys
        language: Language for the reflection (default: english)
        temperature: Controls the randomness of responses (0.0 to 1.0, default: 0.3)
                     Lower values are more deterministic, higher values more creative

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

        # Initialize Gemini model
        model = genai.GenerativeModel(GEMINI_MODEL)

        # Generate the reflection with the specified temperature
        generation_config = {"temperature": temperature}
        response = model.generate_content(prompt, generation_config=generation_config)

        return {"reflection": response.text}

    except Exception as e:
        error_messages = {
            "english": f"I couldn't generate a reflection at this time: {str(e)}",
            "arabic": f"لم أتمكن من إنشاء تفكير في هذا الوقت: {str(e)}",
            "french": f"Je n'ai pas pu générer une réflexion pour le moment: {str(e)}",
        }

        error_msg = error_messages.get(language, error_messages["english"])

        return {"reflection": error_msg}


def main():
    """
    Interactive therapeutic assistant using AstraDB and Gemini with language support.
    """
    print("🌈 EchoMind Therapeutic Assistant")
    print("Available languages: English (en), Arabic (ar), French (fr)")

    # Get language preference
    lang_code = input("Enter language code (en/ar/fr) [default: en]: ").lower()

    # Map language code to language name
    language = "english"
    for lang, info in SUPPORTED_LANGUAGES.items():
        if info["code"] == lang_code:
            language = lang
            break

    lang_info = SUPPORTED_LANGUAGES[language]

    print(f"\nLanguage set to: {lang_info['name']}")
    print("Type 'quit' to exit at any time.\n")
    print("Type 'reflect' to get a positive reflection on your conversation so far.\n")

    # Store conversation history
    conversation_history = []

    while True:
        user_input = input(f"\n{lang_info['welcome']} ")

        # Check for exit command
        if user_input.lower() in ["quit", "exit", "bye"]:
            # Generate a reflection if there's enough conversation history
            if len(conversation_history) >= 4:  # At least 2 user messages
                print("\nBefore you go, here's a small reflection...")
                reflection = generate_positive_reflection(
                    conversation_history, language
                )
                print(f"\n✨ {reflection['reflection']}")

            print(lang_info["bye_message"])
            break

        # Check for reflection request
        if user_input.lower() in ["reflect", "summary", "reflection"]:
            if len(conversation_history) >= 4:  # At least 2 user messages
                print(f"\n{lang_info['thinking']}")
                reflection = generate_positive_reflection(
                    conversation_history, language
                )
                print(f"\n✨ {reflection['reflection']}")
            else:
                no_reflection_messages = {
                    "english": "We need to chat a bit more before I can offer a meaningful reflection.",
                    "arabic": "نحتاج إلى الدردشة قليلاً أكثر قبل أن أتمكن من تقديم تفكير مفيد.",
                    "french": "Nous devons discuter un peu plus avant que je puisse offrir une réflexion significative.",
                }
                print(
                    no_reflection_messages.get(
                        language, no_reflection_messages["english"]
                    )
                )
            continue

        # Add user message to history
        conversation_history.append({"role": "user", "content": user_input})

        print(f"\n{lang_info['thinking']}")
        result = generate_therapeutic_response(
            user_input, conversation_history=conversation_history, language=language
        )

        # Add assistant response to history
        conversation_history.append(
            {"role": "assistant", "content": result["response"]}
        )

        print("\n--- EchoMind ---")
        print(result["response"])

        if result["sources"]:
            print("\n--- Sources ---")
            for source in result["sources"]:
                print(f"• {source}")


if __name__ == "__main__":
    main()
