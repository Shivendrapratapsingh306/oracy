"""Optional MongoDB Atlas connector for Oracy.

The current account/interview repositories still use PostgreSQL. This module
provides a safe, explicit Atlas connection for the next migration step and a
readiness endpoint to verify connectivity without exposing credentials.
"""
from functools import lru_cache
from pymongo import MongoClient
from pymongo.database import Database
from app.core.config import settings


@lru_cache(maxsize=1)
def get_mongo_client() -> MongoClient:
    if not settings.mongodb_uri.strip():
        raise RuntimeError("MONGODB_URI is not configured")
    return MongoClient(settings.mongodb_uri, serverSelectionTimeoutMS=5000)


def get_mongo_database() -> Database:
    return get_mongo_client()[settings.mongodb_database]
