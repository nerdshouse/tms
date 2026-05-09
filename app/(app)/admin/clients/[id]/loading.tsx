export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Back */}
      <div className="h-3 w-28 bg-gray-200 rounded mb-5" />

      {/* Client header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="w-11 h-11 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="space-y-1.5">
          <div className="h-5 w-40 bg-gray-200 rounded" />
          <div className="h-3 w-56 bg-gray-100 rounded" />
        </div>
      </div>

      {/* Tabs */}
      <div className="h-9 w-80 bg-gray-100 rounded-lg mb-6" />

      {/* Content grid */}
      <div className="grid grid-cols-3 gap-5">
        <div className="col-span-2 space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="h-4 w-36 bg-gray-200 rounded mb-4" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mb-3">
                <div className="flex justify-between mb-1">
                  <div className="h-3 w-20 bg-gray-100 rounded" />
                  <div className="h-3 w-8 bg-gray-100 rounded" />
                </div>
                <div className="h-2 rounded-full bg-gray-100" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="h-4 w-24 bg-gray-200 rounded mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2.5 border-b border-gray-50 last:border-0">
                <div className="w-3 h-3 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="h-3 flex-1 bg-gray-100 rounded" />
              </div>
            ))}
          </div>
        </div>
        <div className="space-y-4">
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="mb-3">
                <div className="h-2.5 w-16 bg-gray-100 rounded mb-1" />
                <div className="h-3 w-28 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
          <div className="bg-white border border-gray-100 rounded-xl p-4">
            <div className="h-3 w-24 bg-gray-200 rounded mb-3" />
            <div className="h-8 w-full bg-gray-100 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  );
}
