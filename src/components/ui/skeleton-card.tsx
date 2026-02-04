import ContentLoader from "react-content-loader";

interface SkeletonCardProps {
  className?: string;
}

export function SkeletonCard({ className }: SkeletonCardProps) {
  return (
    <div className={className}>
      <ContentLoader
        speed={2}
        width="100%"
        height={160}
        viewBox="0 0 400 160"
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
      >
        {/* Image placeholder */}
        <rect x="0" y="0" rx="8" ry="8" width="100%" height="80" />
        {/* Title */}
        <rect x="0" y="96" rx="4" ry="4" width="70%" height="16" />
        {/* Subtitle */}
        <rect x="0" y="120" rx="4" ry="4" width="50%" height="12" />
        {/* Badge */}
        <rect x="0" y="144" rx="12" ry="12" width="80" height="16" />
      </ContentLoader>
    </div>
  );
}

export function SkeletonTripCard({ className }: SkeletonCardProps) {
  return (
    <div className={`rounded-xl border bg-card overflow-hidden ${className}`}>
      <ContentLoader
        speed={2}
        width="100%"
        height={280}
        viewBox="0 0 320 280"
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
      >
        {/* Cover image */}
        <rect x="0" y="0" rx="0" ry="0" width="320" height="140" />
        {/* Title */}
        <rect x="16" y="156" rx="4" ry="4" width="200" height="20" />
        {/* Date */}
        <rect x="16" y="186" rx="4" ry="4" width="140" height="14" />
        {/* Members avatars */}
        <circle cx="32" cy="230" r="16" />
        <circle cx="56" cy="230" r="16" />
        <circle cx="80" cy="230" r="16" />
        {/* Status badge */}
        <rect x="200" y="218" rx="12" ry="12" width="100" height="24" />
        {/* Progress bar */}
        <rect x="16" y="260" rx="4" ry="4" width="288" height="8" />
      </ContentLoader>
    </div>
  );
}

export function SkeletonMessage({ className }: SkeletonCardProps) {
  return (
    <div className={`flex gap-3 ${className}`}>
      <ContentLoader
        speed={2}
        width="100%"
        height={60}
        viewBox="0 0 400 60"
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
      >
        {/* Avatar */}
        <circle cx="20" cy="20" r="20" />
        {/* Name */}
        <rect x="52" y="8" rx="4" ry="4" width="100" height="12" />
        {/* Message bubble */}
        <rect x="52" y="28" rx="8" ry="8" width="250" height="28" />
      </ContentLoader>
    </div>
  );
}

export function SkeletonProposal({ className }: SkeletonCardProps) {
  return (
    <div className={`rounded-xl border bg-card p-4 ${className}`}>
      <ContentLoader
        speed={2}
        width="100%"
        height={200}
        viewBox="0 0 300 200"
        backgroundColor="#f3f3f3"
        foregroundColor="#ecebeb"
      >
        {/* Image */}
        <rect x="0" y="0" rx="8" ry="8" width="300" height="100" />
        {/* Title */}
        <rect x="0" y="116" rx="4" ry="4" width="200" height="16" />
        {/* Description */}
        <rect x="0" y="140" rx="4" ry="4" width="280" height="12" />
        <rect x="0" y="158" rx="4" ry="4" width="220" height="12" />
        {/* Vote buttons */}
        <rect x="0" y="180" rx="16" ry="16" width="60" height="20" />
        <rect x="70" y="180" rx="16" ry="16" width="60" height="20" />
      </ContentLoader>
    </div>
  );
}

export function SkeletonList({ count = 3, className }: SkeletonCardProps & { count?: number }) {
  return (
    <div className={`space-y-4 ${className}`}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
