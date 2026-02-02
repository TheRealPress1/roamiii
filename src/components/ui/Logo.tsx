import { Link } from 'react-router-dom';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const iconSizes = {
    sm: 'h-8 w-8',
    md: 'h-10 w-10',
    lg: 'h-12 w-12',
  };

  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl',
  };

  return (
    <Link 
      to="/" 
      className="flex items-center gap-2 group cursor-pointer hover:opacity-90 transition-opacity bg-transparent"
    >
      <img 
        src="/roamiii-logo-temp.png" 
        alt="roamiii" 
        className={`${iconSizes[size]} object-contain block bg-transparent mix-blend-multiply dark:mix-blend-normal`}
        style={{ imageRendering: 'crisp-edges' }}
      />
      {showText && (
        <span className={`${textSizes[size]} font-display font-semibold text-foreground`}>
          roamiii
        </span>
      )}
    </Link>
  );
}
