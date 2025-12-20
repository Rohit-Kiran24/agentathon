import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from agents import InventoryAgent, SalesAgent, MarketingAgent, GeneralAgent

# 1. Configuration
load_dotenv()

app = FastAPI()

# 2. Initialize Agents
# They automatically load keys from .env (including rotation)
inventory_agent = InventoryAgent()
sales_agent = SalesAgent()
marketing_agent = MarketingAgent()
general_agent = GeneralAgent()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class QueryRequest(BaseModel):
    query: str
    history: list[dict] = []

def route_to_agent(query: str, history: list[dict] = []):
    """
    Intelligent routing: determines which agent should handle the query.
    Returns the appropriate agent based on keywords in the query.
    """
    query_lower = query.lower()
    
    # Inventory keywords
    inventory_keywords = ['stock', 'inventory', 'reorder', 'low', 'out of stock', 
                          'warehouse', 'supply', 'supplier', 'lead time']
    
    # Sales keywords
    sales_keywords = ['sales', 'revenue', 'selling', 'sold', 'purchase', 
                      'transaction', 'bought', 'performance', 'trend']
    
    # Marketing keywords
    marketing_keywords = ['marketing', 'promote', 'campaign', 'bundle', 
                          'discount', 'strategy', 'promotion', 'advertise']
    
    # General/Greeting keywords
    general_keywords = ['hi', 'hello', 'hey', 'help', 'who are you', 'what can you do', 'greetings']
    
    # Count keyword matches
    inventory_score = sum(1 for kw in inventory_keywords if kw in query_lower)
    sales_score = sum(1 for kw in sales_keywords if kw in query_lower)
    marketing_score = sum(1 for kw in marketing_keywords if kw in query_lower)
    general_score = sum(1 for kw in general_keywords if kw in query_lower)
    
    # Route to the agent with highest score
    if general_score > 0 and general_score > max(inventory_score, sales_score, marketing_score):
        return general_agent
    elif marketing_score > 0 and marketing_score >= max(inventory_score, sales_score):
        return marketing_agent
    elif sales_score > inventory_score:
        return sales_agent
    elif inventory_score > 0:
        return inventory_agent
    else:
        # If no keywords match, check history for context or default to General
        # For now, default to General Agent which can enforce guardrails
        return general_agent

@app.post("/api/analyze")
def analyze_query(request: QueryRequest):
    """
    Main endpoint for query analysis.
    Routes the query to the appropriate specialized agent.
    """
    try:
        # Route to the appropriate agent
        agent = route_to_agent(request.query, request.history)
        
        # Let the agent analyze the query
        result = agent.analyze(request.query, request.history)
        
        return result

    except Exception as e:
        return {"response": f"Error: {str(e)}", "agent": "System"}

# --- Data Upload Endpoint ---
import pandas as pd
import io
import time
from fastapi import UploadFile, File, HTTPException
from database import get_engine

import shutil

@app.post("/api/upload")
async def upload_files(files: list[UploadFile] = File(...)):
    """
    Uploads multiple files, CLEARS old session data, saves new files to data/, and logs to SQLite.
    """
    try:
        # 1. Clear Data Directory (Session Replacement)
        # Use safe file deletion instead of rmtree to avoid Windows Access Denied errors
        data_dir = os.path.join(os.getcwd(), 'data')
        if not os.path.exists(data_dir):
            os.makedirs(data_dir)
        else:
            for filename in os.listdir(data_dir):
                file_path = os.path.join(data_dir, filename)
                try:
                    if os.path.isfile(file_path) or os.path.islink(file_path):
                        os.unlink(file_path)
                    elif os.path.isdir(file_path):
                        shutil.rmtree(file_path)
                except Exception as e:
                    print(f"Failed to delete {file_path}. Reason: {e}")

        engine = get_engine()
        results = []
        suggestions_agg = []
        
        for file in files:
            # 2. Read file content
            contents = await file.read()
            filename = file.filename.lower()
            
            # 3. Save to data/ (for Agents that read files)
            file_path = os.path.join(data_dir, filename)
            with open(file_path, "wb") as f:
                f.write(contents)
            
            # 4. Load into Pandas
            if filename.endswith(".csv"):
                df = pd.read_csv(io.BytesIO(contents))
            elif filename.endswith(".xlsx") or filename.endswith(".xls"):
                df = pd.read_excel(io.BytesIO(contents))
            elif filename.endswith(".json"):
                df = pd.read_json(io.BytesIO(contents))
            else:
                results.append(f"❌ {filename}: Unsupported format")
                continue
                
            # 5. Sanitize and Save to Database (for SQL Agent)
            clean_name = "".join(c for c in filename.split('.')[0] if c.isalnum())
            table_name = f"upload_{int(time.time())}_{clean_name}"
            
            df.to_sql(table_name, engine, if_exists='replace', index=False)
            
            # 6. Generate Stats
            row_count = len(df)
            columns = ", ".join(df.columns[:3]) # First 3 cols
            results.append(f"✅ `{table_name}` ({row_count} rows, cols: {columns}...)")
            
            suggestions_agg.append(f"Analyze {clean_name} data")

        # Craft response
        response_text = "**Session Context Updated:**\n" + "\n".join(results)
        
        return {
            "response": response_text,
            "agent": "System",
            "suggestions": suggestions_agg[:3] + ["Compare uploaded datasets"]
        }

    except Exception as e:
        return {"response": f"Upload Failed: {str(e)}", "agent": "System"}

@app.get("/api/context")
def get_context():
    """
    Returns the list of active files in the data directory.
    """
    try:
        data_dir = os.path.join(os.getcwd(), 'data')
        if not os.path.exists(data_dir):
            return {"files": []}
            
        files = [f for f in os.listdir(data_dir) if os.path.isfile(os.path.join(data_dir, f))]
        # Filter hidden files or system files if needed
        files = [f for f in files if not f.startswith('.')]
        
        return {"files": files}
    except Exception as e:
        return {"files": [], "error": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)