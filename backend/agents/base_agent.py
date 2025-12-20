import os
import pandas as pd
from google import genai
from google.genai import types
from abc import ABC, abstractmethod
from typing import Optional


class BaseAgent(ABC):
    """
    Base class for all agents in the BizNexus system.
    Provides shared functionality like model initialization, data loading, and prompt generation.
    """
    
    # Class-level variables for API Key Rotation
    _api_keys = []
    _current_key_idx = 0
    _keys_loaded = False
    
    def __init__(self, agent_name: str, model_name: str = "gemini-2.5-flash"):
        """
        Initialize the base agent.
        
        Args:
            agent_name: Name of the agent (e.g., "Inventory Agent")
            model_name: Gemini model to use
        """
        self.agent_name = agent_name
        self.model_name = model_name
        
        # Load keys only once for the class
        if not BaseAgent._keys_loaded:
            self._load_api_keys()
            
        self.base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        self.cache = {}  # Simple in-memory cache
        
        # Fallback if no keys found
        if not BaseAgent._api_keys:
             BaseAgent._api_keys = [os.getenv("GOOGLE_API_KEY")]

    @classmethod
    def _load_api_keys(cls):
        """Load multiple API keys from environment variables."""
        # Load primary key
        primary_key = os.getenv("GOOGLE_API_KEY")
        if primary_key:
            cls._api_keys.append(primary_key)
            
        # Load additional keys (GOOGLE_API_KEY_2, GOOGLE_API_KEY_3, ...)
        i = 2
        while True:
            key = os.getenv(f"GOOGLE_API_KEY_{i}")
            if not key:
                break
            cls._api_keys.append(key)
            i += 1
            
        cls._keys_loaded = True
        print(f"✅ Loaded {len(cls._api_keys)} API keys for rotation.")

    def _get_rotated_client(self):
        """Get a genai Client using Vertex AI (if configured) or API Key fallback."""
        # 1. Check for Vertex AI Config
        project_id = os.getenv("PROJECT_ID")
        location = os.getenv("LOCATION")
        
        if project_id and location:
             # Use Vertex AI (credentials implied via ADC)
             return genai.Client(vertexai=True, project=project_id, location=location)

        # 2. Existing API Key Logic
        if not BaseAgent._api_keys:
            # Absolute fallback
            return genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
            
        # Select key and rotate index
        key = BaseAgent._api_keys[BaseAgent._current_key_idx]
        BaseAgent._current_key_idx = (BaseAgent._current_key_idx + 1) % len(BaseAgent._api_keys)
        
        # print(f"Using Key Index: {BaseAgent._current_key_idx}") # Debugging
        
        return genai.Client(api_key=key)
    
    def load_csv(self, filename: str) -> Optional[pd.DataFrame]:
        """
        Load a CSV file from the data directory.
        
        Args:
            filename: Name of the CSV file (e.g., "inventory.csv")
            
        Returns:
            DataFrame if successful, None if error
        """
        try:
            path = os.path.join(self.base_dir, "data", filename)
            return pd.read_csv(path)
        except Exception as e:
            print(f"Error loading {filename}: {str(e)}")
            return None
    
    def format_dataframe(self, df: pd.DataFrame, title: str) -> str:
        """
        Format a DataFrame as a string for inclusion in prompts.
        
        Args:
            df: DataFrame to format
            title: Title to display above the data
            
        Returns:
            Formatted string representation
        """
        return f"\n{title}:\n{df.to_string(index=False)}\n"
    
    @abstractmethod
    def get_context(self) -> str:
        """
        Get the data context for this agent.
        Each agent must implement this to load its specific data.
        
        Returns:
            Formatted string with relevant data
        """
        pass
    
    @abstractmethod
    def get_system_instruction(self) -> str:
        """
        Get the system instruction/prompt for this agent.
        Each agent must implement this to define its specific role and rules.
        
        Returns:
            System instruction string
        """
        pass
    
    def analyze(self, query: str, history: list[dict] = []) -> dict:
        """
        Analyze a query using this agent's specific context and instructions.
        Includes caching to prevent hitting rate limits on repeated queries.
        
        Args:
            query: User's question or request
            history: List of previous messages
            
        Returns:
            Dictionary with 'response' and 'agent' fields
        """
        # (Optional: check cache with history context? For now simple cache on query)
        if query in self.cache:
            print(f"[{self.agent_name}] Returning cached response for: {query}")
            return self.cache[query]

        try:
            context = self.get_context()
            system_instruction = self.get_system_instruction()
            
            # Format history
            history_text = ""
            if history:
                history_text = "CONVERSATION HISTORY:\n"
                for msg in history[-5:]: # Keep last 5 turns
                    sender = "User" if msg.get("sender") == "user" else "Agent"
                    text = msg.get("text", "")
                    history_text += f"{sender}: {text}\n"
                history_text += "\n"
            
            full_prompt = f"{system_instruction}\n\n{context}\n\n{history_text}User Question: {query}"
            
            # Use rotated client for this request
            client = self._get_rotated_client()
            
            response = client.models.generate_content(
                model=self.model_name,
                contents=full_prompt
            )
            
            result = {
                "response": response.text,
                "agent": self.agent_name
            }
            
            # Save to cache
            self.cache[query] = result
            return result

        except Exception as e:
            # If error is quota related, we could implement retry here, but rotation usually handles next request
            return {
                "response": f"Error: {str(e)}",
                "agent": f"{self.agent_name} (Error)"
            }
