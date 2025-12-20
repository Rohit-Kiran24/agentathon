import os
import math
import pandas as pd
from datetime import datetime, timedelta
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

def route_to_agent(query: str):
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
        # Default to General Agent for completely unknown/off-topic queries
        return general_agent

@app.post("/api/analyze")
def analyze_query(request: QueryRequest):
    """
    Main endpoint for query analysis.
    Routes the query to the appropriate specialized agent.
    """
    try:
        # Route to the appropriate agent
        agent = route_to_agent(request.query)
        
        # Let the agent analyze the query
        result = agent.analyze(request.query)
        
        return result

    except Exception as e:
        return {"response": f"Error: {str(e)}", "agent": "System"}

@app.get("/api/analytics/dashboard")
def get_dashboard_stats(days: int = 365):
    try:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        data_dir = os.path.join(base_dir, "data")
        
        SALES_FILE = os.path.join(data_dir, "sales.csv")
        INVENTORY_FILE = os.path.join(data_dir, "inventory.csv")

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

        # 1. LOAD DATA
        inv_df = pd.read_csv(INVENTORY_FILE)
        sales_df = pd.read_csv(SALES_FILE)
        
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
            total_revenue = int(sales_df['total_revenue'].sum())
        else:
            total_revenue = int((sales_df[qty_col] * sales_df[price_col]).sum())

        # Calculate Profit & Margin
        net_profit = 0
        net_margin = 0
        
        print(f"DEBUG: Sales Columns: {sales_df.columns.tolist()}")
        print(f"DEBUG: Profit Column Detected: {profit_col}")
        
        if profit_col:
            net_profit_sum = sales_df[profit_col].sum()
            print(f"DEBUG: Raw Profit Sum: {net_profit_sum}")
            net_profit = int(net_profit_sum)
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
            price_map = sales_df.groupby('item_id')[price_col].mean().to_dict()
            if not sales_df.empty:
                avg_store_price = sales_df[price_col].mean()
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
            sales_df['revenue'] = sales_df[qty_col] * 1500
            merged_df['revenue'] = merged_df[qty_col] * 1500

        # Average Order Value (AOV)
        total_revenue = int(sales_df['revenue'].sum())
        total_orders = len(sales_df)
        aov = int(total_revenue / total_orders) if total_orders > 0 else 0

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
            inv_df['coverage'] = inv_df[stock_col] / inv_df[reorder_col]
            risk_df = inv_df.sort_values('coverage', ascending=True).head(20)
            
            risk_chart = []
            name_c = 'item_name' if 'item_name' in inv_df.columns else inv_df.columns[1]
            for _, row in risk_df.iterrows():
                risk_chart.append({
                    "name": row[name_c],
                    "stock": row[stock_col],
                    "reorder": row[reorder_col],
                    "risk_level": "Critical" if row['coverage'] < 1 else "Warning"
                })
        else:
            low_stock_count = 0
            risk_chart = []

        # Top Products
        group_col = 'item_name' if 'item_name' in merged_df.columns else 'item_id'
        top_prod = merged_df.groupby(group_col)['revenue'].sum().sort_values(ascending=False).head(20).reset_index()
        top_products_list = top_prod.rename(columns={group_col: 'name', 'revenue': 'value'}).to_dict(orient='records')
        
        # Recent Transactions (Latest 50)
        # Assuming 'date' exists and is sortable
        if 'date' in merged_df.columns:
            rec_trans = merged_df.sort_values('date', ascending=False).head(50)
            recent_transactions = []
            for _, row in rec_trans.iterrows():
                recent_transactions.append({
                    "date": row['date'],
                    "product": row.get('item_name', f"Item {row.get('item_id', '?')}"),
                    "amount": int(row['revenue']),
                    "status": "Completed" # Dummy status
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
            
            if days <= 90:
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
            sales_trend = sales_df.groupby(group_col_name)[qty_col].sum().reset_index()
            sales_chart = sales_trend.rename(columns={group_col_name: 'name', qty_col: 'value'}).to_dict(orient='records')
            
            # Profit Trend (Dynamic Grouping)
            if 'profit' in sales_df.columns:
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
            price_map = sales_df.groupby('item_id')[price_col].mean().to_dict()
            fallback_price = int(sales_df[price_col].mean())
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
            total_valuation = int(inv_df['valuation'].sum())

            # Category Distribution (Moved here to ensure valuation exists)
            if 'category' in inv_df.columns:
                cat_dist = inv_df.groupby('category')['valuation'].sum().reset_index()
                category_chart = cat_dist.rename(columns={'category': 'name', 'valuation': 'value'}).to_dict(orient='records')
            else:
                category_chart = []

        # ---------------------------------------------------------
        # 6. ADVANCED INVENTORY ANALYSIS (Stockout, Dead Stock, Restock)
        # ---------------------------------------------------------
        stockout_forecast = []
        dead_stock = []
        smart_restock = []
        dead_stock_value = 0
        
        if stock_col and 'date' in sales_df.columns:
            # 1. Date Range & Velocity Prep
            try:
                sales_df['date'] = pd.to_datetime(sales_df['date'])
                total_days = (sales_df['date'].max() - sales_df['date'].min()).days + 1
                if total_days < 1: total_days = 1
            except:
                total_days = 30

            sales_per_item = sales_df.groupby('item_id')[qty_col].sum().to_dict()
            lead_time_col = 'supplier_lead_time_days' # Default column name

            for _, row in inv_df.iterrows():
                pid = row.get('item_id')
                item_name = row.get('item_name', f"Item {pid}")
                current_stock = row[stock_col]
                total_sold = sales_per_item.get(pid, 0)
                # Get Price (Use Sales History or Fallback)
                price = price_map.get(pid, 0)
                if price == 0:
                    price = fallback_price
                
                # A. VELOCITY & STOCKOUT
                try:
                    reorder_point = int(row.get(reorder_col, 0))
                    current_stock = int(current_stock)
                except:
                    reorder_point = 0
                    current_stock = 0

                if total_sold > 0:
                    daily_velocity = total_sold / total_days
                    days_left = int(current_stock / daily_velocity)
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
                # Formula: Target = Velocity * (LeadTime + BufferDays)
                # Buffer = 14 days safety
                lead_time = row.get(lead_time_col, 7) # Default 7 days if missing
                if pd.isna(lead_time): lead_time = 7
                
                if daily_velocity > 0:
                    target_stock = daily_velocity * (lead_time + 14)
                    needed = target_stock - current_stock
                    if needed > 0:
                        smart_restock.append({
                            "name": item_name,
                            "order_qty": int(math.ceil(needed)),
                            "reason": f"Lead Time: {int(lead_time)}d",
                            "urgency": "High" if days_left < lead_time else "Medium"
                        })
                elif current_stock < reorder_point:
                    # Fallback: If below reorder point, restock to 1.5x Reorder Point
                    target_stock = reorder_point * 1.5
                    needed = target_stock - current_stock
                    if needed > 0:
                        smart_restock.append({
                            "name": item_name,
                            "order_qty": int(math.ceil(needed)),
                            "reason": "Below Reorder Limit",
                            "urgency": "High"
                        })

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
                    {"name": "A", "value": int(grade_counts.get('A', 0))},
                    {"name": "B", "value": int(grade_counts.get('B', 0))},
                    {"name": "C", "value": int(grade_counts.get('C', 0))}
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
                "initial_rows": len(pd.read_csv(SALES_FILE)),
                "final_rows": len(sales_df),
                "cutoff_date": str(cutoff_date) if 'date' in pd.read_csv(SALES_FILE).columns else "N/A"
            }
        }


    except Exception as e:
        print(f"❌ Analytics Error: {e}")
        return {"error": str(e)}



if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)