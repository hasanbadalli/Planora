export default function DashboardLoading() {
  return (
    <div className="mx-auto max-w-[1440px] animate-pulse px-4 py-6 sm:px-7 sm:py-8 xl:px-10">
      <div className="h-3 w-32 rounded bg-[#e1e7e0]" />
      <div className="mt-4 h-10 w-52 rounded-lg bg-[#dce4dc]" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-[#e5eae4]" />
      <div className="mt-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="h-44 rounded-[20px] border border-[#e2e7e0] bg-white"
          />
        ))}
      </div>
    </div>
  );
}
