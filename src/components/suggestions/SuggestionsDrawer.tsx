import { X, Bot } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SuggestionsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export function SuggestionsDrawer({
  open,
  onClose,
}: SuggestionsDrawerProps) {
  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-40"
            onClick={onClose}
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50',
              'w-full sm:w-[420px] max-w-full',
              'bg-background border-l border-border shadow-xl',
              'flex flex-col'
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold">Navi AI</h2>
                </div>
                <p className="text-sm text-muted-foreground">Your travel agent expert</p>
              </div>
              <Button
                size="icon"
                variant="ghost"
                onClick={onClose}
                className="h-8 w-8"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Content - Coming Soon Placeholder */}
            <div className="flex-1 flex flex-col items-center justify-center px-6">
              {/* Chat bubble style container */}
              <div className="w-full max-w-sm">
                {/* Bot message bubble */}
                <div className="flex items-start gap-3 mb-6">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bot className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1 bg-muted rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-foreground">
                      Hi! I'm Navi, your AI travel assistant. I'll help you discover amazing activities, hidden gems, and personalized recommendations for your trips.
                    </p>
                  </div>
                </div>

                {/* Coming Soon badge */}
                <div className="flex flex-col items-center text-center mt-8">
                  <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary font-medium text-sm mb-3">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                    </span>
                    Coming Soon
                  </div>
                  <p className="text-sm text-muted-foreground">
                    We're building something special. Stay tuned!
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
