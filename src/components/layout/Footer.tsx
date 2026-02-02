import { Logo } from '@/components/ui/Logo';

export function Footer() {
  return (
    <footer className="border-t border-border bg-secondary/30">
      <div className="container py-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <Logo size="sm" />
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} Roamiii. Plan together, travel better.
          </p>
        </div>
      </div>
    </footer>
  );
}
