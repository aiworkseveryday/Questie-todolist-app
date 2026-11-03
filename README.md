# Questie

A personal habit tracker that plays like a tiny RPG. Check off habits to level up your hero, keep your streak
alive, and keep your companion pet happy.

## Features (Phase 1)

- **Quests**: daily/weekday habits, good/bad (+/−) habits, and simple to-dos
- **Difficulty**: Easy / Medium / Hard pays 10 / 20 / 35 XP and 2 / 5 / 10 coins
- **Streaks**: any check-off counts for the day. Every 7 streak days earns a freeze token (max 3), which is
  spent automatically to bridge missed days
- **Hero + pet**: male or female hero in three looks; cat, bunny or dino pet whose mood follows your streak
- **Gestures**: swipe right to complete (or `+`), swipe left to edit/delete, long-press to edit
- Everything is stored on the phone in SQLite; there is no account

## Development

```bash
npm install
npx expo start --dev-client --localhost
npm test            # game engine unit tests
npx tsc --noEmit
npx expo lint
```

Native builds need a dev client (`npx expo run:android`) because the app isn't built for Expo Go.

## Layout

- `src/app/`: routes (onboarding, Today / Hero / Settings tabs, item editor modal)
- `src/game/engine.ts`: pure XP, level, streak, freeze and pet-mood rules (tested)
- `src/data/`: SQLite schema and migrations, plus `GameProvider` state and actions
- `src/characters/`: SVG hero and pet
- `src/components/`: design system (3D buttons, cards, swipeable rows, celebration)

## Roadmap

1. ~~MVP~~
2. Coin shop and gear, pet evolution at 7/30/100 days, achievements
3. Classes at level 10, stats dashboard, reminders, more characters
4. Supabase login and cloud backup
