"use client"

import { motion, AnimatePresence } from "framer-motion"
import { Layout, Sparkles, Layers } from "lucide-react"
import { cn } from "@/lib/utils"

export const slideContent = [
  {
    icon: <Layout className="h-10 w-10 text-primary" />,
    title: "Structure Your Vision",
    description:
      "Organize interior ideas, localize options by your region, and build cohesive design baselines effortlessly.",
  },
  {
    icon: <Sparkles className="h-10 w-10 text-primary" />,
    title: "Define Your Vibe",
    description:
      "Select unique upholstery textures, depth configurations, and accents tailored exactly to your comfort palette.",
  },
  {
    icon: <Layers className="h-10 w-10 text-primary" />,
    title: "Context-Aware Adaptation",
    description:
      "Upload real-world space imagery. Our system dynamically analyzes environmental lighting and architectural context.",
  },
]

import { OnboardingSlideshowProps } from "@/lib/types"

export function OnboardingSlideshow({ activeSlide }: OnboardingSlideshowProps) {
  return (
    <div className="flex flex-col justify-center px-4">
      <AnimatePresence mode="wait">
        <motion.div
          key={activeSlide}
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          transition={{ duration: 0.4 }}
          className="space-y-4"
        >
          <div className="inline-block rounded-2xl bg-primary/10 p-3">
            {slideContent[activeSlide].icon}
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            {slideContent[activeSlide].title}
          </h1>
          <p className="max-w-md text-base leading-relaxed text-muted-foreground">
            {slideContent[activeSlide].description}
          </p>
        </motion.div>
      </AnimatePresence>
      <div className="mt-8 flex gap-2">
        {slideContent.map((_, index) => (
          <button
            key={index}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              index === activeSlide
                ? "w-8 bg-primary"
                : "w-2 bg-muted hover:bg-muted-foreground/40"
            )}
            aria-label={`Go to slide ${index + 1}`}
          />
        ))}
      </div>
    </div>
  )
}
