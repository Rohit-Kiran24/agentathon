import pandas as pd
from .base_agent import BaseAgent

class PredictionAgent(BaseAgent):
    """
    Specialized agent for What-If Scenario Analysis.
    Acts as a strategic business advisor to predict outcomes of changes.
    """
    
    def __init__(self):
        super().__init__(agent_name="Prediction Agent", model_name="gemini-2.0-flash-exp")
    
    def get_context(self, context_files=None) -> str:
        """Load and format recent sales and inventory data for context."""
        df_sales = self.load_csv("sales.csv", context_files)
        df_inventory = self.load_csv("inventory.csv", context_files)
        
        context_str = ""
        
        if df_sales is not None:
             # Summarize sales to avoid token limit
             monthly_rev = 0
             if 'price_per_unit' in df_sales and 'quantity' in df_sales:
                 total_rev = df_sales['quantity'] * df_sales['price_per_unit']
                 monthly_rev = total_rev.sum()
             
             context_str += f"Current Total Revenue (Historical): ${int(monthly_rev)}\n"
        
        if df_inventory is not None:
            total_stock = df_inventory['quantity'].sum() if 'quantity' in df_inventory else 0
            context_str += f"Current Total Inventory Units: {total_stock}\n"

        return context_str
    
    def get_system_instruction(self) -> str:
        """Define the prediction agent's role."""
        return """
You are the BizNexus Strategy Intel Module.
Your goal is to provide rapid, actionable strategic insights based on "What-If" scenarios.

Analyze the changes in Marketing, Operational Costs, and Price.

OUTPUT RULES:
1. **NO FILLER**: Do not say "I will analyze". Start immediately.
2. **SIMPLE ENGLISH**: Avoid jargon like "OpEx" or "Elasticity". Use "Costs" and "Demand".
3. **FORMAT**: Use the exact structure below.

### ⚡ Key Impacts
* **Profit**: [One sentence on likely profit outcome]
* **Risk**: [Major risk factor]
* **Upside**: [Best case scenario]

### 🛠 Recommended Actions
* **Strategy**: [Main strategic move]
* **Operations**: [Operational adjustment]
* **Inventory**: [Stock level advice]
"""

    def analyze_scenario(self, scenario: dict, context_files=None) -> dict:
        """
        Analyze a specific scenario structure.
        
        Args:
            scenario: Dict containing 'marketing_change', 'opex_change', 'price_change' (percentages)
        """
        marketing = scenario.get('marketing_change', 0)
        opex = scenario.get('opex_change', 0)
        price = scenario.get('price_change', 0)
        
        query = (
            f"Simulate this Scenario:\n"
            f"- Marketing Spend: {marketing:+.1f}%\n"
            f"- Operational Expenses: {opex:+.1f}%\n"
            f"- Unit Price: {price:+.1f}%\n\n"
            "Based on general business principles and the current context, what is the likely outcome?"
        )
        return self.analyze(query, context_files)
