import Link from "next/link";

// Co-located 404 for component detail pages. The root layout's <AppFrame>
// already renders the shared sidebar for every /components/* path, so this
// boundary must render ONLY the inner content — rendering app/not-found.tsx's
// <AppShell> here stacked a second (static-registry) sidebar on top of the
// live DB one.
export default function ComponentNotFound() {
  return (
    <main className="relative h-full min-w-0 flex-1 overflow-y-auto p-1.5">
      <div className="min-h-full bg-bg p-6 sm:p-10">
        <div className="flex flex-col items-start gap-4 py-32">
          <p className="text-2xs tracking-tighter text-muted">404</p>
          <p className="text-sm tracking-tighter text-muted">Component not found.</p>
          <Link href="/" className="ui-btn-primary px-4">
            Back to gallery
          </Link>
        </div>
      </div>
    </main>
  );
}
