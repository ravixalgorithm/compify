"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { getLibraryComponent } from "@compify/library";

class PreviewErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: "#fca5a5", fontFamily: "ui-monospace, monospace", fontSize: 13 }}>
          Preview error: {this.state.error.message}
        </div>
      );
    }
    return this.props.children;
  }
}

export default function PreviewPage({ params }: { params: { name: string } }) {
  const searchParams = useSearchParams();
  const embed = searchParams.get("embed") === "1";
  const Component = getLibraryComponent(params.name);
  const [props, setProps] = React.useState<Record<string, unknown>>({});
  const contentRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data;
      if (data && typeof data === "object" && data.type === "compify:props") {
        setProps(data.props ?? {});
      }
    }
    window.addEventListener("message", onMessage);
    window.parent?.postMessage({ type: "compify:ready", name: params.name }, "*");
    return () => window.removeEventListener("message", onMessage);
  }, [params.name]);

  React.useEffect(() => {
    if (!embed) return;

    const el = contentRef.current;
    if (!el) return;

    const report = () => {
      const height = Math.ceil(el.getBoundingClientRect().height);
      window.parent?.postMessage(
        { type: "compify:resize", name: params.name, height },
        "*"
      );
    };

    const observer = new ResizeObserver(report);
    observer.observe(el);
    report();

    return () => observer.disconnect();
  }, [embed, params.name, props]);

  if (embed) {
    return (
      <div
        ref={contentRef}
        style={{
          width: "100%",
          margin: 0,
          padding: 0,
          background: "#f5f5f5",
          overflow: "hidden",
        }}
      >
        <PreviewErrorBoundary key={params.name}>
          {Component ? (
            <Component {...props} />
          ) : (
            <div
              style={{
                padding: 24,
                color: "rgba(245,245,250,0.5)",
                fontFamily: "ui-monospace, monospace",
                textAlign: "center",
              }}
            >
              Unknown component: {params.name}
            </div>
          )}
        </PreviewErrorBoundary>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
        background: "#000000",
      }}
    >
      <div style={{ width: "100%", maxWidth: 1100 }}>
        <PreviewErrorBoundary key={params.name}>
          {Component ? (
            <Component {...props} />
          ) : (
            <div style={{ color: "rgba(245,245,250,0.5)", fontFamily: "Inter, sans-serif", textAlign: "center" }}>
              Unknown component: {params.name}
            </div>
          )}
        </PreviewErrorBoundary>
      </div>
    </div>
  );
}
