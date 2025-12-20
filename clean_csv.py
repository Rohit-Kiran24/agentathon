
import os

file_path = r'c:\Projects\biznexus-agent\backend\data\sales.csv'

with open(file_path, 'r') as f:
    content = f.read()

# Find the start of the new header
header_marker = "transaction_id,date"
index = content.find(header_marker)

if index != -1:
    # Keep only content from the header onwards
    new_content = content[index:]
    
    with open(file_path, 'w') as f:
        f.write(new_content)
    print("File cleaned successfully.")
else:
    print("Header not found.")
