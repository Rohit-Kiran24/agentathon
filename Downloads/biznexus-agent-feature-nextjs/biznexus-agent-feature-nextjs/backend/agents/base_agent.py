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
        """
        Load API keys OR Service Account Credentials.
        Prioritizes Service Account (credentials.json) if present.
        """
        import json
        
        # Check for service account credentials
        base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        cred_path = os.path.join(base_dir, "credentials.json")
        
        if os.path.exists(cred_path):
            print(f"✅ Found Service Account Credentials at: {cred_path}")
            os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = cred_path
            
            try:
                with open(cred_path, 'r') as f:
                    creds = json.load(f)
                    BaseAgent._project_id = creds.get("project_id")
                    BaseAgent._use_vertex = True
                    print(f"✅ Using Vertex AI Project: {BaseAgent._project_id}")
            except Exception as e:
                print(f"❌ Error reading credentials.json: {e}")
                
        # Load API keys as fallback or for rotation if no service account
        # Load primary key
        primary_key = os.getenv("GOOGLE_API_KEY")
        if primary_key:
            BaseAgent._api_keys.append(primary_key)
            
        # Load additional keys (GOOGLE_API_KEY_2, GOOGLE_API_KEY_3, ...)
        i = 2
        while True:
            key = os.getenv(f"GOOGLE_API_KEY_{i}")
            if not key:
                break
            BaseAgent._api_keys.append(key)
            i += 1
            
        BaseAgent._keys_loaded = True
        if BaseAgent._api_keys and not getattr(BaseAgent, '_use_vertex', False):
            print(f"✅ Loaded {len(BaseAgent._api_keys)} API keys for rotation.")

    def _get_rotated_client(self):
        """Get a genai Client using Service Account (Vertex) or API key (Rotation)."""
        
        # 1. Vertex AI (Service Account) Priority
        if getattr(BaseAgent, '_use_vertex', False) and getattr(BaseAgent, '_project_id', None):
            print(f"[DEBUG] Initializing Vertex AI Client for project: {BaseAgent._project_id}")
            return genai.Client(
                vertexai=True,
                project=BaseAgent._project_id,
                location="us-central1"
            )

        # 2. API Key Fallback
        if not BaseAgent._api_keys:
            # Absolute fallback
            return genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
            
        # Select key and rotate index
        key = BaseAgent._api_keys[BaseAgent._current_key_idx]
        BaseAgent._current_key_idx = (BaseAgent._current_key_idx + 1) % len(BaseAgent._api_keys)
        
        return genai.Client(api_key=key)
    
    def load_csv(self, filename: str, context_files: Optional[dict] = None) -> Optional[pd.DataFrame]:
        """
        Load a CSV file. Prefers user-specific URL from context_files if available.
        Otherwise falls back to local data directory.
        """
        try:
            # Check for user-specific override
            if context_files and filename in context_files and context_files[filename]:
                content = context_files[filename]
                # Heuristic: if it's a long string or has newlines, treat as content
                if len(content) > 255 or '\n' in content:
                    import io
                    return pd.read_csv(io.StringIO(content))
                else:
                    # Treat as URL/Path
                    return pd.read_csv(content)

            # Fallback to local
            path = os.path.join(self.base_dir, "data", filename)
            if os.path.exists(path):
                return pd.read_csv(path)
            return None
        except Exception as e:
            # print(f"Error loading {filename}: {str(e)}")
            return None

    def load_any_csv(self, context_files: Optional[dict] = None) -> Optional[pd.DataFrame]:
        """
        Attempts to load ANY valid CSV file found in the data source.
        Useful for agents that need to work with whatever data is present (Sales/Inventory).
        """
        # 1. Try context files first
        if context_files:
            for filename, content in context_files.items():
                if filename.endswith('.csv'):
                    import io
                    try:
                         if len(content) > 255 or '\n' in content:
                             return pd.read_csv(io.StringIO(content))
                         else:
                             return pd.read_csv(content)
                    except: continue

        # 2. Try Local Data Directory source
        data_dir = os.path.join(self.base_dir, "data")
        if os.path.exists(data_dir):
            for f in os.listdir(data_dir):
                if f.endswith(".csv"):
                    try:
                        return pd.read_csv(os.path.join(data_dir, f))
                    except: continue
        
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
    def get_context(self, context_files: Optional[dict] = None) -> str:
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
    
    def analyze(self, query: str, context_files: Optional[dict] = None) -> dict:
        """
        Analyze a query using this agent's specific context and instructions.
        Includes caching to prevent hitting rate limits on repeated queries.
        
        Args:
            query: User's question or request
            context_files: Dictionary of {filename: url/path} for user-specific data
            
        Returns:
            Dictionary with 'response' and 'agent' fields
        """
        # Note: We skip cache if custom files are provided to ensure freshness
        if not context_files and query in self.cache:
            print(f"[{self.agent_name}] Returning cached response for: {query}")
            return self.cache[query]

        try:
            context = self.get_context(context_files)
            system_instruction = self.get_system_instruction()
            
            full_prompt = f"{system_instruction}\n\n{context}\n\nUser Question: {query}"
            
            # Auto-inject recommendations for non-Prediction agents
            if self.agent_name != "Prediction Agent":
                full_prompt += "\n\nIMPORTANT: At the very end of your response, you MUST provide a section titled '### 🛠 Recommended Actions' with 2-3 specific, actionable steps based on the data. ALSO, provide 3 suggested follow-up questions in a hidden JSON block format: ```json suggestions [\"Question 1\", \"Question 2\"]```"
            
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
