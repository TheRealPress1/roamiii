import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Logo } from '@/components/ui/Logo';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { LogOut, User, LayoutDashboard } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { NotificationBell } from '@/components/notifications/NotificationBell';
import { NotificationDrawer } from '@/components/notifications/NotificationDrawer';
import { useNotifications } from '@/hooks/useNotifications';
import { ThemeToggle } from '@/components/ThemeToggle';

export function Header() {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 8);
    };
    
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const { notifications, loading, unreadCount, markAsRead, markAllAsRead } =
    useNotifications();

  const handleLogin = () => {
    navigate(user ? '/app' : '/auth');
  };

  const handleGetStarted = () => {
    navigate(user ? '/app' : '/onboarding');
  };

  const handleNotificationClick = (href: string | null, id: string) => {
    markAsRead(id);
    setDrawerOpen(false);
    if (href) navigate(href);
  };

  return (
    <header className={`sticky top-0 z-50 w-full transition-all duration-300 backdrop-blur-xl ${
      isScrolled 
        ? 'bg-background/80 border-b border-border/50 shadow-sm' 
        : 'bg-background/60 border-b border-transparent'
    }`}>
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        <nav className="flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Link to="/app">
                <Button variant="ghost" size="sm">
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  Dashboard
                </Button>
              </Link>
              
              <NotificationBell
                count={unreadCount}
                onClick={() => setDrawerOpen(true)}
              />

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={profile?.avatar_url || undefined} />
                      <AvatarFallback className="bg-primary/10 text-primary text-xs">
                        {profile?.name?.[0]?.toUpperCase() || profile?.email?.[0]?.toUpperCase() || 'U'}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:inline-block max-w-[120px] truncate">
                      {profile?.name || profile?.email?.split('@')[0]}
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link to="/app/profile" className="cursor-pointer">
                      <User className="h-4 w-4 mr-2" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => signOut()} className="text-destructive cursor-pointer">
                    <LogOut className="h-4 w-4 mr-2" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <NotificationDrawer
                open={drawerOpen}
                onClose={() => setDrawerOpen(false)}
                notifications={notifications}
                loading={loading}
                onMarkAsRead={markAsRead}
                onMarkAllAsRead={markAllAsRead}
                onNavigate={handleNotificationClick}
              />
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={handleLogin}>
                Log in
              </Button>
              <Button 
                size="sm" 
                className="gradient-primary text-white shadow-md hover:shadow-lg transition-shadow"
                onClick={handleGetStarted}
              >
                Get Started
              </Button>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
