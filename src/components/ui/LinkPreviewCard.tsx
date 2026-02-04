import { ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useLinkPreview, type LinkPreview } from '@/hooks/useLinkPreview';
import { getUrlDomain, getSiteName } from '@/lib/url-utils';

interface LinkPreviewCardProps {
  url: string;
  className?: string;
}

export function LinkPreviewCard({ url, className }: LinkPreviewCardProps) {
  const { preview, loading, error } = useLinkPreview(url);

  // Show loading skeleton
  if (loading) {
    return <LinkPreviewSkeleton className={className} />;
  }

  // Don't show anything if there's an error or no preview data
  if (error || !preview) {
    return <FallbackLink url={url} className={className} />;
  }

  // If preview has no useful data, show fallback
  if (!preview.title && !preview.description && !preview.image_url) {
    return <FallbackLink url={url} className={className} />;
  }

  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "block rounded-lg border border-border bg-card overflow-hidden transition-all hover:border-primary/50 hover:shadow-md",
        className
      )}
    >
      <div className="flex">
        {/* Thumbnail */}
        {preview.image_url && (
          <div className="w-24 h-20 flex-shrink-0 bg-muted">
            <img
              src={preview.image_url}
              alt=""
              className="w-full h-full object-cover"
              onError={(e) => {
                // Hide image on error
                (e.target as HTMLElement).parentElement!.style.display = 'none';
              }}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 p-3 min-w-0">
          {/* Site name / domain */}
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground mb-1">
            <span className="truncate">
              {preview.site_name || getSiteName(url)}
            </span>
            <ExternalLink className="h-3 w-3 flex-shrink-0" />
          </div>

          {/* Title */}
          {preview.title && (
            <h4 className="text-sm font-medium text-foreground line-clamp-1 mb-0.5">
              {preview.title}
            </h4>
          )}

          {/* Description */}
          {preview.description && (
            <p className="text-xs text-muted-foreground line-clamp-2">
              {preview.description}
            </p>
          )}
        </div>
      </div>
    </a>
  );
}

// Loading skeleton
function LinkPreviewSkeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card overflow-hidden animate-pulse",
        className
      )}
    >
      <div className="flex">
        {/* Thumbnail skeleton */}
        <div className="w-24 h-20 flex-shrink-0 bg-muted" />

        {/* Content skeleton */}
        <div className="flex-1 p-3 space-y-2">
          <div className="h-3 w-16 bg-muted rounded" />
          <div className="h-4 w-3/4 bg-muted rounded" />
          <div className="h-3 w-full bg-muted rounded" />
        </div>
      </div>
    </div>
  );
}

// Fallback for when preview fails
function FallbackLink({ url, className }: { url: string; className?: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card/50 hover:bg-muted transition-colors text-sm",
        className
      )}
    >
      <ExternalLink className="h-4 w-4 text-primary flex-shrink-0" />
      <span className="truncate text-primary">{getUrlDomain(url)}</span>
    </a>
  );
}

// Compact version for inline display
interface LinkPreviewInlineProps {
  preview: LinkPreview;
  className?: string;
}

export function LinkPreviewInline({ preview, className }: LinkPreviewInlineProps) {
  return (
    <a
      href={preview.url}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        "inline-flex items-center gap-1.5 px-2 py-1 rounded bg-muted/50 hover:bg-muted transition-colors text-xs",
        className
      )}
    >
      {preview.image_url && (
        <img
          src={preview.image_url}
          alt=""
          className="w-4 h-4 rounded object-cover"
          onError={(e) => {
            (e.target as HTMLElement).style.display = 'none';
          }}
        />
      )}
      <span className="text-foreground truncate max-w-[150px]">
        {preview.title || preview.site_name || getUrlDomain(preview.url)}
      </span>
      <ExternalLink className="h-3 w-3 text-muted-foreground flex-shrink-0" />
    </a>
  );
}
