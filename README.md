# Relax Mode TV Ad Tracker

A calm, interactive TV advertising dashboard that compares local and global channel costs, coverage efficiency, official contact channels, ad duration pricing, content restrictions, and audience viewing patterns in one place.

## Features

- Real-time style cost monitoring for local and global TV channels
- Coverage vs. cost comparison using interactive pricing metrics
- Official contact information for major TV channels
- Ad duration vs. cost tracking for 15s, 30s, 60s, and 90s slots
- Content guidance and restrictions for compliant advertising
- Viewership demographic summary by age group and time-of-day
- Clean, relaxing UI with a polished dashboard experience

## Tech stack

- Node.js + Express.js backend
- JSON-based database layer (ready to swap to MongoDB)
- Static frontend with interactive JavaScript
- Helmet, CORS, and rate limiting for core security protections

## Run locally

1. Install dependencies:
   npm install
2. Start the app:
   npm start
3. Open the website:
   http://localhost:3000

## Project structure

- `server.js` – Express server and API endpoints
- `data/tvDatabase.json` – Channel, pricing, and audience data
- `public/index.html` – Dashboard shell
- `public/styles.css` – Relax mode styling
- `public/app.js` – Interactive user experience logic

## Notes

This project uses an in-file JSON database for a self-contained local implementation. If you want production-ready persistence, connect MongoDB by setting `MONGODB_URI` in your environment.
