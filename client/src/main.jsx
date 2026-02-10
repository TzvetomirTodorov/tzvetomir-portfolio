import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import AdminPanel from "./AdminPanel.jsx";

// ═══════════════════════════════════════════════════════════════════
//  ROUTE CONTROLLER — Zero-Dependency Routing
//
//  Simple path-based routing for a single-page portfolio:
//    /       → Main portfolio (App)
//    /admin  → Admin panel (AdminPanel)
//
//  No react-router needed. The portfolio doesn't have complex
//  navigation requirements — just two views with a clean split.
//
//  For Vite SPA hosting (Vercel, Netlify, Railway), make sure
//  your deployment rewrites all paths to index.html so that
//  /admin doesn't 404 on a fresh page load. This is usually
//  automatic for Vite deployments, but if not:
//
//  Vercel:  Add a vercel.json with { "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
//  Netlify: Add a _redirects file with /* /index.html 200
// ═══════════════════════════════════════════════════════════════════

function Router() {
  const path = window.location.pathname;

  // /admin or /admin/ → Admin Panel
  if (path === "/admin" || path === "/admin/") {
    return <AdminPanel />;
  }

  // Everything else → Main Portfolio
  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <Router />
  </React.StrictMode>
);
