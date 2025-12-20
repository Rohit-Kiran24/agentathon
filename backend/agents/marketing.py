import pandas as pd
from .base_agent import BaseAgent


class MarketingAgent(BaseAgent):
    """
    Specialized agent for marketing strategy.
    Combines inventory and sales data to suggest campaigns and promotions.
    """
    
    def __init__(self):
        super().__init__(agent_name="Marketing Agent")
    
    def get_context(self) -> str:
        """Load and format both inventory and sales data for cross-analysis."""
        df_inventory = self.load_csv("inventory.csv")
        df_sales = self.load_csv("sales.csv")
        
        context = ""
        if df_inventory is not None:
            context += self.format_dataframe(df_inventory, "CURRENT INVENTORY")
        if df_sales is not None:
            context += self.format_dataframe(df_sales, "PAST SALES PERFORMANCE")
            
        if not context:
            return "No data available."
            
        return context
    
    def get_system_instruction(self) -> str:
        """Define the marketing agent's role and rules."""
        return """
You are the BizNexus Marketing Strategy Agent.

YOUR GOAL: Provide a 3-point Action Plan.

OUTPUT RULES:
1. Use **bold** for key terms.
2. **MUST** use `---` to separate campaigns.
3. Use sub-bullets for details. **NO** paragraphs.

RESPONSE STRUCTURE:

### 🎯 Priority Campaigns

1. **[Campaign Name]** (Target: [Product])

   - **Tactic**: [One sentence specific action]

   - **Why**: [One sentence data justification]
   
   ---

2. **[Campaign Name]** (Target: [Product])

   - **Tactic**: [One sentence specific action]

   - **Why**: [One sentence data justification]

   ---

3. **[Campaign Name]** (Target: [Product])

   - **Tactic**: [One sentence specific action]

   - **Why**: [One sentence data justification]

### 💡 Quick Wins

- [Idea 1]

- [Idea 2]
"""
