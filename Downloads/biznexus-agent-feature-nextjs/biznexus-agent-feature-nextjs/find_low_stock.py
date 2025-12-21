
import pandas as pd
import os

try:
    df = pd.read_csv(r'c:\Projects\biznexus-agent\backend\data\inventory.csv')
    print("Columns:", df.columns.tolist())
    
    # naive detection
    stock_col = next((c for c in df.columns if 'stock' in c.lower()), None)
    reorder_col = next((c for c in df.columns if 'reorder' in c.lower()), None)
    
    print(f"Detected: Stock='{stock_col}', Reorder='{reorder_col}'")
    
    if stock_col and reorder_col:
        print("Data Types:\n", df.dtypes)
        
        # Force numeric
        df[stock_col] = pd.to_numeric(df[stock_col], errors='coerce').fillna(0)
        df[reorder_col] = pd.to_numeric(df[reorder_col], errors='coerce').fillna(0)
        
        low_stock = df[df[stock_col] < df[reorder_col]]
        overstock = df[df[stock_col] > (df[reorder_col] * 3)]
        
        print(f"Total Items: {len(df)}")
        print(f"Low Stock Items (< Reorder): {len(low_stock)}")
        print(f"Overstock Items (> 3x Reorder): {len(overstock)}")
        
        if not low_stock.empty:
            print("Sample Low Stock:")
            print(low_stock[[ 'item_id', 'item_name', stock_col, reorder_col ]].head())
        else:
            print("NO LOW STOCK ITEMS FOUND. (This explains empty Restock feed)")
            print("Sample Normal Items:")
            print(df[[ 'item_id', 'item_name', stock_col, reorder_col ]].head())
            
except Exception as e:
    print(f"Error: {e}")
