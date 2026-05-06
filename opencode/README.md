# Hamster Kombat 🐹

A tap-to-earn clicker game inspired by Hamster Kombat, with Node.js backend and terminal CLI client.

## Features

- **Registration & Login**: Create account, login from browser or terminal with same credentials
- **Tap-to-Earn**: Tap the hamster to earn coins with animated particles
- **Mining Cards**: Buy and upgrade cards across 4 categories for passive income
- **Daily Combo**: Find 3 special cards to earn 5,000,000 bonus coins
- **Boost System**: Turbo mode, full energy restore, multitap and energy limit upgrades
- **Task System**: Complete tasks (YouTube, daily, special) to earn bonus coins
- **CLI Client**: Check balance and buy cards from terminal
- **Server Sync**: Game data synced between browser and CLI via Node.js server
- **Canvas-rendered Hamster**: Custom animated hamster sprite with breathing, blinking, and tap reactions
- **Level System**: Progress through 11 levels from Bronze to Creator

## Quick Start

```bash
# Install dependencies
npm install

# Start server
npm start
# or
node server.js
```

Open http://localhost:3000 in browser to play.

## CLI Client

```bash
# Start CLI (server must be running)
npm run cli
# or
node cli.js
```

The CLI supports:
- Login / Register (same credentials as browser)
- View balance, level, energy, profit/hour
- Tap to earn coins
- Browse and buy mining cards

## Tech Stack

- **Backend**: Node.js + Express
- **Auth**: bcryptjs + JWT
- **Storage**: JSON file (data/users.json)
- **Frontend**: Vanilla HTML5 + CSS3 + JavaScript
- **CLI**: Node.js readline (no external dependencies)
- Canvas 2D for hamster sprite rendering
- Mobile-first responsive design

## Screens (Browser)

1. **Exchange** - Main tap screen with hamster, energy bar, and boost
2. **Mine** - Mining cards with categories and daily combo
3. **Friends** - Invite friends for bonuses
4. **Earn** - Complete tasks for rewards
5. **Airdrop** - Wallet connection and eligibility
