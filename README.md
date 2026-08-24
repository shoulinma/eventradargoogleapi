# Local Ledger

A Node.js web app that geocodes an address and finds nearby businesses within five miles using Google Maps Platform.

## Data returned

- Business name and primary type
- Google industry/place categories
- Street address
- Phone number
- Website and Google Maps link
- Rating, review count, operating status, and opening hours

Google Places does **not** supply business email addresses. The app reports that field as unavailable rather than guessing or scraping it. Nearby Search (New) returns at most 20 places per request, ranked by prominence; it cannot guarantee an exhaustive list of every registered business in the radius.

## Google Cloud setup

1. Create or select a project in the [Google Cloud Console](https://console.cloud.google.com/).
2. Attach a billing account. Google Maps Platform requires billing even when usage stays within available credits.
3. Enable **Geocoding API** and **Places API (New)**.
4. Create an API key under **APIs & Services > Credentials**.
5. Restrict the key to the server's IP addresses in production and restrict API access to the two enabled APIs.

## Run locally

Requires Node.js 20 or later.

```powershell
npm install
Copy-Item .env.example .env
```

Set `GOOGLE_MAPS_API_KEY` in `.env`, then run:

```powershell
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Test

```powershell
npm test
```

The Google key remains on the Express server. Do not expose `.env` or put the key in browser JavaScript.
