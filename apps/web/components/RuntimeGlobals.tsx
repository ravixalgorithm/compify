"use client";

// Exposes the host app's single instances of react/react-dom/jsx-runtime/
// framer-motion on globalThis so runtime-compiled component modules (loaded by
// DynamicComponent) resolve THESE instances instead of bundling their own.
// Shared React => hooks work; shared framer-motion => one motion context.
// Set at module evaluation (runs during hydration, before any DynamicComponent
// effect fires). Mounted once in the root layout.

import * as React from "react";
import * as ReactDOM from "react-dom";
import * as JsxRuntime from "react/jsx-runtime";
import * as FramerMotion from "framer-motion";

if (typeof globalThis !== "undefined") {
  (globalThis as Record<string, unknown>).__compifyGlobals ??= {
    react: React,
    "react-dom": ReactDOM,
    "react/jsx-runtime": JsxRuntime,
    "framer-motion": FramerMotion,
  };
}

export function RuntimeGlobals() {
  return null;
}
