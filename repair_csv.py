
import csv
import re

input_file = r'c:\Projects\biznexus-agent\backend\data\sales.csv'
output_file = r'c:\Projects\biznexus-agent\backend\data\sales_clean.csv'

valid_lines = []
headers = None

with open(input_file, 'r', encoding='utf-8', errors='ignore') as f:
    for line in f:
        line = line.strip()
        if not line:
            continue
            
        # Capture Headers
        if line.startswith('transaction_id,date,customer_id'):
            headers = line
            continue
            
        # Capture Valid Transactions (Start with TXN)
        if line.startswith('TXN'):
            # simple validation: should have right number of commas
            # Expecting 12 columns -> 11 commas
            if line.count(',') >= 11:
                valid_lines.append(line)

print(f"Found {len(valid_lines)} valid transaction lines.")

if headers and valid_lines:
    with open(input_file, 'w', encoding='utf-8') as f:
        f.write(headers + '\n')
        f.write('\n'.join(valid_lines))
    print("Successfully overwrote sales.csv with clean data.")
else:
    print("Error: Could not find headers or valid lines. Aborting overwrite.")
