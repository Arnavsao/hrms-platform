from supabase import create_client, Client
from app.core.config import settings

supabase_url = settings.SUPABASE_URL
supabase_key = settings.SUPABASE_KEY

def get_supabase_client() -> Client:
    """
    Creates and returns a Supabase client instance.
    This function can be used as a dependency in FastAPI routes
    to provide a Supabase client to the endpoint.
    """
    return create_client(supabase_url, supabase_key)
