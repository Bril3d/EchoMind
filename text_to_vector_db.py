import os
import glob
import uuid
from typing import List, Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer
from cassandra.cluster import Cluster, Session
from cassandra.auth import PlainTextAuthProvider
from dotenv import load_dotenv
import cassandra

# Import our AstraDB connection function
from astra_connection import connect_to_astradb

# Set the event loop policy before any Cassandra operations
import eventlet

# This ensures the eventlet reactor is used for the Cassandra driver
if "EVENTLET_REACTOR_SETUP" not in globals():
    cassandra.io.eventletreactor.EventletConnection.initialize_reactor()
    EVENTLET_REACTOR_SETUP = True

# Load environment variables
load_dotenv()

# Configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Model for generating embeddings
CHUNK_SIZE = 1000  # Characters per chunk
CHUNK_OVERLAP = 200  # Overlap between chunks
VECTOR_DIMENSION = 384  # Dimension of the embeddings from MiniLM-L6-v2


def setup_vector_table(
    session: Session, keyspace: str, table_name: str = "text_vectors"
):
    """
    Create a table in AstraDB for storing vector embeddings if it doesn't exist.

    Args:
        session: Cassandra session object
        keyspace: Keyspace to use
        table_name: Name of the table to create
    """
    # Create the vector table if it doesn't exist
    session.execute(
        f"""
    CREATE TABLE IF NOT EXISTS {keyspace}.{table_name} (
        id uuid PRIMARY KEY,
        file_path text,
        chunk_index int,
        chunk_text text,
        embedding vector<float, {VECTOR_DIMENSION}>
    )
    """
    )

    # Create a vector index if it doesn't exist
    session.execute(
        f"""
    CREATE CUSTOM INDEX IF NOT EXISTS embedding_index ON {keyspace}.{table_name} (embedding) 
    USING 'StorageAttachedIndex'
    """
    )

    print(f"Vector table '{table_name}' is ready")


def chunk_text(
    text: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP
) -> List[str]:
    """
    Split text into overlapping chunks.

    Args:
        text: The text to chunk
        chunk_size: Size of each chunk in characters
        overlap: Overlap between chunks in characters

    Returns:
        List of text chunks
    """
    chunks = []
    if len(text) <= chunk_size:
        chunks.append(text)
    else:
        start = 0
        while start < len(text):
            end = start + chunk_size
            # If we're not at the end, try to find a space to break at
            if end < len(text):
                # Look for a space within the last 100 characters of the chunk
                space_pos = text.rfind(" ", start + chunk_size - 100, end)
                if space_pos != -1:
                    end = space_pos

            chunks.append(text[start:end].strip())
            start = end - overlap if end - overlap > start else start + 1

    return chunks


def process_text_files(
    directory_path: str, model_name: str = EMBEDDING_MODEL
) -> List[Dict[str, Any]]:
    """
    Process all .txt files in the given directory, chunk them, and generate embeddings.

    Args:
        directory_path: Path to directory containing .txt files
        model_name: Name of the SentenceTransformer model to use

    Returns:
        List of dictionaries containing file information, chunks, and embeddings
    """
    # Load the embedding model
    model = SentenceTransformer(model_name)

    # Get all .txt files in the directory
    text_files = glob.glob(os.path.join(directory_path, "*.txt"))
    if not text_files:
        print(f"No .txt files found in {directory_path}")
        return []

    all_chunks = []

    # Process each file
    for file_path in text_files:
        print(f"Processing {file_path}...")

        # Read the file
        with open(file_path, "r", encoding="utf-8") as file:
            text = file.read()

        # Chunk the text
        chunks = chunk_text(text)

        # Generate embeddings for all chunks
        embeddings = model.encode(chunks)

        # Store file info, chunks, and embeddings
        for i, (chunk, embedding) in enumerate(zip(chunks, embeddings)):
            all_chunks.append(
                {
                    "id": uuid.uuid4(),
                    "file_path": os.path.basename(file_path),
                    "chunk_index": i,
                    "chunk_text": chunk,
                    "embedding": embedding,
                }
            )

    print(f"Processed {len(text_files)} files, created {len(all_chunks)} chunks")
    return all_chunks


def store_in_astradb(
    session: Session,
    keyspace: str,
    chunks: List[Dict[str, Any]],
    table_name: str = "text_vectors",
):
    """
    Store chunks and embeddings in AstraDB.

    Args:
        session: Cassandra session object
        keyspace: Keyspace to use
        chunks: List of dictionaries containing chunks and embeddings
        table_name: Name of the table to store in
    """
    # Prepare the insert statement
    insert_stmt = session.prepare(
        f"""
        INSERT INTO {keyspace}.{table_name} 
        (id, file_path, chunk_index, chunk_text, embedding) 
        VALUES (?, ?, ?, ?, ?)
    """
    )

    # Insert each chunk
    count = 0
    for chunk in chunks:
        session.execute(
            insert_stmt,
            (
                chunk["id"],
                chunk["file_path"],
                chunk["chunk_index"],
                chunk["chunk_text"],
                chunk["embedding"].tolist(),
            ),
        )
        count += 1
        if count % 10 == 0:
            print(f"Inserted {count}/{len(chunks)} chunks")

    print(f"Successfully stored {count} chunks in AstraDB")


def search_similar_text(
    session: Session,
    keyspace: str,
    query: str,
    model_name: str = EMBEDDING_MODEL,
    table_name: str = "text_vectors",
    limit: int = 5,
):
    """
    Search for text similar to the query in the vector database.

    Args:
        session: Cassandra session object
        keyspace: Keyspace to use
        query: Text to search for
        model_name: Name of the SentenceTransformer model to use
        table_name: Name of the table to search in
        limit: Maximum number of results to return

    Returns:
        List of similar text chunks
    """
    # Generate embedding for the query
    model = SentenceTransformer(model_name)
    query_embedding = model.encode(query)

    # Search for similar chunks using ANN
    search_stmt = f"""
        SELECT file_path, chunk_index, chunk_text
        FROM {keyspace}.{table_name}
        ORDER BY embedding ANN OF ? LIMIT ?
    """

    rows = session.execute(search_stmt, (query_embedding.tolist(), limit))

    results = []
    for row in rows:
        results.append(
            {
                "file_path": row.file_path,
                "chunk_index": row.chunk_index,
                "chunk_text": row.chunk_text,
            }
        )

    return results


def main():
    # Connect to AstraDB
    try:
        session = connect_to_astradb()
        keyspace = os.environ.get("ASTRA_DB_KEYSPACE")

        if not keyspace:
            raise ValueError("ASTRA_DB_KEYSPACE environment variable is required")

        # Setup the vector table
        setup_vector_table(session, keyspace)

        # Process text files from the given directory
        directory_path = input("Enter the directory containing .txt files: ")
        chunks = process_text_files(directory_path)

        if chunks:
            # Store the chunks in AstraDB
            store_in_astradb(session, keyspace, chunks)

            # Demo search
            while True:
                query = input("\nEnter a search query (or 'quit' to exit): ")
                if query.lower() == "quit":
                    break

                results = search_similar_text(session, keyspace, query)
                print("\nSearch results:")
                for i, result in enumerate(results, 1):
                    print(f"\n{i}. From: {result['file_path']}")
                    print(f"Chunk: {result['chunk_text'][:200]}...")

        # Clean up
        session.shutdown()
        session.cluster.shutdown()

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
