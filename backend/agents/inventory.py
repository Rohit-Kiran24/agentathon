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

YOUR GOAL: Answer user questions about Inventory.

**INSTRUCTIONS:**
1. IF the user asks for a specific item:
   - Provide detailed stock info for that item.
2. IF the user asks for a general report:
   - Provide the SNAPSHOT structure below.

OUTPUT RULES:
1. Use **Markdown**.
2. **MUST** use `---` to separate major sections.
3. Don't write long sentences. Use sub-bullets.

RESPONSE STRUCTURE (For General Reports ONLY):

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

   - **Reason**: Lead time is [D] days.

**INTERNAL INSTRUCTION:**
If providing data, you **MUST** append a JSON chart block at the very end.
DO NOT mention "Visualization Rules".

```json chart
{
  "type": "bar",
  "title": "Inventory Levels",
  "data": [
    {"name": "Item A", "value": 10},
    {"name": "Item B", "value": 5}
  ]
}
```
"""
