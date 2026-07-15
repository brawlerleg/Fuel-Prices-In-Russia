# Russian Fuel Crisis 2026 — strikes × search interest

An interactive chart overlaying drone strikes on Russian oil refineries against
how often people in Russia searched for "no petrol" on Google. Bilingual
(RU/EN), no build step, plain HTML/CSS/JS.

**Live version:** _добавь ссылку после публикации_


## What it shows

- An amber curve — the weekly Google Trends index for the query *"нет бензина"*
  ("no petrol") across Russia.
- Red bubbles — individual strikes on refineries and terminals. Bubble size is
  the facility's rated capacity (Mt/yr). Hover any bubble for the name, capacity
  and distance from the front line.
- A crosshair readout — move the cursor across the curve to read the value on
  any single day.
- Presets to zoom the time window (30 / 90 / 180 days / full range).

## Run locally

The page loads `data.json` with `fetch`, so it needs to be served over HTTP —
opening `index.html` directly with `file://` will be blocked by the browser.

```bash
cd site
python -m http.server 8000
# then open http://localhost:8000
```

## Rebuild the data

```bash
pip install -r requirements.txt

python scripts/scrape_strikes.py   # Wikipedia table -> data/dataset.csv
python scripts/fetch_trends.py     # Google Trends   -> data/trends.csv
python scripts/build_json.py       # merge both      -> site/data.json
```

`scrape_strikes.py` also documents the date-parsing: the Wikipedia column mixes
single dates, comma lists sharing one month ("22, 25, 31 March 2026"), en-dash
ranges ("9–10 June 2026") and footnote markers, all normalised with regex before
`pd.to_datetime`.

## Data & sources

- **Strikes** — the ["2025–2026 Russian fuel crisis"](https://en.wikipedia.org/wiki/2025%E2%80%932026_Russian_fuel_crisis)
  article on Wikipedia (CC BY-SA 4.0). Capacity and distance figures are as
  listed there and mix refinery throughput with terminal transit capacity — see
  the caveat below.
- **Search interest** — Google Trends, geo `RU`, weekly index (0–100, relative
  to the peak in the selected window).

## Caveats

- **Correlation is not cause.** A spike in searches after a strike does not prove
  the strike caused it; both can move with news cycles, seasonality and policy.
- **Search interest is attention, not price.** The curve tracks how much people
  looked something up, not what fuel actually cost at the pump. Official retail
  prices were held far below the real cost on independent stations during the
  crisis, so no single "price" series tells the whole story.
- **Capacity mixes two meanings.** For refineries it's processing throughput; for
  export terminals (e.g. Sheskharis) it's transit capacity, which is much larger.
  Summing them treats different things as the same unit — read totals with that
  in mind.
- **Google Trends is relative.** Values are indexed 0–100 within each query and
  window, not absolute search counts.

## License

Code is MIT (`LICENSE`). Strike data derives from Wikipedia under CC BY-SA 4.0.
