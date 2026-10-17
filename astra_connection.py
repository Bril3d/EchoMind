import os
from dotenv import load_dotenv
from astrapy import DataAPIClient

# Load environment variables from .env file
load_dotenv()


_cached_db = None


def connect_to_astradb(force_reconnect: bool = False):
    """
    Connect to AstraDB using astrapy DataAPIClient.

    Required environment variables:
    - ASTRA_DB_APPLICATION_TOKEN: Your application token
    - ASTRA_DB_API_ENDPOINT: Your database API endpoint

    Returns:
        db: AstraDB database client
    """
    global _cached_db
    if _cached_db is not None and not force_reconnect:
        return _cached_db

    # Get credentials from environment variables
    token = os.environ.get("ASTRA_DB_APPLICATION_TOKEN")
    api_endpoint = os.environ.get("ASTRA_DB_API_ENDPOINT")

    # Validate required environment variables
    if not all([token, api_endpoint]):
        raise ValueError(
            "Missing required environment variables. Please ensure "
            "ASTRA_DB_APPLICATION_TOKEN and ASTRA_DB_API_ENDPOINT are set."
        )

    try:
        # Initialize the client
        client = DataAPIClient()
        # Connect to the database by providing token during get_database call
        db = client.get_database(api_endpoint, token=token)
        _cached_db = db
        return db

    except Exception as e:
        raise Exception(f"Error connecting to AstraDB: {e}")


if __name__ == "__main__":
    try:
        db = connect_to_astradb()

        # Example of how to use the database client
        # collections = db.list_collection_names()
        # print(f"Available collections: {collections}")

    except Exception as e:
        print(f"Error connecting to AstraDB: {e}")
