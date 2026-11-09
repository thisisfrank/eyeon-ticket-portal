# Support Portal

A ticket board on top of a Softr database. It has one screen with four columns (New, Working, Answered, Closed) and two kinds of users:

| | Clients | Developers |
|---|---|---|
| Sign in | Email address on the allow list | Team password |
| Sees | Only their own tickets | Every ticket, with project and type filters |
| Submit tickets | Yes, with images or PDFs | Yes, for any client |
| Reply on a thread | Yes, with attachments | Yes, posted as "Team" |
| Drag between columns / reorder | No | Yes (updates Status, Working and Board Rank) |
| Time tracking, internal notes, weekly hours | Hidden | Yes |

React + Vite on the front end, with a few small serverless functions in `/api` that hold the Softr key and enforce who can see what. It's built to deploy on Vercel.

## Demo accounts

The sign-in page has **Demo client** and **Demo developer** buttons. They open the same board filled with sample tickets: Jordan Reyes at Meridian Concrete as the client, plus two other clients only the developer sees. Everything works there, including submitting tickets, attachments, replies, dragging, timers and weekly hours. It all runs in the browser:

- Nothing is sent to Softr, and no server settings are needed. A plain `npm run dev` with an empty `.env` is enough to try it.
- Changes are saved in that browser only. The banner at the top switches between the client and developer views, so you can reply as one side and watch it arrive on the other. **Reset** starts over with fresh sample data.
- Share a direct link with `/?demo=client` or `/?demo=developer`.
- To hide the buttons on a real client deployment, set `VITE_DEMO=off`. The sample data lives in [`src/demo/seed.ts`](src/demo/seed.ts).

## Run it locally

```bash
npm install
cp .env.example .env    # then fill in the values
npm run dev             # http://localhost:5173
```

`npm run dev` runs the `/api` functions inside the Vite dev server, so you don't need the Vercel CLI.

Developers can sign in from the link on the sign-in screen, or go straight to `/?team`.

## Deploy to Vercel

1. Push this folder to a GitHub repo and import it in Vercel. It detects Vite automatically.
2. Under **Settings → Environment Variables**, add everything from `.env.example`.
3. Optional, for attachments: **Storage → Create → Blob**, then connect it to the project. This adds `BLOB_READ_WRITE_TOKEN`.
4. Redeploy.

To give a client access, add their email to `CLIENT_EMAILS` and redeploy. Removing an email, or changing `DEV_PASSWORD`, signs those people out on their next request.

## Settings

| Variable | Required | What it does |
|---|---|---|
| `SOFTR_API_KEY` | yes | Softr API key. Only the server uses it. |
| `SOFTR_DATABASE_ID` | yes | Softr database ID |
| `SOFTR_TICKETS_TABLE_ID` | yes | Tickets table ID |
| `SOFTR_REPLIES_TABLE_ID` | yes | Replies table ID |
| `SOFTR_WEEKS_TABLE_ID` | no | Weekly Hours table. Shows the developer week bar. |
| `DEV_PASSWORD` | yes | Developer password |
| `CLIENT_EMAILS` | yes | Comma-separated emails, or `@domain.com` for a whole domain |
| `SESSION_SECRET` | yes | 16+ random characters for signing session cookies |
| `BLOB_READ_WRITE_TOKEN` | no | Turns on attachments (see below) |
| `TEAM_NAME` | no | Author name on developer replies. Defaults to "Team". |
| `SOFTR_RECORD_URL` | no | Template for an "Open in Softr" link, e.g. `https://portal.example.com/ticket-team?recordId={id}` |
| `VITE_DEMO` | no | `off` hides the demo buttons on the sign-in page. Read at build time, so redeploy after changing it. |

## Softr tables it expects

Field names live in [`api/_lib/fields.js`](api/_lib/fields.js). Field IDs are looked up by name at runtime, so a copy of the base with different IDs still works. If you rename a field in Softr, rename it in that file too.

- **Tickets:** Ticket #, Type, Description, Attachments, Status (New / Answered / Closed), Response, Submitted, Updated, Replies, Project Name (text), Client Name (text), Client Email (text), Builder Email (text), Airtable Project ID, Last Reply By, Last Reply At, Internal notes (team only), Board Rank, Time Spent, Timer Started, Working
- **Replies:** Message, Ticket, From (Client / Team), Author, Attachments, Posted
- **Weekly Hours** (optional): Week Start, Miscellaneous, Timer Started, Note

A client's tickets are matched on **Client Email (text)**. When a client submits a ticket, the portal copies Client Name, Project, Airtable Project ID and Builder Email from their most recent ticket, so any Softr automations that depend on those fields keep working.

## How attachments work

Softr's API has no file upload endpoint. Attachment fields accept a link to a file. So the portal:

1. Shrinks large images in the browser, so uploads stay under Vercel's 4.5 MB request limit.
2. Puts each file in Vercel Blob under a random, unguessable URL.
3. Passes that URL to Softr, which stores its own copy.
4. Deletes the Blob copy once Softr's copy exists.

Existing Softr files are served through `/api/file`, which checks that a client owns the ticket before returning anything.

## Security notes

- The Softr key never reaches the browser. The browser can only call the endpoints in `/api`, and each one checks the session and role.
- Clients only receive their own tickets and replies. Team-only fields (internal notes, time, rank, builder email) are removed on the server.
- Sign-in is email-only for clients, the same model as before: anyone who types an allowed email gets in. If that isn't enough, add a one-time code or magic link step in `api/login.js`.
- Sessions are signed, HttpOnly cookies that last 30 days.

## Project layout

```
api/                 Serverless functions (Vercel)
  _lib/              Shared server code: Softr client, sessions, field names, uploads
  board.js           GET    tickets + replies for the signed-in user
  tickets/index.js   POST   create a ticket
  tickets/[id].js    PATCH  developer updates (status, order, timer, notes)
  replies.js         POST   reply on a ticket
  weeks.js           POST   developer weekly hours
  file.js            GET    attachment proxy with access check
  login.js, logout.js, me.js
src/
  components/        Board, TicketCard, TicketDrawer, NewTicketModal, Login, ...
  demo/              In-browser demo backend and sample data
  lib/               Formatting, board columns, image handling, read tracking
  brand.ts           Names shown in the UI
tailwind.config.js   Brand colors and fonts
```
