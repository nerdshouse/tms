export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Page title */}
      <div className="h-5 w-40 bg-gray-200 rounded mb-1" />
      <div className="h-3 w-24 bg-gray-100 rounded mb-6" />

      {/* Controls bar */}
      <div className="flex items-center gap-3 mb-4">
        <div className="h-8 w-72 bg-gray-100 rounded-lg" />
        <div className="h-8 w-36 bg-gray-100 rounded-lg ml-auto" />
      </div>

      {/* Table skeleton */}
      <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
        {/* Header */}
        <div className="flex gap-4 px-4 py-2.5 border-b border-gray-100 bg-gray-50/60">
          {[24, 200, 80, 80, 60, 80, 80, 80].map((w, i) => (
            <div key={i} className="h-3 bg-gray-200 rounded" style={{ width: w }} />
          ))}
        </div>
        {/* Rows */}
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="flex gap-4 px-4 py-3.5 border-b border-gray-50 last:border-0">
            <div className="h-3 w-24 bg-gray-100 rounded" />
            <div className="h-3 flex-1 bg-gray-100 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-3 w-14 bg-gray-100 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
            <div className="h-3 w-20 bg-gray-100 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}
