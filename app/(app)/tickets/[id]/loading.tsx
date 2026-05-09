export default function Loading() {
  return (
    <div className="p-6 animate-pulse">
      {/* Back link */}
      <div className="h-3 w-32 bg-gray-200 rounded mb-6" />

      <div className="flex gap-6">
        {/* Main */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Header card */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="h-5 w-2/3 bg-gray-200 rounded mb-2" />
            <div className="h-3 w-32 bg-gray-100 rounded mb-4" />
            <div className="space-y-2">
              <div className="h-3 w-full bg-gray-100 rounded" />
              <div className="h-3 w-4/5 bg-gray-100 rounded" />
              <div className="h-3 w-3/5 bg-gray-100 rounded" />
            </div>
          </div>
          {/* Activity card */}
          <div className="bg-white border border-gray-100 rounded-xl p-5">
            <div className="h-4 w-20 bg-gray-200 rounded mb-4" />
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex gap-3 mb-4">
                <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-32 bg-gray-200 rounded" />
                  <div className="h-3 w-full bg-gray-100 rounded" />
                  <div className="h-3 w-3/4 bg-gray-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Properties panel */}
        <div className="w-56 flex-shrink-0">
          <div className="bg-white border border-gray-100 rounded-xl p-4 space-y-4">
            <div className="h-3 w-20 bg-gray-200 rounded" />
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <div className="h-2.5 w-16 bg-gray-100 rounded" />
                <div className="h-3 w-24 bg-gray-200 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
