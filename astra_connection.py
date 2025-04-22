import os
from cassandra.cluster import Cluster
from cassandra.auth import PlainTextAuthProvider
from dotenv import load_dotenv
import cassandra

# Load environment variables from .env file
load_dotenv()

# Set the event loop policy before any Cassandra operations
import eventlet
cassandra.io.eventletreactor.EventletConnection.initialize_reactor()

def connect_to_astradb():
    """
    Connect to AstraDB using token-based authentication.

    Required environment variables:
    - ASTRA_DB_ID: Your database ID
    - ASTRA_DB_REGION: Your database region
    - ASTRA_DB_APPLICATION_TOKEN: Your application token
    - ASTRA_DB_KEYSPACE: Keyspace to use (optional)

    Returns:
        session: Cassandra session object
    """
    # Get credentials from environment variables
    db_id = os.environ.get("ASTRA_DB_ID")
    db_region = os.environ.get("ASTRA_DB_REGION")
    token = os.environ.get("ASTRA_DB_APPLICATION_TOKEN")
    keyspace = os.environ.get("ASTRA_DB_KEYSPACE")

    # Validate required environment variables
    if not all([db_id, db_region, token]):
        raise ValueError(
            "Missing required environment variables. Please ensure "
            "ASTRA_DB_ID, ASTRA_DB_REGION, and ASTRA_DB_APPLICATION_TOKEN are set."
        )

    # Set up contact points for the Astra DB connection
    contact_points = [f"{db_id}-{db_region}.apps.astra.datastax.com"]
    
    # Set up authentication
    auth_provider = PlainTextAuthProvider('token', token)

    # Create cluster connection
    cluster = Cluster(
        contact_points=contact_points,
        auth_provider=auth_provider,
        port=29042,
        ssl_context=None,  # SSL context will be created automatically
        connect_timeout=10,
        control_connection_timeout=10
    )

    # Connect to the cluster
    session = cluster.connect(keyspace) if keyspace else cluster.connect()

    print(f"Connected to AstraDB cluster")
    return session


if __name__ == "__main__":
    try:
        session = connect_to_astradb()

        # Example query (uncomment to use)
        # rows = session.execute("SELECT release_version FROM system.local")
        # print(f"Cassandra version: {rows.one().release_version}")

        # Close the connection when done
        session.shutdown()
        cluster = session.cluster
        cluster.shutdown()

    except Exception as e:
        print(f"Error connecting to AstraDB: {e}")
