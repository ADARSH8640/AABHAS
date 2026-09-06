import os
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

SUPABASE_URL = os.getenv("https://qlidfgyxgudykqlvltav.supabase.co")
SUPABASE_KEY = os.getenv("sb_publishable_w58lPsTZfb0VPeQeipIezw_sWpSMqPL")

if not SUPABASE_URL:
    raise ValueError("SUPABASE_URL is missing from .env")

if not SUPABASE_KEY:
    raise ValueError("SUPABASE_KEY is missing from .env")

supabase = create_client(
    SUPABASE_URL,
    SUPABASE_KEY
)

print("Supabase connection initialized successfully")
response = supabase.table("predictions").select("*").limit(1).execute()

print("Database connection works")
print(response.data)