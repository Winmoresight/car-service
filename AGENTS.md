<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project Validation Workflow

- For routine code changes, validate with Biome against only the files that were edited in the task.
- Do not rely on `npm run build`/`next build` as the default verification step in this Codex environment; it has repeatedly hung here while the user's IDE can build the project normally.
- If Biome passes for the edited files, treat the change as ready for user review unless the user explicitly asks for a full build or reports runtime issues.
