import json
import os
from datetime import datetime, timedelta

DATA_FILE = os.path.join(os.getcwd(), 'data', 'events.json')

class CalendarManager:
    def __init__(self):
        self.ensure_data_dir()
        self.events = self.load_events()

    def ensure_data_dir(self):
        if not os.path.exists(os.path.dirname(DATA_FILE)):
            os.makedirs(os.path.dirname(DATA_FILE))

    def load_events(self):
        if os.path.exists(DATA_FILE):
            try:
                with open(DATA_FILE, 'r') as f:
                    return json.load(f)
            except:
                return self.get_default_events()
        return self.get_default_events()

    def save_events(self):
        with open(DATA_FILE, 'w') as f:
            json.dump(self.events, f, indent=4)

    def get_default_events(self):
        today = datetime.now()
        tomorrow = today + timedelta(days=1)
        return [
            {
                "id": "1",
                "title": "Inventory Audit",
                "start": today.replace(hour=10, minute=0, second=0).isoformat(),
                "type": "operation"
            },
            {
                "id": "2",
                "title": "Supplier Call",
                "start": today.replace(hour=14, minute=30, second=0).isoformat(),
                "type": "meeting"
            }
        ]

    def get_events(self):
        return self.events

    def add_event(self, event_data: dict):
        # Ensure ID
        if 'id' not in event_data:
            import time
            event_data['id'] = str(int(time.time()))
        
        self.events.append(event_data)
        self.save_events()
        return event_data

    def delete_event(self, event_id: str):
        self.events = [e for e in self.events if e['id'] != event_id]
        self.save_events()
        return True
