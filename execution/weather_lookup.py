#!/usr/bin/env python3
"""
Look up current weather for a city.

Directive: directives/weather_lookup.md

Usage:
    python execution/weather_lookup.py "San Francisco"
    python execution/weather_lookup.py "London"
"""

import os
import sys
import argparse
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# =============================================================================
# VERSION - Must match directive
# =============================================================================
DOE_VERSION = "2026.01.23"

# =============================================================================
# CONFIG
# =============================================================================
API_KEY = os.getenv("WEATHER_API_KEY")
API_URL = "https://api.openweathermap.org/data/2.5/weather"


def main():
    parser = argparse.ArgumentParser(
        description="Get current weather for a city"
    )
    parser.add_argument("city", help="City name (e.g., 'San Francisco')")
    args = parser.parse_args()

    # Validate API key BEFORE making request
    if not API_KEY:
        print("ERROR: WEATHER_API_KEY not set in .env")
        print()
        print("To fix:")
        print("1. Get a free API key at: https://openweathermap.org/api")
        print("2. Add to your .env file:")
        print("   WEATHER_API_KEY=your_key_here")
        return 1

    # Import requests here (after validation) to show pattern
    try:
        import requests
    except ImportError:
        print("ERROR: requests library not installed")
        print("Run: pip install requests")
        return 1

    try:
        # Make API request
        response = requests.get(
            API_URL,
            params={
                "q": args.city,
                "appid": API_KEY,
                "units": "metric"
            },
            timeout=10
        )

        # Handle HTTP errors
        if response.status_code == 401:
            print("ERROR: Invalid API key")
            print("Check your WEATHER_API_KEY in .env")
            return 1

        if response.status_code == 404:
            print(f"ERROR: City not found: {args.city}")
            print("Try a different spelling or add country code (e.g., 'London,UK')")
            return 1

        response.raise_for_status()

        # Parse and display result
        data = response.json()
        city_name = data["name"]
        country = data["sys"]["country"]
        temp = data["main"]["temp"]
        description = data["weather"][0]["description"]

        print(f"Weather in {city_name}, {country}:")
        print(f"  Temperature: {temp}C")
        print(f"  Conditions: {description.title()}")

        return 0

    except requests.exceptions.Timeout:
        print("ERROR: Request timed out")
        print("Check your internet connection and try again")
        return 1
    except requests.exceptions.RequestException as e:
        print(f"ERROR: Request failed: {e}")
        return 1
    except KeyError as e:
        print(f"ERROR: Unexpected API response (missing {e})")
        return 1
    except Exception as e:
        print(f"ERROR: {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
