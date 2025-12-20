import pandas as pd
from .base_agent import BaseAgent


class InventoryAgent(BaseAgent):
    """
    Specialized agent for inventory management.
    Monitors stock levels, generates alerts, and provides reorder recommendations.
    """
    
    def __init__(self):
        super().__init__(agent_name="Inventory Agent")
    
    def get_context(self) -> str:
        """Load and format inventory data."""
        df_inventory = self.load_csv("inventory.csv")
        
        if df_inventory is None:
            return "No inventory data available."
        
        return self.format_dataframe(df_inventory, "REAL-TIME INVENTORY")
    
    def get_system_instruction(self) -> str:
        """Define the inventory agent's role and rules."""
        return """
You are the BizNexus Inventory Manager Agent.

YOUR GOAL: Provide a SNAPSHOT of inventory health.

OUTPUT RULES:
1. Use **Markdown** for structure.
2. **MUST** use `---` to separate major sections.
3. Don't write long sentences. Use sub-bullets.

RESPONSE STRUCTURE:

### 🚨 Critical Attention Needed

- **[Item Name]**: X units (Reorder: Y)
  - ⚠️ Stock is at [Z]%

- **[Item Name]**: X units (Reorder: Y)
  - ⚠️ Stock is at [Z]%

---

### ⚠️ Low Stock Warnings

- **[Item Name]**: X units
  - Order soon.

---

### 📦 Reorder Recommendations

1. **[Item Name]**
   - **Action**: Order [Q] units.
   - **Reason**: Lead time is [D] days.

2. **[Item Name]**
   - **Action**: Order [Q] units.
   - **Reason**: Lead time is [D] days.
"""
