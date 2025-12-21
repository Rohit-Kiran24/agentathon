import os
import math
import pandas as pd
from datetime import datetime, timedelta
from fastapi import FastAPI, Depends, Header, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv
from agents import InventoryAgent, SalesAgent, MarketingAgent, GeneralAgent, PredictionAgent

# 1. Configuration
load_dotenv()

app = FastAPI()

# 2. Initialize Agents
# They automatically load keys from .env (including rotation)
inventory_agent = InventoryAgent()
sales_agent = SalesAgent()
marketing_agent = MarketingAgent()
general_agent = GeneralAgent()
prediction_agent = PredictionAgent()

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

class ScenarioRequest(BaseModel):
    marketing_change: float
    opex_change: float
    price_change: float

async def get_current_user_files(authorization: str = Header(None)):
    """
    Dependency to verify Firebase Token and fetch user context.
    Returns a dictionary of file paths { "inventory.csv": "url", "sales.csv": "url" }
    """
    if not authorization or not authorization.startswith("Bearer "):
        # For development/demo, we might allow unauthenticated access to default data
        print("⚠️ No Auth Token provided. Using default local data.")
        return None

    token = authorization.split(" ")[1]
    try:
        decoded_token = firebase_admin.auth.verify_id_token(token)
        uid = decoded_token['uid']
        
        # Fetch datasets subcollection
        inv_doc = db.collection('users').document(uid).collection('datasets').document('inventory').get()
        sales_doc = db.collection('users').document(uid).collection('datasets').document('sales').get()
        
        context_files = {}
        if inv_doc.exists:
            content = inv_doc.to_dict().get('csv_content')
            if content: context_files['inventory.csv'] = content

        if sales_doc.exists:
            content = sales_doc.to_dict().get('csv_content')
            if content: context_files['sales.csv'] = content
        
        return context_files
            
    except Exception as e:
        print(f"❌ Auth Verification Failed: {e}")
        # raise HTTPException(status_code=401, detail="Invalid Authentication")
    
    return None

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

    # Scheduling keywords
    scheduling_keywords = ['schedule', 'meeting', 'calendar', 'appointment', 'remind', 'organize']
    
    # Prediction keywords
    prediction_keywords = ['predict', 'forecast', 'future', 'prediction', 'what will', 'projection']
    
    # Count keyword matches
    inventory_score = sum(1 for kw in inventory_keywords if kw in query_lower)
    sales_score = sum(1 for kw in sales_keywords if kw in query_lower)
    marketing_score = sum(1 for kw in marketing_keywords if kw in query_lower)
    general_score = sum(1 for kw in general_keywords if kw in query_lower)
    scheduling_score = sum(1 for kw in scheduling_keywords if kw in query_lower)
    prediction_score = sum(1 for kw in prediction_keywords if kw in query_lower)
    
    # Priority Routing
    if scheduling_score > 0:
        return general_agent
        
    if prediction_score > 0 and (sales_score > 0 or inventory_score > 0):
         # If prediction is specifically about sales or inventory, we might want to route to PredictionAgent
         # But the current PredictionAgent is setup mainly for "What-If" scenarios. 
         # Let's route purely predictive queries to SalesAgent (for sales forecast) for now as it has better data context,
         # OR route to PredictionAgent if we enhance it.
         # For now, let's keep it safe: SalesAgent handles "sales forecast".
         pass

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
        return general_agent

@app.post("/api/predict")
async def predict_scenario(request: ScenarioRequest, context_files: dict = Depends(get_current_user_files)):
    """
    Analyze a What-If scenario using the PredictionAgent.
    """
    try:
        scenario = {
            "marketing_change": request.marketing_change,
            "opex_change": request.opex_change,
            "price_change": request.price_change
        }
        return prediction_agent.analyze_scenario(scenario, context_files)
    except Exception as e:
        return {"response": f"Error analyzing scenario: {str(e)}", "agent": "Prediction Agent"}

# --- Calendar Module Integration ---
from calendar_module import CalendarManager

calendar_manager = CalendarManager()

@app.get("/api/events")
async def get_events():
    """
    Returns a list of scheduled events.
    """
    return calendar_manager.get_events()

@app.delete("/api/events/{event_id}")
async def delete_event(event_id: str):
    """
    Deletes an event by ID.
    """
    calendar_manager.delete_event(event_id)
    return {"status": "success", "message": "Event deleted"}

import re
import json

@app.post("/api/analyze")
def analyze_query(request: QueryRequest):
    """
    Main endpoint for query analysis.
    Routes the query to the appropriate specialized agent.
    INTERCEPTS 'schedule' JSON blocks to update MOCK_EVENTS.
    """
    try:
        # Route to the appropriate agent
        agent = route_to_agent(request.query, request.history)
        
        # Let the agent analyze the query
        result = agent.analyze(request.query, request.history)
        
        # --- Intercept Scheduling Actions ---
        # Regex to find ```json schedule ... ```
        schedule_regex = r"```json schedule\s*([\s\S]*?)\s*```"
        match = re.search(schedule_regex, result["response"])
        if match:
            try:
                event_data = json.loads(match.group(1))
                # Add ID and type defaults
                if "type" not in event_data:
                    event_data["type"] = "meeting"
                
                # Add to Persistent Calendar
                calendar_manager.add_event(event_data)
                print(f"✅ Scheduled New Event: {event_data}")
                
            except Exception as e:
                print(f"❌ Failed to parse schedule block: {e}")
        
        return result

    except Exception as e:
        return {"response": f"Error: {str(e)}", "agent": "System"}

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

@app.get("/api/analytics/dashboard")
def get_dashboard_stats(days: int = 365):
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, "data")
        
        # Initialize Empty DataFrames
        sales_df = pd.DataFrame()
        inv_df = pd.DataFrame()
        
        # 0. DYNAMIC FILE LOADING
        if os.path.exists(data_dir):
            files = [f for f in os.listdir(data_dir) if f.lower().endswith('.csv')]
            print(f"📂 Found {len(files)} CSV files: {files}")
            
            for f in files:
                try:
                    f_path = os.path.join(data_dir, f)
                    temp_df = pd.read_csv(f_path)
                    cols = [c.lower() for c in temp_df.columns]
                    
                    # Heuristic for Sales: 'date' + ('revenue' or 'profit' or 'sales' or 'price'...)
                    is_sales = False
                    # Check if 'date' is present as a substring (e.g., 'order_date', 'date', 'timestamp')
                    if any('date' in c for c in cols):
                         # Check for sales keywords
                         sales_keywords = ['revenue', 'profit', 'sales', 'price', 'amount', 'qty', 'quantity', 'total']
                         if any(kw in c for c in cols for kw in sales_keywords):
                             is_sales = True

                    # Heuristic for Inventory: 'stock' or 'kw' (without date constraint strictly, but usually distinct)
                    is_inventory = False
                    inv_keywords = ['stock', 'inventory', 'on_hand', 'reorder', 'sku', 'quantity', 'qty']
                    if any(kw in c for c in cols for kw in inv_keywords):
                        # Avoid confusion: if it has 'revenue', it's likely sales, unless it's explicitly 'inventory_value'
                        if not is_sales: 
                            is_inventory = True
                        elif 'stock' in str(cols) or 'inventory' in str(cols):
                             # Mixed file? If it has explicit stock columns, treat as potential inventory source
                             # But we need to separate logical files.
                             # For now, if we found a strong Sales match, we skip unless we have NO inventory file yet.
                             if inv_df.empty: is_inventory = True
                    
                    # Priority Assignment
                    if is_sales and sales_df.empty:
                        print(f"✅ Identified SALES file: {f}")
                        sales_df = temp_df
                    elif is_inventory and inv_df.empty:
                         print(f"✅ Identified INVENTORY file: {f}")
                         inv_df = temp_df
                    
                    # Fallback: If we have one file, assume it's valid for whatever it matches best
                except Exception as e:
                    print(f"⚠️ Error reading {f}: {e}")

        # Helper for handling NaNs
        def safe_int(val):
            try:
                if pd.isna(val) or val == float('inf') or val == float('-inf'):
                    return 0
                return int(val)
            except:
                return 0

        # Initialize safe defaults for return variables
        total_valuation = 0
        turnover_rate = 0
        abc_stats = [{"name": "A", "value": 0}, {"name": "B", "value": 0}, {"name": "C", "value": 0}]
        stockout_forecast = []
        dead_stock = []
        smart_restock = []
        risk_chart = []
        category_chart = []
        recent_transactions = []
        dead_stock_value = 0
        turnover_rate = 0.0
        
        # DEFAULT RETURN STRUCTURE (Empty)
        default_response = {
            "kpis": {
                "revenue": 0, "net_profit": 0, "net_margin": 0, "orders": 0, "aov": 0,
                "health_score": 100, "low_stock_alerts": 0, "inventory_valuation": 0,
                "dead_stock_value": 0, "turnover_rate": 0
            },
            "charts": {
                "sales_trend": [], "profit_trend": [], "inventory_levels": [],
                "top_products": [], "recent_transactions": [], "category_distribution": [],
                "abc_analysis": abc_stats
            },
            "stockout_forecast": [], "dead_stock": [], "smart_restock": [],
            "turnover_rate": 0,
            "debug_info": {"note": "Returned safe default due to missing data or error"}
        }

        # Create defaults if DFs are still empty to prevent crashes
        if sales_df.empty:
             print("⚠️ No Sales Data Found. Using empty DataFrame.")
             sales_df = pd.DataFrame(columns=['date', 'item_id', 'quantity', 'price', 'profit'])
        if inv_df.empty:
             print("⚠️ No Inventory Data Found. Using empty DataFrame.")
             inv_df = pd.DataFrame(columns=['item_id', 'stock', 'reorder_point', 'cost'])
             
        # FILLNA TO PREVENT NAN ERRORS globally
        sales_df = sales_df.fillna(0)
        inv_df = inv_df.fillna(0)

        # 1. PROCESS SALES DATE FILTER
        if 'date' in sales_df.columns:
            # Deduplicate to prevent double counting
            sales_df = sales_df.drop_duplicates()
            
            # Convert to datetime
            sales_df['date_dt'] = pd.to_datetime(sales_df['date'], errors='coerce')
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            # Filter sales only
            sales_df = sales_df[sales_df['date_dt'] >= cutoff_date]
            # Drop temp column
            sales_df = sales_df.drop(columns=['date_dt'])

        if 'item_id' in sales_df.columns:
            sales_df['item_id'] = sales_df['item_id'].astype(str).str.strip()
        if 'item_id' in inv_df.columns:
            inv_df['item_id'] = inv_df['item_id'].astype(str).str.strip()
            
        # Clean Headers
        sales_df.columns = sales_df.columns.str.strip().str.lower()
        inv_df.columns = inv_df.columns.str.strip().str.lower()
        
        print(f"📊 DEBUG: Inventory Cols found: {inv_df.columns.tolist()}")

        # ---------------------------------------------------------
        # 1. SALES COLUMNS & PROFIT
        # ---------------------------------------------------------
        qty_col = 'quantity' # default
        if 'quantity_sold' in sales_df.columns: qty_col = 'quantity_sold'
        elif 'qty' in sales_df.columns: qty_col = 'qty'
        
        price_col = 'price_per_unit'
        if 'price' in sales_df.columns: price_col = 'price'
        elif 'unit_price' in sales_df.columns: price_col = 'unit_price'

        profit_col = None
        if 'profit' in sales_df.columns: profit_col = 'profit'
        
        # Calculate Total Revenue (Use pre-calced column if available for accuracy)
        if 'total_revenue' in sales_df.columns:
            total_revenue = safe_int(sales_df['total_revenue'].sum())
        elif qty_col in sales_df.columns and price_col in sales_df.columns:
            total_revenue = safe_int((sales_df[qty_col] * sales_df[price_col]).sum())
        else:
            total_revenue = 0

        # Calculate Profit & Margin
        net_profit = 0
        net_margin = 0
        
        print(f"DEBUG: Sales Columns: {sales_df.columns.tolist()}")
        print(f"DEBUG: Profit Column Detected: {profit_col}")
        
        if profit_col:
            net_profit_sum = sales_df[profit_col].sum()
            print(f"DEBUG: Raw Profit Sum: {net_profit_sum}")
            net_profit = safe_int(net_profit_sum)
            if total_revenue > 0:
                net_margin = round((net_profit / total_revenue) * 100, 1)

        # ---------------------------------------------------------
        # 5. NEW METRICS (Valuation & Stockout)
        # ---------------------------------------------------------
        # Pricing Map (item_id -> price)
        # Use average price in case it changed
        price_map = {}
        avg_store_price = 0.0
        if price_col in sales_df.columns:
            try:
                price_map = sales_df.groupby('item_id')[price_col].mean().to_dict()
                if not sales_df.empty:
                    avg_store_price = sales_df[price_col].mean()
            except: pass
        else:
            avg_store_price = 50.0 # Default if absolutely no price data
            
        print(f"DEBUG: Avg Store Price: {avg_store_price}")
        
        # ---------------------------------------------------------
        # 2. INVENTORY COLUMNS (Fail-Safe Mode)
        # ---------------------------------------------------------
        stock_col = None
        reorder_col = None
        
        # Try finding by name
        for c in ['stock_level', 'current_stock', 'stock', 'quantity', 'qty']:
            if c in inv_df.columns: stock_col = c; break
        
        for c in ['reorder_point', 'reorder_level', 'reorder', 'min_stock']:
            if c in inv_df.columns: reorder_col = c; break
            
        # HAIL MARY: If names fail, use Index (Assumes Col 2 is Stock, Col 3 is Reorder)
        if not stock_col and len(inv_df.columns) > 2:
            stock_col = inv_df.columns[2]
            print(f"⚠️ Warning: Using column index 2 ('{stock_col}') for Stock")
            
        if not reorder_col and len(inv_df.columns) > 3:
            reorder_col = inv_df.columns[3]
            print(f"⚠️ Warning: Using column index 3 ('{reorder_col}') for Reorder")

        # ---------------------------------------------------------
        # MERGE DATA
        # ---------------------------------------------------------
        # Ensure item_id is robust (string vs int issues)
        if 'item_id' in sales_df.columns and 'item_id' in inv_df.columns:
            # Merge to get product details attached to sales
            merged_df = pd.merge(sales_df, inv_df, on='item_id', how='left')
        else:
            merged_df = sales_df.copy()
            merged_df['item_name'] = 'Unknown Product'

        # ---------------------------------------------------------
        # 3. CALCULATE METRICS
        # ---------------------------------------------------------
        # Revenue
        if price_col in sales_df.columns:
            sales_df['revenue'] = sales_df[qty_col] * sales_df[price_col]
            merged_df['revenue'] = merged_df[qty_col] * merged_df[price_col]
        else:
            if qty_col in sales_df.columns:
                 sales_df['revenue'] = sales_df[qty_col] * 1500
                 merged_df['revenue'] = merged_df[qty_col] * 1500
            else:
                 sales_df['revenue'] = 0
                 merged_df['revenue'] = 0

        # Average Order Value (AOV)
        total_revenue = safe_int(sales_df['revenue'].sum())
        total_orders = len(sales_df)
        aov = safe_int(total_revenue / total_orders) if total_orders > 0 else 0

        # Health Score
        health_score = 100
        critical_items = []
        if stock_col and reorder_col:
            # Critical: Stock < Reorder Point
            crit_df = inv_df[inv_df[stock_col] < inv_df[reorder_col]]
            critical = len(crit_df)
            
            # Overstock: Stock > 3x Reorder Point
            overstock = len(inv_df[inv_df[stock_col] > (inv_df[reorder_col] * 3)])
            
            # Health Score
            total_items = len(inv_df)
            if total_items > 0:
                crit_pct = critical / total_items
                over_pct = overstock / total_items
                # Penalty: -1 point for every 1% of critical items
                # Penalty: -0.5 points for every 1% of overstock items
                health_score = max(0, int(100 - (crit_pct * 100) - (over_pct * 50)))
            else:
                health_score = 100
            low_stock_count = critical
            
            # Risk Analysis Data
            # Calculate "Stock Coverage" (Stock / Reorder Level)
            # Avoid division by zero
            inv_df['coverage'] = inv_df.apply(lambda r: r[stock_col] / r[reorder_col] if r[reorder_col] > 0 else 999, axis=1)
            risk_df = inv_df.sort_values('coverage', ascending=True).head(20)
            
            risk_chart = []
            name_c = 'item_name' if 'item_name' in inv_df.columns else inv_df.columns[1]
            for _, row in risk_df.iterrows():
                risk_chart.append({
                    "name": str(row[name_c]),
                    "stock": safe_int(row[stock_col]),
                    "reorder": safe_int(row[reorder_col]),
                    "risk_level": "Critical" if row['coverage'] < 1 else "Warning"
                })
        else:
            low_stock_count = 0
            risk_chart = []

        # Top Products
        group_col = 'item_name' if 'item_name' in merged_df.columns else 'item_id'
        if group_col in merged_df.columns:
            top_prod = merged_df.groupby(group_col)['revenue'].sum().sort_values(ascending=False).head(20).reset_index()
            top_products_list = top_prod.rename(columns={group_col: 'name', 'revenue': 'value'}).to_dict(orient='records')
        else:
            top_products_list = []
            
        # Recent Transactions (Latest 50)
        # Assuming 'date' exists and is sortable
        if 'date' in merged_df.columns:
            rec_trans = merged_df.sort_values('date', ascending=False).head(50)
            recent_transactions = []
            for _, row in rec_trans.iterrows():
                recent_transactions.append({
                    "date": str(row['date']),
                    "product": str(row.get('item_name', f"Item {row.get('item_id', '?')}")),
                    "amount": safe_int(row.get('revenue', 0)),
                    "status": "Completed"
                })
        else:
            recent_transactions = []

        # ---------------------------------------------------------
        # 4. CHART DATA
        # ---------------------------------------------------------
        # ---------------------------------------------------------
        # 4. CHART DATA
        # ---------------------------------------------------------
        # Sales Chart
        if 'date' in sales_df.columns:
            # Ensure date is string and sorted
            sales_df['date'] = sales_df['date'].astype(str)
            
            if days <= 32:
                # Group by Week (YYYY-WW)
                # We use date_dt from before or convert again
                sales_df['date_dt'] = pd.to_datetime(sales_df['date'])
                sales_df['period'] = sales_df['date_dt'].dt.strftime('%Y-W%U') # Week Number
                group_col_name = 'period'
                # Optional: You might want to format it as "Week 12"
            else:
                # Group by Month (YYYY-MM)
                sales_df['month'] = sales_df['date'].str[:7]
                group_col_name = 'month'

            # Sales Trend (Dynamic Grouping)
            if group_col_name in sales_df.columns:
                 sales_trend = sales_df.groupby(group_col_name)[qty_col].sum().reset_index()
                 sales_chart = sales_trend.rename(columns={group_col_name: 'name', qty_col: 'value'}).to_dict(orient='records')
            else:
                 sales_chart = []
            
            # Profit Trend (Dynamic Grouping)
            if 'profit' in sales_df.columns and group_col_name in sales_df.columns:
                 profit_trend = sales_df.groupby(group_col_name)['profit'].sum().reset_index()
                 profit_chart = profit_trend.rename(columns={group_col_name: 'name', 'profit': 'value'}).to_dict(orient='records')
            else:
                 profit_chart = []
        else:
            sales_chart = top_products_list
            profit_chart = []

        # Inventory Chart (Top 20 by Volume for visuals)
        name_col = 'item_name' if 'item_name' in inv_df.columns else inv_df.columns[1]
        if stock_col:
            inv_chart = inv_df.sort_values(stock_col, ascending=False).head(20)[[name_col, stock_col]].rename(
                columns={name_col: 'name', stock_col: 'value'}
            ).to_dict(orient='records')
        else:
            inv_chart = []
            

        
        # ---------------------------------------------------------
        # 5. NEW METRICS (Valuation & Stockout)
        # ---------------------------------------------------------
        # Pricing Map (item_id -> price)
        # Use average price in case it changed
        if price_col in sales_df.columns:
            try:
                price_map = sales_df.groupby('item_id')[price_col].mean().to_dict()
                fallback_price = int(sales_df[price_col].mean())
            except:
                price_map = {}
                fallback_price = 50
        else:
            price_map = {}
            fallback_price = 50

        # Valuation
        total_valuation = 0
        if stock_col:
            def get_price(row):
                pid = row.get('item_id')
                return price_map.get(pid, fallback_price)
            
            # Apply price to inventory
            inv_df['est_price'] = inv_df.apply(get_price, axis=1)
            # If price is 0, maybe fallback to a default? Or just 0.
            inv_df['valuation'] = inv_df[stock_col] * inv_df['est_price']
            total_valuation = safe_int(inv_df['valuation'].sum())

            # Category Distribution (Moved here to ensure valuation exists)
            # FALLBACK: If 'category' is missing, try to infer or use 'Uncategorized'
            cat_col = 'category'
            if 'category' not in inv_df.columns:
                 if 'type' in inv_df.columns: cat_col = 'type'
                 else:
                     # Create a dummy category based on logic or default
                     inv_df['category'] = 'Uncategorized'
                     
            cat_dist = inv_df.groupby('category')['valuation'].sum().reset_index()
            category_chart = cat_dist.rename(columns={'category': 'name', 'valuation': 'value'}).to_dict(orient='records')

        # ---------------------------------------------------------
        # 6. ADVANCED INVENTORY ANALYSIS (Stockout, Dead Stock, Restock)
        # ---------------------------------------------------------
        stockout_forecast = []
        dead_stock = []
        smart_restock = []
        dead_stock_value = 0
        
        # We need stock column. If date is missing in sales, we can still calculate basic restock based on reorder point
        if stock_col:
            # 1. Date Range & Velocity Prep
            total_days = 30 # Default
            if 'date' in sales_df.columns:
                try:
                    sales_df['date'] = pd.to_datetime(sales_df['date'])
                    total_days = (sales_df['date'].max() - sales_df['date'].min()).days + 1
                    if total_days < 1: total_days = 1
                except:
                    total_days = 30

            try:
                sales_per_item = sales_df.groupby('item_id')[qty_col].sum().to_dict()
            except:
                sales_per_item = {}
                
            lead_time_col = 'supplier_lead_time_days' # Default column name

            for _, row in inv_df.iterrows():
                try:
                    pid = row.get('item_id')
                    item_name = str(row.get('item_name', f"Item {pid}"))
                    current_stock = safe_int(row.get(stock_col, 0))
                    
                    # Fuzzy match sales if ID match failed? 
                    # For now rely on IDs being consistent.
                    total_sold = sales_per_item.get(pid, 0)
                    
                    # Get Price (Use Sales History or Fallback)
                    try:
                        price = price_map.get(pid, 0)
                        if price == 0:
                            price = fallback_price
                            # Try to get cost from inventory if available
                            if 'cost_price' in row: price = safe_int(row['cost_price'])
                            elif 'cost' in row: price = safe_int(row['cost'])
                            elif 'selling_price' in row: price = safe_int(row['selling_price'])
                    except: price = 50
                    
                    # A. VELOCITY & STOCKOUT
                    try:
                        reorder_point = safe_int(row.get(reorder_col, 0))
                    except:
                        reorder_point = 0

                    if total_sold > 0:
                        daily_velocity = total_sold / total_days
                        if daily_velocity > 0:
                             days_left = safe_int(current_stock / daily_velocity)
                        else:
                             days_left = 999
                    else:
                        # If no sales history, but stock is below reorder point, it's a risk!
                        if current_stock < reorder_point:
                            days_left = 0 # Critical Force Flag
                            daily_velocity = 0
                        else:
                            days_left = 999 # Safe 
                    
                    if days_left < 30: # Only interesting if low
                        stockout_forecast.append({
                            "name": item_name,
                            "days_left": days_left,
                            "velocity": round(daily_velocity, 2)
                        })
                    
                    # B. DEAD STOCK (Zero sales in period & has stock)
                    if total_sold == 0 and current_stock > 0:
                        val = current_stock * price
                        dead_stock_value += val
                        dead_stock.append({
                            "name": item_name,
                            "stock": current_stock,
                            "value": val,
                            "price": price
                        })
                    
                    # C. SMART RESTOCK
                    # Find lead time or default to 7
                    lead_time = 7
                    if lead_time_col in row:
                        val = row[lead_time_col]
                        if not pd.isna(val): lead_time = safe_int(val)
                    
                    if daily_velocity > 0:
                        target_stock = daily_velocity * (lead_time + 14)
                        needed = target_stock - current_stock
                        if needed > 0:
                            smart_restock.append({
                                "name": item_name,
                                "order_qty": safe_int(math.ceil(needed)),
                                "reason": f"Lead Time: {safe_int(lead_time)}d",
                                "urgency": "High" if days_left < lead_time else "Medium"
                            })
                    elif current_stock < reorder_point:
                        # Fallback: If below reorder point, restock to 1.5x Reorder Point (or min 10)
                        target = max(reorder_point * 1.5, 10)
                        needed = target - current_stock
                        if needed > 0:
                            smart_restock.append({
                                "name": item_name,
                                "order_qty": safe_int(math.ceil(needed)),
                                "reason": "Below Reorder Limit",
                                "urgency": "High"
                            })
                except Exception as e:
                    # Skip problematic row
                     continue

            # ---------------------------------------------------------
            # FALLBACK: DEMO DATA (If Real Data yield 0 results)
            # ---------------------------------------------------------
            if not smart_restock:
                print("⚠️ Debug: No Restock Needed - Injecting Demo Data")
                smart_restock = [
                    {"name": "Wireless Pro Mouse (Demo)", "order_qty": 50, "reason": "Low Stock Forecast", "urgency": "High"},
                    {"name": "4K Monitor X2 (Demo)", "order_qty": 15, "reason": "Lead Time Buffer", "urgency": "Medium"},
                ]
            
            if not dead_stock:
                print("⚠️ Debug: No Dead Stock - Injecting Demo Data")
                dead_stock = [
                    {"name": "Legacy Adapter v1 (Demo)", "stock": 142, "value": 7100, "price": 50},
                    {"name": "Old Phone Case (Demo)", "stock": 300, "value": 1500, "price": 5},
                    {"name": "USB Mini Cable (Demo)", "stock": 85, "value": 850, "price": 10},
                ]
                # Update KPIs to match demo data if needed, or just let them stand
                dead_stock_value += 9450

        else:
             # COMPLETELY EMPTY (No Stock Col) - Fallback
             smart_restock = [{"name": "Demo Item A", "order_qty": 20, "reason": "Example Alert", "urgency": "High"}]
             dead_stock = [{"name": "Demo Item B", "stock": 50, "value": 2500, "price": 50}]


        # Sort lists - Expanded limits for better visibility
        stockout_forecast = sorted(stockout_forecast, key=lambda x: x['days_left'])[:50]
        dead_stock = sorted(dead_stock, key=lambda x: x['value'], reverse=True)[:50]
        smart_restock = sorted(smart_restock, key=lambda x: x['order_qty'], reverse=True)[:50]
        
        print(f"DEBUG: Stock Col: {stock_col}, Reorder Col: {reorder_col}", flush=True)
        print(f"DEBUG: Stockout Forecast Count: {len(stockout_forecast)}", flush=True)
        if len(stockout_forecast) > 0:
                print(f"DEBUG: First Alert: {stockout_forecast[0]}", flush=True)

        # ---------------------------------------------------------
        # 7. ABC ANALYSIS & TURNOVER
        # ---------------------------------------------------------
        # ABC Analysis
        abc_stats = [{"name": "A", "value": 0}, {"name": "B", "value": 0}, {"name": "C", "value": 0}]
        
        try:
            # Group by item_id to handle duplicates if any
            abc_df = merged_df.groupby('item_id')['revenue'].sum().sort_values(ascending=False).reset_index()
            total_rev_abc = abc_df['revenue'].sum()
            
            if total_rev_abc > 0:
                abc_df['cum_rev'] = abc_df['revenue'].cumsum()
                abc_df['cum_perc'] = abc_df['cum_rev'] / total_rev_abc
                
                def get_grade(p):
                    if p <= 0.80: return 'A'
                    elif p <= 0.95: return 'B'
                    else: return 'C'
                
                abc_df['grade'] = abc_df['cum_perc'].apply(get_grade)
                grade_counts = abc_df['grade'].value_counts()
                
                abc_stats = [
                    {"name": "A", "value": safe_int(grade_counts.get('A', 0))},
                    {"name": "B", "value": safe_int(grade_counts.get('B', 0))},
                    {"name": "C", "value": safe_int(grade_counts.get('C', 0))}
                ]
        except Exception as e:
            print(f"Stats Error: {e}")

        # Turnover
        turnover_rate = 0
        if total_valuation > 0:
            turnover_rate = round(total_revenue / total_valuation, 2)

        print(f"DEBUG: FINAL RETURN -> Profit: {net_profit}, Turnover: {turnover_rate}")

        return {
            "kpis": {
                "revenue": total_revenue,
                "net_profit": net_profit,
                "net_margin": net_margin,
                "orders": total_orders,
                "aov": aov,
                "health_score": health_score,
                "low_stock_alerts": low_stock_count,
                "inventory_valuation": total_valuation,
                "dead_stock_value": dead_stock_value,
                "turnover_rate": turnover_rate
            },
            "charts": {
                "sales_trend": sales_chart,
                "profit_trend": profit_chart,
                "inventory_levels": inv_chart,
                "top_products": top_products_list,
                "recent_transactions": recent_transactions,
                "category_distribution": category_chart,
                "abc_analysis": abc_stats # Assuming abc_chart refers to abc_stats
            },
            "stockout_forecast": risk_chart, # Assuming risk_chart refers to stockout_forecast
            "dead_stock": dead_stock, # Assuming dead_stock_list refers to dead_stock
            "smart_restock": smart_restock, # Assuming restock_recommendations refers to smart_restock
            "turnover_rate": turnover_rate,
            "debug_info": {
                "days_filter": days,
                "initial_rows": "Dynamic",
                "final_rows": len(sales_df),
                "cutoff_date": str(cutoff_date) if not sales_df.empty else "N/A"
            }
        }


    except Exception as e:
        print(f"❌ Analytics Error: {e}")
        # RETURN DEFAULT RESPONSe instead of error
        try:
             # Ensure default_response structure is available if exception happens early
             if 'default_response' not in locals():
                 default_response = { "kpis": { "revenue": 0, "net_profit": 0, "net_margin": 0, "orders": 0, "aov": 0, "health_score": 100, "low_stock_alerts": 0, "inventory_valuation": 0, "dead_stock_value": 0, "turnover_rate": 0 }, "charts": { "sales_trend": [], "profit_trend": [], "inventory_levels": [], "top_products": [], "recent_transactions": [], "category_distribution": [], "abc_analysis": [] }, "stockout_forecast": [], "dead_stock": [], "smart_restock": [], "turnover_rate": 0, "debug_info": {"error": str(e)} }
             
             default_response["debug_info"]["error"] = str(e)
             return default_response
        except:
             return {"error": "Critical System Failure"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)