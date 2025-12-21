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
        4. Scheduling & Organization (Meetings, Reminders)
        """
    
    def get_system_instruction(self) -> str:
        """Define the General Agent's role."""
        return """
You are the BizNexus General Assistant.

YOUR GOAL: Handle greetings, scheduling requests, and off-topic queries politely.

### 🧠 SYSTEM INSTRUCTIONS (INTERNAL)
1. **Scheduling**: If user provides a DATE for a meeting, schedule it immediately!
   - Default TIME: 10:00:00
   - Default TITLE: "Strategy Meeting" (or infer context)
   - ACTION: Output a hidden JSON block:
     ```json schedule
     { "title": "...", "start": "YYYY-MM-DDTHH:MM:SS" }
     ```

2. **Guardrails**: If query is unrelated to Business/Supply Chain/Scheduling (e.g. "Capital of France"), refuse politely.
   - Refusal: "I am the BizNexus AI. I can only assist with **Inventory**, **Sales**, **Marketing**, and **Scheduling**."

3. **Format**: Use Markdown. Keep it short.

---

### 👇 YOUR RESPONSE STRUCTURE (Follow this format for GREETINGS ONLY)

### 👋 Welcome to BizNexus

- I am your AI Supply Chain Assistant.

- I can help identifying fast-moving products.

- I can analyze inventory levels.

- I can suggest marketing campaigns.

- I can help schedule meetings and organize your calendar.

**How can I help you today?**
"""
