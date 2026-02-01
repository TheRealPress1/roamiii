import { useState, useEffect } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface DeadlineCountdownProps {
  deadline: string;
  size?: 'sm' | 'md' | 'lg';
}

interface TimeLeft {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

function calculateTimeLeft(deadline: string): TimeLeft {
  const difference = new Date(deadline).getTime() - new Date().getTime();
  
  if (difference <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
  }

  return {
    days: Math.floor(difference / (1000 * 60 * 60 * 24)),
    hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
    minutes: Math.floor((difference / 1000 / 60) % 60),
    seconds: Math.floor((difference / 1000) % 60),
    total: difference,
  };
}

export function DeadlineCountdown({ deadline, size = 'md' }: DeadlineCountdownProps) {
  const [timeLeft, setTimeLeft] = useState<TimeLeft>(calculateTimeLeft(deadline));

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(calculateTimeLeft(deadline));
    }, 1000);

    return () => clearInterval(timer);
  }, [deadline]);

  const isExpired = timeLeft.total <= 0;
  const isUrgent = timeLeft.total > 0 && timeLeft.days === 0 && timeLeft.hours < 24;

  const sizeClasses = {
    sm: 'text-xs gap-1 px-2 py-1',
    md: 'text-sm gap-1.5 px-3 py-1.5',
    lg: 'text-base gap-2 px-4 py-2',
  };

  const iconSizes = {
    sm: 'h-3 w-3',
    md: 'h-4 w-4',
    lg: 'h-5 w-5',
  };

  if (isExpired) {
    return (
      <div className={cn(
        'inline-flex items-center rounded-full font-medium bg-muted text-muted-foreground',
        sizeClasses[size]
      )}>
        <Clock className={iconSizes[size]} />
        <span>Decision time passed</span>
      </div>
    );
  }

  const formatUnit = (value: number, unit: string) => {
    return `${value}${unit}`;
  };

  let displayText = '';
  if (timeLeft.days > 0) {
    displayText = `${formatUnit(timeLeft.days, 'd')} ${formatUnit(timeLeft.hours, 'h')} left`;
  } else if (timeLeft.hours > 0) {
    displayText = `${formatUnit(timeLeft.hours, 'h')} ${formatUnit(timeLeft.minutes, 'm')} left`;
  } else {
    displayText = `${formatUnit(timeLeft.minutes, 'm')} ${formatUnit(timeLeft.seconds, 's')} left`;
  }

  return (
    <div className={cn(
      'inline-flex items-center rounded-full font-medium transition-colors',
      sizeClasses[size],
      isUrgent 
        ? 'bg-vote-out-bg text-vote-out animate-pulse' 
        : 'bg-secondary text-secondary-foreground'
    )}>
      {isUrgent ? (
        <AlertTriangle className={iconSizes[size]} />
      ) : (
        <Clock className={iconSizes[size]} />
      )}
      <span>{displayText}</span>
    </div>
  );
}
