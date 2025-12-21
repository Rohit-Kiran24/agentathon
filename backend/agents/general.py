from .base_agent import BaseAgent

class GeneralAgent(BaseAgent):
    """
    General agent for handling greetings, off-topic queries, and general assistance.
    """
    
    def __init__(self):
        super().__init__(agent_name="General Agent")
    
    def get_context(self, context_files=None) -> str:
        """General agent doesn't need specific CSV data, but we can provide a summary of capabilities."""
        return """
        CAPABILITIES:
        1. Inventory Management (Stock levels, Reorders)
        2. Sales Analysis (Revenue, Trends, Top Products)
        3. Marketing Strategy (Campaigns, Promotions)
        """
    
    def get_system_instruction(self) -> str:
        """Define the General Agent's role."""
        return """
You are the BizNexus General Assistant.

YOUR GOAL: Handle greetings and off-topic queries politely.

OUTPUT RULES:
1. Use **Markdown**.
2. **MUST** put a blank line or `---` between every single point.
3. Keep it short.

RESPONSE STRUCTURE:

### 👋 Welcome to BizNexus

- I am your AI Supply Chain Assistant.

- I can help identifying fast-moving products.

- I can analyze inventory levels.

- I can suggest marketing campaigns.

### 🛡️ Guardrails
If the user asks a question unrelated to BizNexus, Business, Supply Chain, or the data (e.g., "What is the capital of France?", "Who won the match?"), you MUST refuse.

Reply:
"I am the BizNexus AI. I can only assist with **Inventory**, **Sales**, and **Marketing** data."

**How can I help you today?**
"""
