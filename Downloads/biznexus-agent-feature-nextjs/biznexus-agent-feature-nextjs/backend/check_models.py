import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()

api_key = os.getenv("GOOGLE_API_KEY")
if not api_key:
    print("❌ Error: API Key not found in .env file.")
else:
    print(f"✅ Found API Key: {api_key[:5]}... (hidden)")
    genai.configure(api_key=api_key)

    print("\n🔍 Scanning for available models...")
    try:
        available_models = []
        for m in genai.list_models():
            if 'generateContent' in m.supported_generation_methods:
                print(f" - {m.name}")
                available_models.append(m.name)

        if not available_models:
            print("\n⚠️ No chat models found. Your API key might be invalid or region-blocked.")
        else:
            print(f"\n✅ SUCCESS! Update main.py line 13 to use: '{available_models[0].split('/')[-1]}'")

    except Exception as e:
        print(f"\n❌ Connection failed: {e}")