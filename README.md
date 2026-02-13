# Node.js API Template

A minimal Express setup for lightweight REST endpoints, now with Swagger (OpenAPI) documentation.

## 🚀 Run

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the server:

   ```bash
   node index.js
   ```

This will start a server at <http://localhost:3000/> responding with `Hello from your Node.js API!`.

## 📘 API Documentation (Swagger UI)

Once the server is running, you can access the interactive API docs at:

- Swagger UI: <http://localhost:3000/api-docs>

The documentation is generated from JSDoc-style comments in `index.js` using `swagger-jsdoc` and served with `swagger-ui-express`.
