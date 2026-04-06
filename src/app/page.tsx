import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Nav } from "@/components/layout/nav";
import { Footer } from "@/components/layout/footer";

export default function LandingPage() {
  return (
    <div className="flex min-h-full flex-col">
      <Nav />
      <main className="flex flex-1 flex-col items-center justify-center px-4 pt-16 pb-8">
        <div className="max-w-lg text-center">
          <h1 className="font-serif text-3xl font-semibold tracking-tight text-ink">
            Open Voice Project
          </h1>
          <p className="mt-3 font-serif text-base text-ink-light leading-relaxed">
            Review your recorded TTRPG sessions, manage consent, correct
            transcripts, and control how your voice data is used.
          </p>
          <div className="mt-6">
            <Link href="/auth/discord">
              <Button
                variant="default"
                size="lg"
                className="font-sans"
              >
                Sign in with Discord
              </Button>
            </Link>
          </div>
          <p className="mt-4 font-sans text-xs text-ink-faint">
            You need a Discord account and at least one recorded session to use
            this portal.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
