import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Vote, CheckCircle, MessageCircle, Calendar, DollarSign, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VibeTag } from '@/components/ui/VibeTag';
import { VotePill } from '@/components/ui/VotePill';
import { useAuth } from '@/contexts/AuthContext';

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
    <div className="min-h-screen flex flex-col bg-background">
      <Header transparent />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden gradient-hero">
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
            <motion.div 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 text-primary text-sm font-medium mb-6"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <MessageCircle className="h-4 w-4" />
              Group Trip Planning Made Fun
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
              Plan Trips Like{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                You're Texting
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              TripChat is where friends chat, propose destinations, vote on ideas, 
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
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center">
                  <MessageCircle className="h-5 w-5 text-primary" />
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
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-bold">JM</div>
                  <div className="bg-muted px-4 py-2 rounded-2xl rounded-tl-sm max-w-xs">
                    <p className="text-sm">We need to decide soon! Who's looking into options?</p>
                  </div>
                </div>

                {/* Proposal Card in Chat */}
                <div className="flex items-start gap-2">
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center text-white text-xs font-bold">SK</div>
                  <div className="max-w-sm">
                    <p className="text-xs text-muted-foreground mb-1">proposed a trip</p>
                    <div className="bg-card rounded-xl border border-border overflow-hidden shadow-sm">
                      <div className="aspect-[2/1] bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 relative">
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
                <div className="flex justify-end">
                  <div className="bg-primary text-white px-4 py-2 rounded-2xl rounded-tr-sm max-w-xs">
                    <p className="text-sm">This looks amazing! I'm in 🙌</p>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 md:py-28 bg-background">
        <div className="container">
          <motion.div 
            className="text-center mb-16"
            {...fadeIn}
          >
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-4">
              How TripChat Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From group chat chaos to booked and ready in three steps
            </p>
          </motion.div>

          <motion.div 
            className="grid md:grid-cols-3 gap-8"
            variants={staggerContainer}
            initial="initial"
            whileInView="animate"
            viewport={{ once: true }}
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
                className="relative group"
                variants={fadeIn}
              >
                <div className="bg-card rounded-2xl p-8 border border-border shadow-card hover:shadow-card-hover transition-all duration-300">
                  <div className={`inline-flex items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br ${item.color} text-white mb-6`}>
                    <item.icon className="h-7 w-7" />
                  </div>
                  <div className="text-sm font-semibold text-primary mb-2">Step {item.step}</div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">{item.title}</h3>
                  <p className="text-muted-foreground">{item.description}</p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
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
              TripChat combines the ease of group messaging with structured proposals, 
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
