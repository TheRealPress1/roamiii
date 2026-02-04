import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import type { TripProposal } from '@/lib/tripchat-types';
import { cn } from '@/lib/utils';

interface DraggableProposalWrapperProps {
  proposal: TripProposal;
  isAdmin?: boolean;
  isIncluded?: boolean;
  children: React.ReactNode;
}

export function DraggableProposalWrapper({
  proposal,
  isAdmin,
  isIncluded,
  children,
}: DraggableProposalWrapperProps) {
  const isDraggable = isAdmin && !isIncluded;

  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: proposal.id,
    data: {
      proposal,
    },
    disabled: !isDraggable,
  });

  const style = transform
    ? {
        transform: CSS.Translate.toString(transform),
      }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(isDraggable ? { ...listeners, ...attributes } : {})}
      className={cn(
        'touch-none',
        isDragging && 'opacity-50',
        isDraggable && 'cursor-grab active:cursor-grabbing'
      )}
    >
      {children}
    </div>
  );
}
