export default function ProductSkeleton({ count = 4 }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="card-surface overflow-hidden" style={{ transform: "none" }}>
          <div className="skeleton aspect-[4/5] w-full rounded-none" />
          <div className="space-y-3 p-5">
            <div className="skeleton h-3 w-1/3" />
            <div className="skeleton h-5 w-4/5" />
            <div className="skeleton h-6 w-1/2" />
          </div>
        </div>
      ))}
    </>
  );
}
