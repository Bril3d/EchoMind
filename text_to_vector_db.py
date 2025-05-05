import os
import glob
import uuid
from typing import List, Dict, Any
import numpy as np
from sentence_transformers import SentenceTransformer
from dotenv import load_dotenv
from astrapy.info import CollectionDefinition
from astrapy.constants import VectorMetric

# Import our AstraDB connection function
from astra_connection import connect_to_astradb

# Load environment variables
load_dotenv()

# Configuration
EMBEDDING_MODEL = "all-MiniLM-L6-v2"  # Model for generating embeddings
CHUNK_SIZE = 1000  # Characters per chunk
CHUNK_OVERLAP = 200  # Overlap between chunks
VECTOR_DIMENSION = 384  # Dimension of the embeddings from MiniLM-L6-v2


def setup_vector_collection(db, collection_name: str = "text_vectors"):
    """
    Create a collection in AstraDB for storing vector embeddings if it doesn't exist.

    Args:
        db: AstraDB database client
        collection_name: Name of the collection to create
    """
    # Check if collection exists
    collections = db.list_collection_names()

    if collection_name not in collections:
        # Create the vector collection
        collection = db.create_collection(
            collection_name,
            definition=(
                CollectionDefinition.builder()
                .set_vector_dimension(VECTOR_DIMENSION)
                .set_vector_metric(VectorMetric.COSINE)
                .build()
            ),
        )
        print(f"Vector collection '{collection_name}' created")
    else:
        print(f"Vector collection '{collection_name}' already exists")


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
                    "_id": str(uuid.uuid4()),
                    "file_path": os.path.basename(file_path),
                    "chunk_index": i,
                    "chunk_text": chunk,
                    "$vector": embedding.tolist(),
                }
            )

    print(f"Processed {len(text_files)} files, created {len(all_chunks)} chunks")
    return all_chunks


def store_in_astradb(
    db,
    chunks: List[Dict[str, Any]],
    collection_name: str = "text_vectors",
):
    """
    Store chunks and embeddings in AstraDB.

    Args:
        db: AstraDB database client
        chunks: List of dictionaries containing chunks and embeddings
        collection_name: Name of the collection to store in
    """
    # Get the collection
    collection = db.get_collection(collection_name)

    # Insert each chunk
    count = 0
    batch_size = 10

    for i in range(0, len(chunks), batch_size):
        batch = chunks[i : i + batch_size]
        collection.insert_many(batch)

        count += len(batch)
        print(f"Inserted {count}/{len(chunks)} chunks")

    print(f"Successfully stored {count} chunks in AstraDB")


def search_similar_text(
    db,
    query: str,
    model_name: str = EMBEDDING_MODEL,
    collection_name: str = "text_vectors",
    limit: int = 5,
):
    """
    Search for text similar to the query in the vector database.

    Args:
        db: AstraDB database client
        query: Text to search for
        model_name: Name of the SentenceTransformer model to use
        collection_name: Name of the collection to search in
        limit: Maximum number of results to return

    Returns:
        List of similar text chunks
    """
    # Generate embedding for the query
    model = SentenceTransformer(model_name)
    query_embedding = model.encode(query)

    # Get the collection
    collection = db.get_collection(collection_name)

    # Search for similar chunks using vector search
    cursor = collection.find(
        {},  # No filter criteria
        sort={"$vector": query_embedding.tolist()},
        limit=limit,
        include_similarity=True,
        projection=["file_path", "chunk_index", "chunk_text"],
    )

    # Convert cursor to list
    return list(cursor)


def main():
    # Connect to AstraDB
    try:
        db = connect_to_astradb()

        # Setup the vector collection
        setup_vector_collection(db)

        # Process text files from the given directory
        directory_path = input("Enter the directory containing .txt files: ")
        chunks = process_text_files(directory_path)

        if chunks:
            # Store the chunks in AstraDB
            store_in_astradb(db, chunks)

            # Demo search
            while True:
                query = input("\nEnter a search query (or 'quit' to exit): ")
                if query.lower() == "quit":
                    break

                results = search_similar_text(db, query)
                print("\nSearch results:")
                for i, result in enumerate(results, 1):
                    print(f"\n{i}. From: {result['file_path']}")
                    print(f"Chunk: {result['chunk_text'][:200]}...")

    except Exception as e:
        print(f"Error: {e}")


if __name__ == "__main__":
    main()
