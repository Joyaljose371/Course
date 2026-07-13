import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
// Add this line to handle automatic service worker updates
import { registerSW } from 'virtual:pwa-register'
registerSW({ immediate: true })
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
