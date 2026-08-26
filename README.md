# DarkWing — Full Access Starter

This version adds a real Node/Express backend to the supplied DarkWing HTML page.

## Features
- Admin password login
- Upload poster + video
- Add title/year/genre
- Watch uploaded video in browser
- Download uploaded video
- Delete titles and their uploaded files
- JSON metadata storage

## Run locally
1. Install Node.js 20+.
2. In this folder run `npm install`.
3. Set `ADMIN_PASSWORD` to your own strong password.
4. Run `npm start`.
5. Open `http://localhost:3000`.

## Important deployment note
Do not use a free host's local filesystem as permanent media storage. For example, Render says free web-service files are ephemeral and can be lost on restart/redeploy. For a real public library, connect object storage (such as Supabase Storage) or use a paid persistent disk.

Only upload videos/posters you own, are public-domain, or are licensed to distribute.
