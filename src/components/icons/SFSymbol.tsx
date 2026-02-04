import { cn } from '@/lib/utils';
import type { SFSymbolName } from './sf-symbol-names';

export interface SFSymbolProps {
  name: SFSymbolName;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  inline?: boolean;
}

const sizeMap = {
  xs: 12,
  sm: 16,
  md: 20,
  lg: 24,
  xl: 32,
} as const;

export function SFSymbol({ name, size = 'sm', className, inline }: SFSymbolProps) {
  const pixelSize = sizeMap[size];

  return (
    <img
      src={`/icons/${name}.svg`}
      alt=""
      width={pixelSize}
      height={pixelSize}
      className={cn(
        'shrink-0',
        inline && 'inline-block align-text-bottom',
        // Use CSS filter to inherit currentColor (works for monochrome SVGs)
        'dark:invert',
        className
      )}
      style={{
        width: pixelSize,
        height: pixelSize,
      }}
      aria-hidden="true"
    />
  );
}
