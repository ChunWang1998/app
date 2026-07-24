# Kaohsiung Nearby Price — local demo

> **Expo SDK 54.** Full step-by-step run commands (incl. zsh pitfalls) live in [`note.md`](./note.md) → section **「本機 Demo 怎麼跑」**.

## Structure

```
app2/
  115-1-K.csv          # sample real-price CSV
  docker-compose.yml   # PostGIS
  backend/             # FastAPI + import script
  mobile/              # Expo iOS app (react-native-maps)
  note.md              # frozen MVP spec
```

## 1. Database

```bash
cd app2
docker compose up -d
```

## 2. Backend

```bash
cd app2/backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env

# Import (demo geocode: district centroids + deterministic jitter)
python scripts/import_csv.py --csv ../115-1-K.csv --limit 500 --provider demo

# API
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Health: http://127.0.0.1:8000/health

### NLSC geocode (optional)

Address APIs need a free NLSC/TGOS application. After you have credentials:

```bash
# in backend/.env
GEOCODE_PROVIDER=nlsc
NLSC_APP_ID=...
NLSC_API_KEY=...

python scripts/import_csv.py --csv ../115-1-K.csv --provider nlsc
```

Without credentials, `--provider demo` keeps the map demo runnable. Results are still cached in `geocode_cache`.

## 3. Mobile (iOS)

```bash
cd app2/mobile
npm install
# Simulator not in Kaohsiung? force a downtown Kaohsiung coordinate:
EXPO_PUBLIC_FORCE_LAT=22.6273 EXPO_PUBLIC_FORCE_LNG=120.3014 npm run ios

# Physical device: point API to your Mac LAN IP
EXPO_PUBLIC_API_URL=http://192.168.x.x:8000 npm run start
```

Or set a custom location in the iOS Simulator to Kaohsiung (Features → Location → Custom Location).

## API

| Method | Path | Notes |
|--------|------|-------|
| GET | `/health` | health |
| GET | `/geo/in-kaohsiung?lat=&lng=` | Kaohsiung gate |
| GET | `/properties/nearby?lat=&lng=&radius_m=500&limit=20` | map pins |
| GET | `/properties/nearest?lat=&lng=&max_m=100` | nearest within 100m |
| GET | `/properties/{id}` | detail (`detail_status=coming_soon`) |

## Coloring

- **Fill** = ping price bucket (low / mid / high from p10 / p50 / p90)
- **Stroke** = building age (`0–10` / `11–30` / `31+`)
