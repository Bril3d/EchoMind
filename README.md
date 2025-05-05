# AstraDB Python Connection

This repository contains code to connect to DataStax AstraDB using the astrapy package and environment variables, as well as tools for processing text files and storing them as vector embeddings.

## Prerequisites

- Python 3.6 or higher
- An AstraDB account and database
- Secure Connect Bundle ZIP file for your database
- Database credentials (Client ID and Client Secret)
- Google API key for Gemini (for therapeutic assistant feature)

## Installation

1. Clone this repository
2. Install required dependencies:
   ```
   pip install -r requirements.txt
   ```

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```
ASTRA_DB_APPLICATION_TOKEN=your-application-token
ASTRA_DB_API_ENDPOINT=https://your-database-id-your-region.apps.astra.datastax.com
GEMINI_API_KEY=your-gemini-api-key
```

## Basic Usage

Run the connection script to test your AstraDB connection:

```
python astra_connection.py
```

## Text Processing and Vector Storage

The `text_to_vector_db.py` script processes a directory of text files, chunks them, generates embeddings, and stores them in AstraDB as vector embeddings.

### Features

- Processes multiple .txt files in a specified directory
- Splits text into overlapping chunks for better semantic processing
- Generates embeddings using SentenceTransformer's MiniLM model
- Stores text chunks and embeddings in AstraDB as a vector database
- Provides search functionality to find semantically similar content

### Running the Text Processing Script

```
python text_to_vector_db.py
```

The script will:
1. Connect to your AstraDB database
2. Set up a vector table if it doesn't exist
3. Prompt you for a directory containing .txt files
4. Process those files, create chunks, and generate embeddings
5. Store the chunks and embeddings in AstraDB
6. Allow you to search for semantically similar content

## Therapeutic Assistant

The `therapeutic_assistant.py` script provides an interactive therapeutic assistant powered by Google's Gemini model and vector search.

### Features

- Retrieves the top 3 most relevant text chunks from AstraDB based on user query
- Uses Google's Gemini model to generate empathetic, therapeutic responses
- Incorporates retrieved text as context for more informed and helpful responses
- Provides source information for transparency
- Supports multiple languages (English, Arabic, French)
- Generates positive reflections on conversation history

### Running the Therapeutic Assistant

```
python therapeutic_assistant.py
```

The assistant will:
1. Prompt you to select your preferred language
2. Ask you to share what's on your mind
3. Search AstraDB for relevant content based on your input
4. Generate a thoughtful, therapeutic response using Gemini with the retrieved context
5. Display the response along with the sources used
6. Allow you to get a positive reflection on your conversation by typing "reflect"

## Conversation Reflection

A unique feature of EchoMind is its ability to analyze conversation history and provide insightful, positive reflections:

- Identifies recurring themes and patterns in user messages
- Highlights strengths and growth opportunities
- Offers supportive perspective that fosters hope
- Provides brief, empathetic takeaways in the user's chosen language
- Available after at least two exchanges with the assistant

How to use it:
- In CLI: Type "reflect" during your conversation
- In web app: Click the "Generate Reflection" button
- Automatic: Receive a reflection when ending a conversation

## Streamlit Web Application

The repository also includes a web-based interface built with Streamlit, providing a user-friendly way to interact with the therapeutic assistant.

### Features

- Clean, modern UI for interacting with the assistant
- Chat-like interface that maintains conversation history
- Shows sources used for generating responses
- Responsive design that works on desktop and mobile
- Multilingual support with language selector (English, Arabic, French)
- UI elements automatically adapt to the selected language
- One-click generation of positive reflections on your conversation

### Running the Streamlit App

```
streamlit run app.py
```

The web app will:
1. Start a local web server (typically at http://localhost:8501)
2. Provide a language selector to choose your preferred language
3. Display a text area for entering your thoughts or concerns
4. Generate and display calming responses based on relevant information in the vector database
5. Maintain conversation history during your session
6. Show the sources of information used in an expandable section
7. Allow generating reflections on your conversation with the "Generate Reflection" button

## Flask Web Application

The repository also includes a Flask-based version of the web interface, providing an alternative implementation of the therapeutic assistant.

### Features

- All the same features as the Streamlit version
- Built using Flask, HTML, CSS, and JavaScript
- Server-side session management with Flask-Session
- RESTful API endpoints for all app functionality

### Running the Flask App

```
python app_flask.py
```

The Flask app will:
1. Start a local web server at http://localhost:5000
2. Provide the same core functionality as the Streamlit version
3. Use server-side sessions to maintain conversation history
4. Offer a more customizable frontend implementation

## Multilingual Support

The application supports the following languages:
- English
- Arabic (العربية)
- French (Français)

The language support includes:
- UI elements (buttons, placeholders, labels)
- Therapeutic responses
- Error messages
- Welcome messages

When you select a non-English language, the system will:
1. Retrieve relevant content from the database (which may be in English)
2. Use Gemini to generate a response in your selected language
3. Translate key insights from the content into your language

## Integrating with Your Application

You can import and use the functions in your own Python files:

```python
from astra_connection import connect_to_astradb
from text_to_vector_db import process_text_files, store_in_astradb, search_similar_text
from therapeutic_assistant import generate_therapeutic_response, generate_positive_reflection

# Get a database connection
db = connect_to_astradb()

# Process text files
chunks = process_text_files("/path/to/text/files")

# Store in AstraDB
store_in_astradb(db, chunks)

# Search for similar text
results = search_similar_text(db, "your search query")

# Generate a therapeutic response in a specific language
response = generate_therapeutic_response(
    "I've been feeling anxious lately", 
    language="french"  # Use "english", "arabic", or "french"
)

# Generate a positive reflection on conversation history
conversation_history = [
    {"role": "user", "content": "I've been feeling overwhelmed lately."},
    {"role": "assistant", "content": "I understand that feeling overwhelmed can be difficult..."},
    {"role": "user", "content": "Yes, especially with work and family responsibilities."}
]
reflection = generate_positive_reflection(
    conversation_history,
    language="english"
) 