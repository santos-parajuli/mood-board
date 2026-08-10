import Link from "next/link"
import Image from "next/image"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-stone-50 font-sans text-stone-800 antialiased">
      {/* Navigation */}
      <header className="sticky top-0 z-50 border-b border-stone-200 bg-white/80 px-6 py-4 backdrop-blur-md">
        <div className="mx-auto flex max-w-[80%] items-center justify-between">
          <div className="flex items-center space-x-2">
            <Image
              src="/toniclogo.png"
              alt="Tonic Living"
              width={150}
              height={50}
              className="h-auto w-auto"
            />
            <span className="font-sans text-lg font-light text-primary">
              Moodboard
            </span>
          </div>
          <nav className="hidden space-x-8 text-sm font-medium text-stone-600 md:flex">
            <a href="#about" className="transition hover:text-amber-700">
              About Tonic Living
            </a>
            <a href="#features" className="transition hover:text-amber-700">
              Features
            </a>
          </nav>
          <Link
            href="/onboarding"
            className="rounded-full bg-primary/90 px-5 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-primary"
          >
            Launch Creator
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 md:py-32">
        <div className="relative z-10 mx-auto max-w-5xl text-center">
          <span className="mb-6 inline-block rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold tracking-widest text-amber-800 uppercase">
            For Interior Designers & Decor Enthusiasts
          </span>
          <h1 className="mb-6 font-serif text-4xl leading-tight tracking-tight text-stone-900 md:text-6xl">
            Visualize Your Space with <br />
            <span className="text-primary italic">Tonic Living</span> Pillows
          </h1>
          <p className="mx-auto mb-10 max-w-2xl text-lg leading-relaxed text-stone-600 md:text-xl">
            Bring your design visions to life. Mix, match, and arrange
            high-quality Tonic Living fabrics and pillows on a seamless, digital
            interactive canvas.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Link
              href="/onboarding"
              className="w-full transform rounded-xl bg-primary/90 px-8 py-4 text-center text-lg font-medium text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-primary sm:w-auto"
            >
              Start Your Moodboard
            </Link>
            <a
              href="#features"
              className="w-full rounded-xl border border-stone-300 bg-white px-8 py-4 text-center text-lg font-medium text-stone-800 transition hover:bg-stone-100 sm:w-auto"
            >
              See How It Works
            </a>
          </div>
        </div>

        {/* Decorative Background Accents */}
        <div className="absolute top-1/2 left-1/4 -z-10 h-72 w-72 -translate-x-1/2 -translate-y-1/2 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="absolute top-1/3 right-1/4 -z-10 h-96 w-96 translate-x-1/2 -translate-y-1/2 rounded-full bg-stone-200/50 blur-3xl" />
      </section>

      {/* About Tonic Living Section */}
      <section
        id="about"
        className="border-y border-stone-200 bg-white px-6 py-20"
      >
        <div className="mx-auto grid max-w-7xl grid-cols-1 items-center gap-12 md:grid-cols-2">
          <div className="space-y-6">
            <h2 className="font-serif text-3xl tracking-tight text-stone-900">
              About Tonic Living
            </h2>
            <p className="leading-relaxed text-stone-600">
              Known for curated, high-quality pillows, fabrics, and home decor
              items, <strong>Tonic Living</strong> provides interior designers
              and homeowners with the perfect textiles to elevate any space.
              From modern minimalist aesthetics to cozy traditional patterns,
              their collection is beautifully distinct.
            </p>
            <p className="leading-relaxed text-stone-600">
              The <strong>Tonic Moodboard Studio</strong> bridges the gap
              between tactile fabric samples and digital room layouts. Instead
              of guessing how patterns clash or complement, you can curate your
              favorite collections digitally before buying.
            </p>
            <div className="pt-4">
              <blockquote className="border-l-4 border-amber-700 pl-4 text-stone-700 italic">
                "Pillows are the jewelry of a room. This tool lets you find the
                perfect stack hassle-free."
              </blockquote>
            </div>
          </div>

          {/* Aesthetic Mockup Grid */}
          <div className="grid grid-cols-2 gap-8 rounded-2xl border border-stone-200 bg-stone-50 p-6">
            {/* Image 1 Container */}
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-stone-200">
              <Image
                src="/image1.png"
                alt="Tonic Living Pillow Design 1"
                fill
                className="h-auto w-auto object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>

            {/* Image 2 Container (With dynamic Y translation offset matching layout) */}
            <div className="relative flex aspect-square translate-y-4 items-center justify-center overflow-hidden rounded-xl bg-stone-300">
              <Image
                src="/image2.png"
                alt="Tonic Living Pillow Design 2"
                fill
                className="h-auto w-auto object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>

            {/* Image 3 Container (With dynamic Y translation offset matching layout) */}
            <div className="relative flex aspect-square -translate-y-4 items-center justify-center overflow-hidden rounded-xl bg-stone-300">
              <Image
                src="/image3.png"
                alt="Tonic Living Pillow Design 3"
                fill
                className="h-auto w-auto object-cover"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>

            {/* Image 4 Container */}
            <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-xl bg-stone-200">
              <Image
                src="/image4.png"
                alt="Tonic Living Pillow Design 4"
                fill
                className="object-cove h-auto w-auto"
                sizes="(max-width: 768px) 50vw, 33vw"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="features" className="mx-auto max-w-7xl px-6 py-20">
        <div className="mx-auto mb-16 max-w-3xl text-center">
          <h2 className="mb-4 font-serif text-3xl text-stone-900">
            Designed for Smooth Creative Flow
          </h2>
          <p className="text-stone-600">
            Everything you need to craft high-fidelity presentation decks for
            clients or personal home refreshes.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8">
          {/* Feature 1 */}
          <div className="rounded-2xl border border-stone-200 bg-white p-8 shadow-sm transition hover:shadow-md">
            <h3 className="mb-2 text-xl font-medium text-stone-900">
              Put Some GIFs to show how to use app.
            </h3>
          </div>
        </div>
      </section>

      {/* CTA Bottom Banner */}
      <section className="relative overflow-hidden bg-stone-900 px-6 py-16 text-center text-stone-100">
        <div className="relative z-10 mx-auto max-w-4xl">
          <h2 className="mb-4 font-serif text-3xl text-white md:text-4xl">
            Ready to transform your spaces?
          </h2>
          <p className="mx-auto mb-8 max-w-xl text-sm text-stone-400 md:text-base">
            No signup required. Dive straight into the studio workspace and
            start layering patterns right away.
          </p>
          <Link
            href="/onboarding"
            className="inline-block rounded-xl bg-amber-700 px-8 py-3.5 font-medium text-white shadow-lg transition hover:bg-amber-600"
          >
            Open Moodboard Studio
          </Link>
        </div>
        <div className="absolute inset-0 bg-[radial-gradient(#2c2520_1px,transparent_1px)] bg-size-[16px_16px] opacity-30" />
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-800 bg-stone-900 px-6 py-8 text-xs text-stone-500">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 md:flex-row">
          <p>
            &copy; {new Date().getFullYear()} Tonic Moodboard Companion. For
            evaluation with{" "}
            <a
              href="https://www.tonicliving.com"
              className="text-primary hover:underline"
            >
              Tonic Living
            </a>{" "}
            products.
          </p>
          <div className="flex space-x-6">
            <span className="text-stone-600">Proprietary Software</span>
          </div>
        </div>
      </footer>
    </div>
  )
}
