import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const sizes = {
    sm: 'h-6 w-6',
    md: 'h-8 w-8',
    lg: 'h-10 w-10',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <Link to="/" className="flex items-center gap-2 group">
      <div className="relative">
        <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg group-hover:bg-primary/30 transition-colors" />
        <MessageCircle className={`${sizes[size]} text-primary relative z-10 group-hover:scale-110 transition-transform`} />
      </div>
      {showText && (
        <span className={`${textSizes[size]} font-display font-semibold text-foreground`}>
          roamiii
        </span>
      )}
    </Link>
  );
}
