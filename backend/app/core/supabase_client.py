from supabase import create_client, Client
from app.core.config import settings
import functools

supabase_url = settings.SUPABASE_URL
supabase_key = settings.SUPABASE_KEY

# Create a singleton Supabase client
_supabase_client = None

def get_supabase_client() -> Client:
    """
    Creates and returns a Supabase client instance.
    This function can be used as a dependency in FastAPI routes
    to provide a Supabase client to the endpoint.
    """
    global _supabase_client
    if _supabase_client is None:
        _supabase_client = create_client(supabase_url, supabase_key)
    return _supabase_client
