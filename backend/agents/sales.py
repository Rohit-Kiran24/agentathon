import pandas as pd
from .base_agent import BaseAgent


class SalesAgent(BaseAgent):
    """
    Specialized agent for sales analysis.
    Calculates revenue, identifies top-selling products, and analyzes trends.
    """
    
    def __init__(self):
        super().__init__(agent_name="Sales Agent")
    
    def get_context(self) -> str:
        """Load and format sales data."""
        df_sales = self.load_csv("sales.csv")
        
        if df_sales is None:
            return "No sales data available."
        
        return self.format_dataframe(df_sales, "RECENT SALES TRANSACTIONS")
    
    def get_system_instruction(self) -> str:
        """Define the sales agent's role and rules."""
        return """
You are the BizNexus Sales Analyst Agent.

YOUR GOAL: Provide a high-level Sales Executive Summary.

OUTPUT RULES:
1. Use **Markdown**.
2. **MUST** use `---` to separate sections.
3. **MUST** use sub-bullets for data points.

RESPONSE STRUCTURE:

### 📊 Key Performance Metrics

- **Total Revenue**: $[Amount]
- **Trend**: [One short sentence]

---

### 🏆 Top Performers

1. **[Product Name]**
   - Sold: [Qty] units
   - Revenue: $[Amt]

2. **[Product Name]**
   - Sold: [Qty] units
   - Revenue: $[Amt]

---

### 📉 Areas for Improvement

- **[Product Name]**
   - Issue: Low sales volume
   - Insight: [Brief observation]
"""
