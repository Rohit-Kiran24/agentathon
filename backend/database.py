from sqlalchemy import create_engine
import os

# SQLite database file will be created in the current directory
DB_FILE = "biznexus_local.db"
DATABASE_URL = f"sqlite:///{DB_FILE}"

# Create Engine
engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False} # Needed for SQLite
)


def get_engine():
    return engine

from sqlalchemy import inspect

def get_schema_info():
    """
    Returns a string summary of all tables and columns in the DB.
    Used to prompt the LLM.
    """
    inspector = inspect(engine)
    tables = inspector.get_table_names()
    
    if not tables:
        return "No uploaded data tables found."
        
    schema_str = "AVAILABLE DATA TABLES:\n"
    for table in tables:
        columns = [col['name'] for col in inspector.get_columns(table)]
        schema_str += f"- Table `{table}` has columns: {', '.join(columns)}\n"
        
    return schema_str
