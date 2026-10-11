import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { Toaster } from "react-hot-toast";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
    <Toaster
      position="top-right"
      toastOptions={{
        duration: 3500,
        style: {
          borderRadius: "12px",
          border: "1px solid #e6e8e3",
          background: "#ffffff",
          color: "#0f1c17",
          fontSize: "14px",
          boxShadow: "0 2px 4px rgba(11,59,46,0.05), 0 16px 36px -14px rgba(11,59,46,0.25)",
        },
        success: { iconTheme: { primary: "#128c5e", secondary: "#ffffff" } },
        error: { iconTheme: { primary: "#c62828", secondary: "#ffffff" } },
      }}
    />
  </React.StrictMode>,
);
