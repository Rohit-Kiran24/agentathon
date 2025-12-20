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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)