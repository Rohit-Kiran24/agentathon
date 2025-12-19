import os
import pandas as pd
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from dotenv import load_dotenv

# 1. Configuration
load_dotenv()
genai.configure(api_key=os.getenv("GOOGLE_API_KEY"))
model = genai.GenerativeModel('gemini-2.5-flash')

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str

def get_data_context():
    """Reads CSVs and returns them as a string for the AI"""
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        inventory_path = os.path.join(base_dir, "data", "inventory.csv")
        sales_path = os.path.join(base_dir, "data", "sales.csv")

        df_inv = pd.read_csv(inventory_path)
        df_sales = pd.read_csv(sales_path)

        return f"""
        REAL-TIME INVENTORY:
        {df_inv.to_string(index=False)}

        RECENT SALES TRANSACTIONS:
        {df_sales.to_string(index=False)}
        """
    except Exception as e:
        return ""

@app.post("/api/analyze")
def analyze_query(request: QueryRequest):
    try:
        # 2. Get the Data
        context = get_data_context()
        
        # 3. The Strict System Prompt
        system_instruction = f"""
        You are BizNexus, an autonomous AI Supply Chain Manager.
        
        Here is the LIVE DATABASE content:
        {context}
        
        YOUR RULES:
        1. ANALYZE the 'current_stock' vs 'reorder_level' for every item.
        2. IF (current_stock < reorder_level): You MUST output a warning like "⚠️ ALERT: [Item Name] is low."
        3. Cite specific numbers (e.g., "Only 5 units remaining").
        4. Be concise and professional. Do not give generic textbook advice.
        """
        
        full_prompt = f"{system_instruction}\n\nUser Question: {request.query}"
        
        # 4. Ask Gemini
        response = model.generate_content(full_prompt)
        
        return {"response": response.text, "agent": "Gemini 2.5"}

    except Exception as e:
        return {"response": f"Error: {str(e)}", "agent": "System"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)