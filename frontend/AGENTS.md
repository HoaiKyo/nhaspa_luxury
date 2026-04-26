# AGENTS.md

## Project Overview
This is a React + Vite project for a spa/luxury service website. The codebase uses TypeScript and organizes features into pages, components, and contexts.

## Build & Run Commands
- **Install dependencies:** `npm install`
- **Run locally:** `npm run dev`
- **Set up API key:** Place your Gemini API key in `.env.local` as `GEMINI_API_KEY`.

## Key Conventions
- **Pages:** Located in `src/pages/` (e.g., Home, About, News, Profile, Services, etc.)
- **Components:** Shared UI in `src/components/` (e.g., modals, layout)
- **Contexts:** App-wide state in `src/contexts/` (e.g., AuthContext, BookingContext)
- **Mock Data:** See `src/data/mockData.ts` for sample data.

## Development Notes
- Uses Vite for fast development and hot reload.
- TypeScript is enforced throughout the codebase.
- No backend code is present; API integration is expected via environment variables and context.
- For authentication and booking, see the respective context and modal components.

## Useful Links
- [README.md](README.md) — Full setup and run instructions.

---
This file helps AI coding agents quickly understand the structure, conventions, and commands for this project. Update as the project evolves.
