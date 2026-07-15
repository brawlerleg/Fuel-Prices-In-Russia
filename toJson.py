import pandas as pd
import json

trends = pd.read_csv('trends.csv')
trends.columns.str.lower()
strikes = pd.read_csv('dataset.csv')
strikes = strikes.dropna(subset=['Date'])
strikes.columns = strikes.columns.str.lower()
payload = {
    'trends': trends.to_dict(orient='records'),
    'strikes': strikes.to_dict(orient='records')
}

with open('data.json', 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False, indent=2)
