from supabase import create_client, Client
from app.core.config import settings
from app.core.logging import get_logger
import functools

logger = get_logger(__name__)

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

def ensure_storage_bucket_exists(bucket_name: str, supabase: Client = None) -> bool:
    """
    Ensures a Supabase storage bucket exists, creating it if necessary.

    Args:
        bucket_name: Name of the storage bucket to ensure exists
        supabase: Optional Supabase client instance. If not provided, creates a new one.

    Returns:
        True if bucket exists or was created successfully

    Raises:
        Exception: If bucket creation fails
    """
    if supabase is None:
        supabase = get_supabase_client()

    try:
        # Try to list buckets to check if it exists
        buckets_response = supabase.storage.list_buckets()

        # Handle different response formats
        buckets = buckets_response
        if hasattr(buckets_response, 'data'):
            buckets = buckets_response.data
        elif hasattr(buckets_response, 'buckets'):
            buckets = buckets_response.buckets

        # Check if bucket exists
        bucket_exists = False
        if isinstance(buckets, list):
            bucket_exists = any(
                (hasattr(bucket, 'name') and bucket.name == bucket_name) or
                (isinstance(bucket, dict) and bucket.get('name') == bucket_name)
                for bucket in buckets
            )

        if bucket_exists:
            logger.info(f"Storage bucket '{bucket_name}' already exists")
            return True

        # Create the bucket if it doesn't exist
        logger.info(f"Creating storage bucket '{bucket_name}'...")

        # Create bucket with public access and file type restrictions
        # API signature: create_bucket(id: str, options: dict)
        bucket_options = {
            "public": True,  # Make bucket public for resume access
            "allowed_mime_types": [
                "application/pdf",
                "application/msword",
                "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            ],
            "file_size_limit": 10485760  # 10MB limit
        }

        try:
            # Call create_bucket with bucket name as first arg and options as second
            response = supabase.storage.create_bucket(bucket_name, bucket_options)

            # Check for errors in response (response might be dict or object)
            if isinstance(response, dict):
                if response.get('error'):
                    error_msg = str(response.get('error'))
                    # Check if error is because bucket already exists
                    if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
                        logger.info(f"Storage bucket '{bucket_name}' already exists")
                        return True
                    raise Exception(f"Failed to create bucket: {error_msg}")
            elif hasattr(response, 'error') and response.error:
                error_msg = str(response.error)
                if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
                    logger.info(f"Storage bucket '{bucket_name}' already exists")
                    return True
                raise Exception(f"Failed to create bucket: {error_msg}")

            logger.info(f"Successfully created storage bucket '{bucket_name}'")
            return True

        except Exception as create_error:
            error_msg = str(create_error)
            # Check if error is because bucket already exists (race condition)
            if "already exists" in error_msg.lower() or "duplicate" in error_msg.lower():
                logger.info(f"Storage bucket '{bucket_name}' already exists (race condition)")
                return True

            # If creation fails, it might be a permissions issue
            # Log the error but don't fail - let the upload attempt happen
            logger.warning(
                f"Could not create bucket '{bucket_name}': {error_msg}. "
                f"Please ensure the bucket exists in your Supabase dashboard."
            )
            # Re-raise to let caller handle it
            raise

    except Exception as e:
        error_msg = str(e)
        logger.error(f"Failed to ensure storage bucket '{bucket_name}' exists: {error_msg}")
        raise
