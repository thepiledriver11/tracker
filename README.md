# Goal Tracker

A minimal black-and-white goal tracker with four sections: **Career**, **Fitness**, **Nutrition** and **Finance**.

Built with Next.js 15, React 19 and Tailwind CSS. All data is stored locally in the browser (localStorage) — no database, no accounts.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Build for production

```bash
npm run build
npm start
```

## Structure

- `/` — home: overall progress plus a card per section
- `/career`, `/fitness`, `/nutrition`, `/finance` — section pages with search, goal checklist, completed list and a floating **+** button to add goals
