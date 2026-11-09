<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.

## What Lovable manages

Rules outside this block are the project's own. Change the pieces below in
Lovable, not by hand. With the [Lovable MCP](https://mcp.lovable.dev)
connected, `send_message` asks Lovable to do it; otherwise ask the user to
use the editor.

- **Database.** Do not add or edit `supabase/migrations/` or `drizzle/`.
  Ask Lovable to change the schema.
- **Generated files.** Do not edit a file whose header says it is automatically
  generated.
- **AI gateway.** Keep model calls on Lovable's gateway, and keep
  `LOVABLE_API_KEY` out of browser code.
- **Connectors.** Lovable provides native connectors. `list_connectors` shows
  which are enabled; `add_connector` only returns the dashboard link. When a
  connector is enabled, calls go through the connector gateway and need
  `LOVABLE_API_KEY`. When Lovable does not provide one, users can bring their
  own key and store it in Secrets.
- **Secrets.** Lovable manages them. Do not put secret values in the repo.
<!-- LOVABLE:END -->

## Project rules

- Workspace data lives in a client-side store (`src/lib/store/sentinel-store.tsx`) persisted to localStorage; pages read it through `WorkspaceGate`, which renders loading/error states. Why: the app starts on sample data with no backend; swap the store's load/persist for a real API later.
- Sample data is generated only in `src/lib/mock/seed.ts`; never hardcode statistics in UI. Why: every number shown is derived from check history via `src/lib/monitoring/metrics.ts`.
- Real endpoint checks run through the `runEndpointCheck` server function (`src/lib/monitoring/checks.functions.ts`). Why: browser CORS blocks direct checks; it also blocks private/local hosts.
- The root route loads the app shell (`src/components/layout/app-shell.tsx`) with `React.lazy`. Why: shared components statically imported by the root put React-refresh code ahead of the dev preamble and the dev preview fails to hydrate.
- The UI is dark-only; all colors come from tokens in `src/styles.css` (success/warning/destructive map to operational/degraded/down).
