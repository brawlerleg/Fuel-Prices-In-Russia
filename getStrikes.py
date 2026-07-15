from io import StringIO

import pandas as pd
import requests
import re

headers = {"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}

url = "https://en.wikipedia.org/wiki/2025%E2%80%932026_Russian_fuel_crisis"

response = requests.get(url, headers=headers)

print(response.status_code)

if response.status_code != 200:
    df = pd.read_csv('raw.csv')
else:
    tables = pd.read_html(StringIO(response.text))
    df = tables[1]
    #df = pd.concat([tables[0], tables[1]], ignore_index=True)
    df.to_csv("raw.csv", index=False)

def clean_dates(raw):
    if not isinstance(raw, str):
        return []

    text = raw
    text = re.sub(r'\[\w+\]', '', text)
    text = re.sub(r'\s*See also:.*$', '', text)
    text = re.sub(r'\s+', ' ', text)
    text = text.rstrip('.')
    text = re.sub(r'\b[A-Z][A-Za-z]*:\s*', ', ', text)
    text = text.strip(' ,')

    def expand_shared_month(m):
        days = [d.strip() for d in m.group(1).split(',') if d.strip()] + [m.group(2)]
        return ', '.join(f"{d} {m.group(3)} {m.group(4)}" for d in days)
    
    text = re.sub(
        r"\b((?:\d{1,2}\s*, \s*)+)(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b",
        expand_shared_month, text
    )

    text = re.sub(
        r'\b(\d{1,2})\s*[\u2013-]\s*(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})\b',
        lambda m: f"{m[1]} {m[3]} {m[4]}, {m[2]} {m[3]} {m[4]}",
        text
    )

    return [d.strip() for d in text.split(',') if d.strip()]

df["Date of strike(s)"] = df["Date of strike(s)"].apply(clean_dates)
df["Capacity (Mt/yr)"] = df["Capacity (Mt/yr)"].str.replace(r"\[\w+\]", '', regex=True )
df["Capacity (Mt/yr)"] = df["Capacity (Mt/yr)"].str.replace(r"\(\w+\)", '', regex = True)
df["Capacity (Mt/yr)"] = df["Capacity (Mt/yr)"].str.replace(r"\s*[-, ~].*$", '', regex = True)
df["Capacity (Mt/yr)"] = pd.to_numeric(df["Capacity (Mt/yr)"], errors='coerce')
df["Distance (km)"] = df["Distance (km)"].str.replace(r"\[\w+\]", "", regex=True)
df["Distance (km)"] = df["Distance (km)"].str.replace("+", '')




df = df.explode("Date of strike(s)").reset_index(drop=True)

#print(df[[ "Facility", "Date of strike(s)"]].sort_values("Date of strike(s)", ascending=False).head(64))

df["Date of strike(s)"] = pd.to_datetime(df["Date of strike(s)"], format='%d %B %Y', errors="coerce")
broken = df[df["Date of strike(s)"].isna()]
#print(df[[ "Facility", "Date of strike(s)"]].sort_values("Date of strike(s)", ascending=False).head(10))
#print(len(broken))
#print(broken[["Facility", "Date of strike(s)"]].to_string())

dataset = pd.DataFrame({
    "Facility": df["Facility"],
    "Capacity": df["Capacity (Mt/yr)"],
    "Distance": df["Distance (km)"],
    "Date": df["Date of strike(s)"]
})

dataset.to_csv("dataset.csv", index=False)

raw = pd.read_csv("raw.csv")

print(repr(raw.loc[raw["Facility"] == "Moscow Refinery", "Capacity (Mt/yr)"].iloc[0]))
