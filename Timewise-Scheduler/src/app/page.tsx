import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { CalendarDays, Wrench } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <header className="px-4 lg:px-6 h-16 flex items-center border-b sticky top-0 bg-background/95 backdrop-blur-sm z-10">
        <Link href="/" className="flex items-center justify-center" prefetch={false}>
          <CalendarDays className="h-6 w-6 text-primary" />
          <span className="ml-3 font-semibold text-xl tracking-tight">Drive by Talrop</span>
        </Link>
        <nav className="ml-auto">
          <Button asChild variant="outline">
            <Link href="/settings">
              <Wrench className="w-4 h-4 mr-2" />
              Admin
            </Link>
          </Button>
        </nav>
      </header>
      <main className="flex-1 flex flex-col justify-center items-center">
        <section className="w-full">
          <div className="container px-4 md:px-6 text-center">
            <div className="max-w-3xl mx-auto space-y-4">
              <h1 className="text-6xl font-bold tracking-tight text-primary">
                Drive
              </h1>
              <p className="text-lg text-muted-foreground md:text-xl">
                Book your consultation instantly. Choose your perfect time slot and get automatic confirmations.
              </p>
              <div>
                <Button asChild size="lg">
                  <Link href="/booking">Book Your Slot Now</Link>
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>
      <footer className="py-6 border-t">
        <div className="container px-4 md:px-6 flex justify-center items-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Drive by Talrop. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
