# Chess Day Frontend

React + TypeScript + Vite frontend for Chess Day.

## Setup

1. Run `npm install`
2. Run `npm run dev` to start the development server

## Environment Variables

Create a `.env` file with the following variables:
- `VITE_API_URL` (default: `/api`)
- `VITE_WS_URL` (default: `ws://localhost:8000`)

## Stockfish WASM

The frontend uses the `stockfish` npm package to load the Stockfish WASM module for bot play and client-side analysis. The WASM files are automatically served via the worker.

## Features

- Local Play (PvP)
- Play vs Bot (Stockfish WASM)
- Online Multiplayer
- Client-side Analysis
- Game Review
