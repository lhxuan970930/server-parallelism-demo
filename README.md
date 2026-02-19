# Node.js API Template

A minimal Express setup for lightweight REST endpoints.

## 🚀 Run

executing: `node index.js` will start a server at <http://localhost:3000/> responding with Hello from your Node.js API!.

## 🤖 Post-merge auto push (GitHub Actions)

This repo includes a GitHub Actions workflow that runs on every merge to `main`/`master` and can automatically commit + push generated changes back to the default branch.

- Workflow: `.github/workflows/post-merge-auto-push.yml`
- Tasks entrypoint: `npm run postmerge` (implemented by `scripts/post-merge.js`)

To add your own automation, edit `scripts/post-merge.js` (e.g. run a formatter, generate docs, update version files, etc.).
