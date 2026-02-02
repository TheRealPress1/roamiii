import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const iconSizes = {
    sm: 'h-6 w-6',
    md: 'h-7 w-7',
    lg: 'h-8 w-8',
  };

  const textSizes = {
    sm: 'text-lg',
    md: 'text-xl',
    lg: 'text-2xl',
  };

  return (
    <Link 
      to="/" 
      className="flex items-center gap-2 group cursor-pointer hover:opacity-90 transition-opacity"
    >
      <img 
        src="/roamiii-logo-temp.png" 
        alt="roamiii" 
        className={`${iconSizes[size]} object-contain`}
      />
      {showText && (
        <span className={`${textSizes[size]} font-display font-semibold text-foreground`}>
          roamiii
        </span>
      )}
    </Link>
  );
}
