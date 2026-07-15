from pytrends.request import TrendReq
import pandas as pd

pytrends = TrendReq(hl='ru-RU', tz=180)
pytrends.build_payload(
    kw_list=['цена бензина', 'нет бензина', 'очереди на заправках'],
    timeframe='2024-06-01 2025-01-01',
    geo='RU'
)
df = pytrends.interest_over_time()

trends = pd.DataFrame({
    'date': df.index,
    'price': df['цена бензина'],
    'absence': df['нет бензина'],
    'lines': df['очереди на заправках']
})

trends.to_csv('trends3.csv', index=False)

print(df.columns)