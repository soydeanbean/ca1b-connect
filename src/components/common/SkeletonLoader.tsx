// src/components/common/SkeletonLoader.tsx

interface SkeletonLoaderProps {
  type?: "card" | "list" | "text" | "table" | "profile";
  count?: number;
}

export default function SkeletonLoader({ type = "card", count = 3 }: SkeletonLoaderProps) {
  const items = Array.from({ length: count });

  if (type === "text") {
    return (
      <div className="skeleton-loader text-loader">
        <div className="skeleton-line w-100" />
        <div className="skeleton-line w-75" />
        <div className="skeleton-line w-50" />
      </div>
    );
  }

  if (type === "list") {
    return (
      <div className="skeleton-loader list-loader">
        {items.map((_, i) => (
          <div key={i} className="skeleton-list-item">
            <div className="skeleton-line w-60" />
            <div className="skeleton-line w-30" />
          </div>
        ))}
      </div>
    );
  }

  if (type === "table") {
    return (
      <div className="skeleton-loader table-loader">
        <div className="skeleton-table-header">
          {[1, 2, 3, 4].map(i => <div key={i} className="skeleton-line w-20" />)}
        </div>
        {items.map((_, i) => (
          <div key={i} className="skeleton-table-row">
            {[1, 2, 3, 4].map(j => <div key={j} className="skeleton-line w-20" />)}
          </div>
        ))}
      </div>
    );
  }

  if (type === "profile") {
    return (
      <div className="skeleton-loader profile-loader">
        <div className="skeleton-avatar" />
        <div className="skeleton-line w-50" />
        <div className="skeleton-line w-30" />
        <div className="skeleton-line w-75" />
      </div>
    );
  }

  // Default: card
  return (
    <div className="skeleton-loader card-loader">
      {items.map((_, i) => (
        <div key={i} className="skeleton-card">
          <div className="skeleton-line w-40" />
          <div className="skeleton-line w-80" />
          <div className="skeleton-line w-60" />
          <div className="skeleton-line w-30" />
        </div>
      ))}
    </div>
  );
}