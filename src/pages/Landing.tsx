import { useNavigate } from 'react-router-dom';
import { motion, useInView } from 'framer-motion';
import { ArrowRight, Users, Vote, CheckCircle, MessageCircle, Calendar, DollarSign, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VibeTag } from '@/components/ui/VibeTag';
import { VotePill } from '@/components/ui/VotePill';
import { useAuth } from '@/contexts/AuthContext';
import { useRef } from 'react';

const fadeIn = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.5 }
};

const staggerContainer = {
  animate: {
    transition: {
      staggerChildren: 0.1
    }
  }
};

// How It Works animations
const howItWorksContainer = {
  initial: {},
  animate: {
    transition: {
      staggerChildren: 0.2,
      delayChildren: 0.1
    }
  }
};

const cardVariants = {
  initial: (i: number) => ({
    opacity: 0,
    y: 40,
    x: i === 0 ? -30 : i === 2 ? 30 : 0,
    scale: 0.95,
    rotate: i === 0 ? -2 : i === 2 ? 2 : 0
  }),
  animate: {
    opacity: 1,
    y: 0,
    x: 0,
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 25
    }
  }
};

const iconVariants = {
  initial: { scale: 0, rotate: -180 },
  animate: {
    scale: 1,
    rotate: 0,
    transition: {
      type: "spring",
      stiffness: 260,
      damping: 20,
      delay: 0.2
    }
  }
};

const stepNumberVariants = {
  initial: { scale: 0, opacity: 0 },
  animate: {
    scale: 1,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 15,
      delay: 0.3
    }
  }
};

// Animated background component
function HowItWorksBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {/* Animated gradient blobs */}
      <motion.div
        className="absolute -top-20 -left-20 w-72 h-72 rounded-full bg-primary/10 blur-3xl"
        animate={{
          x: [0, 30, 0],
          y: [0, -20, 0],
          scale: [1, 1.1, 1],
        }}
        transition={{
          duration: 8,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />
      <motion.div
        className="absolute -bottom-20 -right-20 w-80 h-80 rounded-full bg-accent/10 blur-3xl"
        animate={{
          x: [0, -25, 0],
          y: [0, 25, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 10,
          repeat: Infinity,
          ease: "easeInOut"
        }}
      />

      {/* Floating sparkles */}
      {[
        { top: '15%', left: '10%', delay: 0 },
        { top: '70%', left: '85%', delay: 1 },
        { top: '40%', left: '90%', delay: 2 },
      ].map((pos, i) => (
        <motion.img
          key={i}
          src="/icons/sparkle.svg"
          alt=""
          className="absolute w-6 h-6 opacity-40"
          style={{ top: pos.top, left: pos.left }}
          animate={{
            rotate: [0, 180, 360],
            opacity: [0.3, 0.6, 0.3],
            scale: [1, 1.2, 1],
          }}
          transition={{
            duration: 4,
            repeat: Infinity,
            delay: pos.delay,
            ease: "easeInOut"
          }}
        />
      ))}
    </div>
  );
}

// Animated icon container with shimmer
function AnimatedIconContainer({
  icon: Icon,
  color
}: {
  icon: React.ElementType;
  color: string;
}) {
  return (
    <motion.div
      className={`relative inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${color} text-white mb-6 overflow-hidden`}
      variants={iconVariants}
      whileHover={{
        scale: 1.1,
        transition: { type: "spring", stiffness: 400, damping: 10 }
      }}
    >
      <Icon className="h-7 w-7 relative z-10" />
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -skew-x-12"
        animate={{
          x: ['-100%', '200%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          repeatDelay: 3,
          ease: "easeInOut"
        }}
      />
    </motion.div>
  );
}

// Flowing connector line between all steps (desktop only)
function StepFlowConnector() {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <div ref={ref} className="hidden md:block absolute inset-0 pointer-events-none">
      <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Curved path from card 1 to card 2 */}
        <motion.path
          d="M 22 50 C 28 25, 38 25, 50 50"
          fill="none"
          stroke="hsl(var(--primary) / 0.3)"
          strokeWidth="0.4"
          strokeDasharray="1.5 0.8"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 1, delay: 0.5 }}
        />
        {/* Curved path from card 2 to card 3 */}
        <motion.path
          d="M 50 50 C 62 75, 72 75, 78 50"
          fill="none"
          stroke="hsl(var(--primary) / 0.3)"
          strokeWidth="0.4"
          strokeDasharray="1.5 0.8"
          initial={{ pathLength: 0, opacity: 0 }}
          animate={isInView ? { pathLength: 1, opacity: 1 } : {}}
          transition={{ duration: 1, delay: 1 }}
        />
        {/* Dots at connection points */}
        <motion.circle
          cx="22"
          cy="50"
          r="1"
          fill="hsl(var(--primary))"
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 0.6 } : {}}
          transition={{ duration: 0.3, delay: 0.4 }}
        />
        <motion.circle
          cx="50"
          cy="50"
          r="1.2"
          fill="hsl(var(--primary))"
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 0.7 } : {}}
          transition={{ duration: 0.3, delay: 1.2 }}
        />
        <motion.circle
          cx="78"
          cy="50"
          r="1"
          fill="hsl(var(--primary))"
          initial={{ scale: 0, opacity: 0 }}
          animate={isInView ? { scale: 1, opacity: 0.6 } : {}}
          transition={{ duration: 0.3, delay: 1.8 }}
        />
      </svg>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const handleGetStarted = () => {
    navigate(user ? '/app' : '/onboarding');
  };

  const handleCreateTrip = () => {
    navigate(user ? '/app/create' : '/onboarding?next=/app/create');
  };

  const handleSignIn = () => {
    navigate(user ? '/app' : '/auth');
  };
  return (
    <div className="min-h-screen flex flex-col gradient-hero">
      <Header />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-primary/5 blur-3xl" />
          <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-accent/5 blur-3xl" />
        </div>

        <div className="container relative py-24 md:py-32 lg:py-40">
          <motion.div 
            className="max-w-3xl mx-auto text-center"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
              Plan Trips Like{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                You're Texting
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              roamiii is where friends chat, propose destinations, vote on ideas, 
              and lock in the perfect trip. No more endless group texts.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button 
                size="lg" 
                className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all text-base px-8"
                onClick={handleCreateTrip}
              >
                Create a Trip
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
              <Button 
                size="lg" 
                variant="outline" 
                className="text-base px-8"
                onClick={handleSignIn}
              >
                Sign In
              </Button>
            </div>
          </motion.div>

          {/* Mock Chat Preview */}
          <motion.div 
            className="mt-16 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
              {/* Chat Header */}
              <div className="px-4 py-3 border-b border-border flex items-center gap-3">
                <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src="/trip-group.png"
                    alt="Trip chat"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">Senior Spring Break</h3>
                  <p className="text-sm text-muted-foreground">8 friends · Planning</p>
                </div>
              </div>

              {/* Chat Messages */}
              <div className="p-4 space-y-4">
                {/* Text message */}
                <div className="flex items-start gap-2">
                  <img
                    src="/avatars/avatar-1.png"
                    alt="User avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="bg-muted px-4 py-2 rounded-2xl rounded-tl-sm max-w-xs">
                    <p className="text-sm">We need to decide soon! Who's looking into options?</p>
                  </div>
                </div>

                {/* Proposal Card in Chat */}
                <div className="flex items-start gap-2">
                  <img
                    src="/avatars/avatar-2.png"
                    alt="User avatar"
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div className="max-w-sm">
                    <p className="text-xs text-muted-foreground mb-1">proposed a trip</p>
                    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                      <div className="aspect-[2/1] relative overflow-hidden">
                        <img
                          src="/cancun.jpg"
                          alt="Cancun beach"
                          className="w-full h-full object-cover"
                        />
                        <div className="absolute bottom-2 left-2 flex gap-1">
                          <VibeTag vibe="beach" size="sm" />
                          <VibeTag vibe="party" size="sm" />
                        </div>
                      </div>
                      <div className="p-3">
                        <p className="font-semibold text-foreground">Cancún, Mexico</p>
                        <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" /> Mar 15-22
                          </span>
                          <span className="flex items-center gap-1 text-primary font-medium">
                            <DollarSign className="h-3 w-3" /> $850/person
                          </span>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <VotePill vote="in" count={5} />
                          <VotePill vote="maybe" count={2} />
                          <VotePill vote="out" count={1} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Reaction text */}
                <div className="flex justify-end items-start gap-2">
                  <div className="bg-primary text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-xs">
                    <p className="text-sm">This looks amazing! I'm in</p>
                  </div>
                  <div className="w-8 h-8 min-w-[32px] min-h-[32px] rounded-full overflow-hidden flex-shrink-0">
                    <img
                      src="/avatars/avatar-3.png"
                      alt="User avatar"
                      className="w-full h-full object-cover scale-[2] translate-y-[15%]"
                    />
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Gradient fade to How It Works section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-background pointer-events-none" />
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-background relative overflow-hidden">
        <HowItWorksBackground />

        <div className="container relative z-10">
          {/* Enhanced Section Header */}
          <motion.div
            className="text-center mb-16"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4 relative inline-block">
              How{' '}
              <span className="relative">
                <span className="text-primary">roamiii</span>
                {/* Squiggly animated underline */}
                <motion.svg
                  className="absolute -bottom-2 left-0 w-full h-3"
                  viewBox="0 0 100 12"
                  preserveAspectRatio="none"
                >
                  <motion.path
                    d="M0 6 Q 12.5 0, 25 6 T 50 6 T 75 6 T 100 6"
                    fill="none"
                    stroke="url(#underlineGradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    initial={{ pathLength: 0 }}
                    whileInView={{ pathLength: 1 }}
                    viewport={{ once: true }}
                    transition={{ duration: 0.8, delay: 0.3 }}
                  />
                  <defs>
                    <linearGradient id="underlineGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="hsl(var(--primary))" />
                      <stop offset="100%" stopColor="#f97316" />
                    </linearGradient>
                  </defs>
                </motion.svg>
              </span>
              {' '}Works
              {/* Decorative sparkle */}
              <motion.span
                className="absolute -top-2 -right-6"
                initial={{ scale: 0, rotate: -30 }}
                whileInView={{ scale: 1, rotate: 0 }}
                viewport={{ once: true }}
                transition={{ type: "spring", stiffness: 400, delay: 0.5 }}
              >
                <Sparkles className="w-5 h-5 text-primary" />
              </motion.span>
            </h2>
            <motion.p
              className="text-lg text-muted-foreground max-w-2xl mx-auto"
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              From group chat chaos to booked and ready in three steps
            </motion.p>
          </motion.div>

          {/* Enhanced Cards Grid */}
          <div className="relative">
            {/* Flowing connector line between steps (desktop only) */}
            <StepFlowConnector />

            <motion.div
              className="grid md:grid-cols-3 gap-8"
              variants={howItWorksContainer}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, margin: "-50px" }}
            >
              {[
                {
                  step: '01',
                  icon: MessageCircle,
                  title: 'Chat & Propose',
                  description: 'Create a trip chat and invite your crew. Anyone can propose destinations as visual cards right in the conversation.',
                  color: 'from-primary to-orange-500'
                },
                {
                  step: '02',
                  icon: Vote,
                  title: 'Vote Together',
                  description: 'Everyone votes In, Maybe, or Out on each proposal. See what works for the whole group in real-time.',
                  color: 'from-blue-500 to-cyan-500'
                },
                {
                  step: '03',
                  icon: CheckCircle,
                  title: 'Pin & Go',
                  description: "Once the group converges, pin the final pick. You're ready to book and start packing!",
                  color: 'from-emerald-500 to-green-500'
                }
              ].map((item, i) => (
                <motion.div
                  key={item.step}
                  className="relative group h-full"
                  custom={i}
                  variants={cardVariants}
                >
                  {/* Gradient glow border on hover */}
                  <motion.div
                    className="absolute -inset-0.5 bg-gradient-to-r from-primary via-orange-500 to-accent rounded-2xl opacity-0 group-hover:opacity-100 blur-sm transition-opacity duration-500"
                    initial={{ opacity: 0 }}
                  />

                  <motion.div
                    className="relative bg-card rounded-2xl p-8 border border-border shadow-card transition-shadow duration-300 group-hover:shadow-glow h-full flex flex-col"
                    whileHover={{
                      y: -8,
                      transition: { type: "spring", stiffness: 400, damping: 15 }
                    }}
                  >
                    {/* Animated Icon */}
                    <AnimatedIconContainer icon={item.icon} color={item.color} />

                    {/* Animated Step Number */}
                    <motion.div
                      className="flex items-center gap-1.5 text-sm font-semibold text-primary mb-2"
                      variants={stepNumberVariants}
                    >
                      <span>Step {item.step}</span>
                      <motion.span
                        className="w-1.5 h-1.5 rounded-full bg-primary"
                        initial={{ scale: 0 }}
                        whileInView={{ scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: 0.5 + i * 0.1, type: "spring" }}
                      />
                    </motion.div>

                    <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                    <p className="text-muted-foreground flex-1">{item.description}</p>
                  </motion.div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>

        {/* Gradient fade to Features section */}
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-b from-transparent to-secondary/30 pointer-events-none" />
      </section>

      {/* Features */}
      <section className="py-20 md:py-28 bg-secondary/30">
        <div className="container">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm font-medium mb-4">
              <Sparkles className="h-4 w-4" />
              No more group chat chaos
            </div>
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
              Finally, A Trip Gets Planned
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              roamiii combines the ease of group messaging with structured proposals, 
              cost breakdowns, and voting. Everyone's on the same page, and decisions actually happen.
            </p>
            <Button 
              size="lg" 
              className="gradient-primary text-white shadow-lg"
              onClick={handleGetStarted}
            >
              Start Planning Free
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
