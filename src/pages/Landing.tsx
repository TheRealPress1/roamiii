import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Users, Vote, CheckCircle, MapPin, Calendar, DollarSign } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { VibeTag } from '@/components/ui/VibeTag';
import { VotePill } from '@/components/ui/VotePill';

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
              <Users className="h-4 w-4" />
              Group Trip Planning Made Simple
            </motion.div>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-display font-bold text-foreground mb-6 leading-tight">
              Stop Arguing.{' '}
              <span className="bg-gradient-to-r from-primary via-orange-500 to-amber-500 bg-clip-text text-transparent">
                Pick the Trip.
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              The visual-first platform where friends propose trips, vote on destinations, 
              and converge on the perfect adventure. No more endless group chats.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/auth?mode=signup">
                <Button size="lg" className="gradient-primary text-white shadow-lg hover:shadow-xl transition-all text-base px-8">
                  Create a Trip Board
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link to="/auth">
                <Button size="lg" variant="outline" className="text-base px-8">
                  Sign In
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Mock Preview Card */}
          <motion.div 
            className="mt-16 max-w-4xl mx-auto"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.6 }}
          >
            <div className="bg-card rounded-2xl shadow-xl border border-border overflow-hidden">
              <div className="aspect-[16/9] relative bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600">
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center text-white">
                    <MapPin className="h-12 w-12 mx-auto mb-3 opacity-80" />
                    <p className="text-2xl font-display font-semibold">Cancún, Mexico</p>
                  </div>
                </div>
                {/* Overlay gradient */}
                <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black/50 to-transparent" />
                {/* Tags */}
                <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
                  <VibeTag vibe="beach" />
                  <VibeTag vibe="party" />
                  <VibeTag vibe="adventure" />
                </div>
              </div>
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h3 className="text-xl font-semibold text-foreground mb-2">Spring Break 2026</h3>
                    <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Mar 15 - 22
                      </span>
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-4 w-4" />
                        $850/person
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        8 friends
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <VotePill vote="in" count={5} />
                    <VotePill vote="maybe" count={2} />
                    <VotePill vote="out" count={1} />
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
              How It Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              From chaos to consensus in three simple steps
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
                icon: MapPin,
                title: 'Propose',
                description: 'Anyone can add trip ideas with images, dates, and cost estimates. Compare apples to apples.',
                color: 'from-primary to-orange-500'
              },
              {
                step: '02',
                icon: Vote,
                title: 'Vote',
                description: 'Cast your vote: In, Maybe, or Out. See what works for the group in real-time.',
                color: 'from-blue-500 to-cyan-500'
              },
              {
                step: '03',
                icon: CheckCircle,
                title: 'Commit',
                description: 'The group converges on a final pick. Lock it in and start packing.',
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
            <h2 className="text-3xl md:text-4xl font-display font-bold text-foreground mb-6">
              Built for Group Decisions
            </h2>
            <p className="text-lg text-muted-foreground mb-8">
              Stop scrolling through hundreds of messages. Trip Arena forces clarity with 
              comparable proposals, clear vote counts, budget fit indicators, and decision deadlines.
            </p>
            <Link to="/auth?mode=signup">
              <Button size="lg" className="gradient-primary text-white shadow-lg">
                Start Planning Free
                <ArrowRight className="ml-2 h-5 w-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
