import { useEffect, useState } from "react";
import Confetti from "react-confetti";
import { useWindowSize } from "react-use";
import { motion, AnimatePresence } from "framer-motion";

interface TripReadyCelebrationProps {
  isActive: boolean;
  onComplete?: () => void;
  duration?: number;
}

export function TripReadyCelebration({
  isActive,
  onComplete,
  duration = 5000,
}: TripReadyCelebrationProps) {
  const { width, height } = useWindowSize();
  const [showConfetti, setShowConfetti] = useState(false);
  const [showMessage, setShowMessage] = useState(false);

  useEffect(() => {
    if (isActive) {
      setShowConfetti(true);
      setShowMessage(true);

      const confettiTimer = setTimeout(() => {
        setShowConfetti(false);
      }, duration);

      const messageTimer = setTimeout(() => {
        setShowMessage(false);
        onComplete?.();
      }, duration + 500);

      return () => {
        clearTimeout(confettiTimer);
        clearTimeout(messageTimer);
      };
    }
  }, [isActive, duration, onComplete]);

  if (!isActive && !showConfetti && !showMessage) {
    return null;
  }

  return (
    <>
      {showConfetti && (
        <Confetti
          width={width}
          height={height}
          recycle={false}
          numberOfPieces={300}
          gravity={0.3}
          colors={["#8B5CF6", "#A78BFA", "#C4B5FD", "#DDD6FE", "#F5D0FE", "#FBBF24"]}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 9999,
            pointerEvents: "none",
          }}
        />
      )}

      <AnimatePresence>
        {showMessage && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="fixed inset-0 flex items-center justify-center z-[9998] pointer-events-none"
          >
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl shadow-2xl p-8 text-center max-w-sm mx-4">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring", stiffness: 400 }}
                className="text-6xl mb-4"
              >
                <img
                  src="/icons/party.popper.fill.svg"
                  alt="Celebration"
                  className="w-16 h-16 mx-auto"
                />
              </motion.div>
              <motion.h2
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className="text-2xl font-bold text-gray-900 mb-2"
              >
                Trip is Ready!
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4 }}
                className="text-gray-600"
              >
                Everyone has marked themselves ready. Time to pack your bags!
              </motion.p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

// Hook to trigger celebration
export function useTripCelebration() {
  const [isCelebrating, setIsCelebrating] = useState(false);

  const celebrate = () => {
    setIsCelebrating(true);
  };

  const stopCelebration = () => {
    setIsCelebrating(false);
  };

  return {
    isCelebrating,
    celebrate,
    stopCelebration,
    CelebrationComponent: (
      <TripReadyCelebration
        isActive={isCelebrating}
        onComplete={stopCelebration}
      />
    ),
  };
}
