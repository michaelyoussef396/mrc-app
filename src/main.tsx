import { initSentry } from "./lib/sentry";

// Canonical origin is www. Stranded apex-origin PWA clients are served their
// app shell from the service worker cache and never hit the edge redirect —
// this bounce (plus browsers that don't send Sec-Fetch-Mode) drains them.
// CSP script-src 'self' forbids inline scripts, so it lives here, not index.html.
if (window.location.hostname === "mrcsystem.com") {
  window.location.replace(
    `https://www.mrcsystem.com${window.location.pathname}${window.location.search}${window.location.hash}`
  );
}

initSentry();

import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
