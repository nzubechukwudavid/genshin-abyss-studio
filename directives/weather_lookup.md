# Weather Lookup
<!-- DOE-VERSION: 2026.01.23 -->

## Goal

Look up current weather for any city using the OpenWeatherMap API. Demonstrates the API key pattern for workflows that require external services.

---

## Trigger Phrases

**Matches:**
- "check weather"
- "weather lookup"
- "what's the weather in [city]"
- "get weather for [city]"

---

## Quick Start

```bash
python execution/weather_lookup.py "San Francisco"
python execution/weather_lookup.py "London"
```

---

## What It Does

1. **Load** — Reads WEATHER_API_KEY from .env file
2. **Request** — Queries OpenWeatherMap API for current conditions
3. **Display** — Shows temperature and weather description

---

## Output

**Deliverable:** Current temperature and weather conditions
**Location:** stdout

---

## Prerequisites

### API Key (Required)

1. Get a free API key at: https://openweathermap.org/api
2. Add to your `.env` file:
   ```
   WEATHER_API_KEY=your_key_here
   ```

Note: Free tier allows 1,000 calls/day — plenty for personal use.

---

## CLI Arguments

| Argument | Default | Description |
|----------|---------|-------------|
| `city` | (required) | City name to look up |

---

## Edge Cases

### City Not Found
**Fix:** API returns 404 — script shows "City not found" error

### Invalid API Key
**Fix:** API returns 401 — script shows "Invalid API key" error

### No API Key Set
**Fix:** Script shows setup instructions before making request

---

## Changelog

### 2026.01.23
- Created
