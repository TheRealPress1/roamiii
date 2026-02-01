import { motion } from 'framer-motion';
import { GitCompareArrows } from 'lucide-react';

interface CompareTrayProps {
  count: number;
  onClick: () => void;
}

export function CompareTray({ count, onClick }: CompareTrayProps) {
  if (count < 2) return null;

  return (
    <motion.button
      initial={{ opacity: 0, y: 20, scale: 0.9 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.9 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-5 py-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
    >
      <GitCompareArrows className="h-5 w-5" />
      <span className="font-semibold">Compare ({count})</span>
    </motion.button>
  );
}
