export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-6xl animate-pulse px-4 py-6 sm:px-8 sm:py-8">
      <div className="h-8 w-44 rounded-md bg-muted" />
      <div className="mt-3 h-4 w-72 max-w-full rounded bg-muted" />
      <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-32 rounded-lg border border-border bg-card"
          />
        ))}
      </div>
    </div>
  );
}
