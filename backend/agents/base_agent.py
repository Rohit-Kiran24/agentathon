import os
import pandas as pd
from google import genai
from google.genai import types
from abc import ABC, abstractmethod
from typing import Optional
import re
import time
import numpy as np
from database import get_schema_info, get_schema_info_cached, get_engine


class BaseAgent(ABC):
    """
    Base class for all agents in the BizNexus system.
    Provides shared functionality like model initialization, data loading, and prompt generation.
    """
    
    # Class-level variables for API Key Rotation
    _api_keys = []
    _current_key_idx = 0
    _keys_loaded = False
    
    # Class Cache with TTL
    _cache = {}
    _cache_ttl = 300 # 5 Minutes

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
        self.cache = {} 
        
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
        
        return genai.Client(api_key=key)
    
    def load_csv(self, filename: str) -> Optional[pd.DataFrame]:
        """
        Load a CSV file from the data directory.
        """
        try:
            path = os.path.join(self.base_dir, "data", filename)
            return pd.read_csv(path)
        except Exception as e:
            print(f"Error loading {filename}: {str(e)}")
            return None

    def load_any_csv(self) -> Optional[pd.DataFrame]:
        """
        Load the first data file (CSV/Excel/JSON) found in the data directory.
        Uses a row limit to improve performance.
        """
        try:
            data_dir = os.path.join(self.base_dir, "data")
            if not os.path.exists(data_dir):
                return None
            
            # Look for any supported extension
            supported_exts = ('.csv', '.xlsx', '.xls', '.json')
            files = [f for f in os.listdir(data_dir) if f.lower().endswith(supported_exts)]
            
            if not files:
                return None
            
            file_path = os.path.join(data_dir, files[0])
            ext = os.path.splitext(file_path)[1].lower()
            
            # Limit rows to 500 for speed
            nrows = 500
            
            if ext == '.csv':
                return pd.read_csv(file_path, nrows=nrows)
            elif ext in ('.xlsx', '.xls'):
                return pd.read_excel(file_path, nrows=nrows)
            elif ext == '.json':
                # For JSON, read as records and slice
                df = pd.read_json(file_path, orient='records')
                return df.head(nrows)
                
            return None
            
        except Exception as e:
            print(f"Error loading any data file: {str(e)}")
            return None
    
    def format_dataframe(self, df: pd.DataFrame, title: str) -> str:
        """Format a DataFrame as a string for inclusion in prompts."""
        return f"\n{title}:\n{df.to_string(index=False)}\n"
    
    @abstractmethod
    def get_context(self) -> str:
        """Get the data context for this agent."""
        pass
    
    @abstractmethod
    def get_system_instruction(self) -> str:
        """Get the system instruction/prompt for this agent."""
        pass
    
    # --- CACHING HELPER METHODS ---
    def _is_cache_valid(self, query: str) -> bool:
        """Check if the cache entry for the query exists and is fresh."""
        if query not in BaseAgent._cache:
            return False
        entry = BaseAgent._cache[query]
        if not isinstance(entry, tuple) or len(entry) != 2:
            return False
        _, timestamp = entry
        return (time.time() - timestamp) < BaseAgent._cache_ttl

    def _get_cached_result(self, query: str):
        if self._is_cache_valid(query):
            return BaseAgent._cache[query][0]
        return None

    def _set_cache(self, query: str, result: dict):
        BaseAgent._cache[query] = (result, time.time())

    # --- PROMPT HELPER METHODS ---
    def _truncate_prompt(self, text: str, limit: int = 50000) -> str:
        """Trim the prompt if it exceeds a very large safety limit."""
        if len(text) <= limit:
            return text
        # If we must truncate, keep the head (instructions) and the tail (latest query)
        keep = limit // 2
        return text[:keep] + "\n...[middle truncated]...\n" + text[-keep:]

    # --- FORECASTING HELPER ---
    def forecast_data(self, df: pd.DataFrame, target_col: str) -> str:
        """Simple linear regression forecast."""
        try:
            series = pd.to_numeric(df[target_col], errors='coerce').dropna()
            if series.empty:
                return f"Unable to forecast: column '{target_col}' has no numeric data."
            x = np.arange(len(series))
            y = series.values
            coeffs = np.polyfit(x, y, 1)
            slope, intercept = coeffs
            next_x = len(series)
            forecast = slope * next_x + intercept
            return f"Forecast for next period ({target_col}): {forecast:.2f}"
        except Exception as e:
            return f"Forecast error: {str(e)}"

    def analyze(self, query: str, history: list[dict] = []) -> dict:
        """
        Analyze a query using this agent's specific context and instructions.
        Includes caching, forecasting, and SQL optimizations.
        """
        # Check TTL cache
        if self._is_cache_valid(query):
             print(f"[{self.agent_name}] Returning cached response for: {query}")
             return self._get_cached_result(query)

        try:
            # Forecast intent
            forecast_keywords = ["forecast", "predict", "expected", "next month", "profit", "sales"]
            is_forecast = any(kw in query.lower() for kw in forecast_keywords)

            # Build Prompt Components
            system_instruction = self.get_system_instruction()
            context = self.get_context() 
            schema_info = get_schema_info_cached()
            
            # Persona + SQL instruction (Consultant Style)
            sql_instruction = f"""
DATA ACCESS (Optional Helper):
You have access to a local SQLite database table if needed:
{schema_info}

ROLE INSTRUCTION:
You are a high-level business consultant. Your answers should be rich, strategic, and professional.
- Use the provided 'CURRENT SESSION DATA' or query the SQL database if you need more details.
- If the question is strategic, answer using your persona knowledge.
- BE HELPFUL AND ENGAGING.

SQL TIP:
- When asked for calculated metrics (like Margin, ROI, Conversion), **ALWAYS SELECT ALL** necessary underlying columns in your SQL query (e.g., SELECT Profit, Revenue... FROM ...).
- Better to select extra columns (* or many fields) than to miss one.
"""
            suggestion_instr = """
**INTERNAL SUGGESTION INSTRUCTION:**
At the very end of your response, append a JSON suggestions block with 3 relevant follow-up questions:
```json suggestions
["Question 1?", "Question 2?", "Question 3?"]
```
"""     
            # History (Last 5)
            history_text = ""
            if history:
                history_text = "CONVERSATION HISTORY:\n"
                for msg in history[-5:]: 
                    sender = "User" if msg.get("sender") == "user" else "Agent"
                    history_text += f"{sender}: {msg.get('text', '')}\n"
                history_text += "\n"

            # Combine strictly
            full_prompt = f"{system_instruction}\n\n{context}\n\n{sql_instruction}\n\n{suggestion_instr}\n\n{history_text}User Question: {query}"
            full_prompt = self._truncate_prompt(full_prompt)

            # Turn 1
            client = self._get_rotated_client()
            response = client.models.generate_content(model=self.model_name, contents=full_prompt)
            final_response = response.text
            
            # Forecast Logic
            if is_forecast:
                df = self.load_any_csv()
                if df is not None:
                     numeric_cols = df.select_dtypes(include='number').columns.tolist()
                     if numeric_cols:
                         forecast_msg = self.forecast_data(df, numeric_cols[0])
                         final_response += f"\n\n{forecast_msg}"

            # SQL Execution
            sql_match = re.search(r"```sql\s*(.*?)\s*```", final_response, re.DOTALL)
            if sql_match:
                sql_block = sql_match.group(1).strip()
                queries = [q.strip() for q in sql_block.split(';') if q.strip()]
                combined = ""
                try:
                    engine = get_engine()
                    for i, q in enumerate(queries):
                        try:
                            df_res = pd.read_sql(q, engine)
                            if len(df_res) > 50:
                                df_res = df_res.head(50)
                                res_str = df_res.to_markdown(index=False) + "\n... (truncated)"
                            else:
                                res_str = df_res.to_markdown(index=False) if not df_res.empty else "No results."
                            combined += f"\nQuery {i+1} Result:\n{res_str}\n"
                        except Exception as e:
                            combined += f"\nQuery {i+1} Failed: {str(e)}\n"
                    
                    # Turn 2
                    prompt_2 = f"{full_prompt}\nAgent Plan: {final_response}\n\nSYSTEM: SQL Execution Results:\n{combined}\n\nINSTRUCTION: Using the SQL Results above, provide the final answer to the user."
                    prompt_2 = self._truncate_prompt(prompt_2, limit=60000)
                    response_2 = client.models.generate_content(model=self.model_name, contents=prompt_2)
                    final_response = response_2.text
                except Exception as e:
                    final_response += f"\n\n(System Error executing SQL: {e})"

            result = {"response": final_response, "agent": self.agent_name}
            self._set_cache(query, result)
            return result
        except Exception as e:
            return {"response": f"Error: {e}", "agent": f"{self.agent_name} (Error)"}
