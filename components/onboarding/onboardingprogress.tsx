"use client"

import { motion } from "framer-motion"
import { cn } from "@/lib/utils"

import { Step, OnboardingProgressProps } from "@/lib/types"

export function OnboardingProgress({
  steps,
  currentStep,
  setCurrentStep,
}: OnboardingProgressProps) {
  return (
    <div className="mb-6">
      <div className="mb-2 flex justify-between">
        {steps.map((step, index) => (
          <div key={step.id} className="flex flex-1 flex-col items-center">
            <motion.div
              className={cn(
                "h-3 w-3 cursor-pointer rounded-full transition-colors duration-300",
                index < currentStep
                  ? "bg-primary"
                  : index === currentStep
                    ? "bg-primary ring-4 ring-primary/20"
                    : "bg-muted"
              )}
              onClick={() => {
                if (index <= currentStep) setCurrentStep(index)
              }}
              whileTap={{ scale: 0.95 }}
            />
            <span
              className={cn(
                "mt-1.5 hidden text-center text-[11px] font-medium sm:block",
                index === currentStep ? "text-primary" : "text-muted-foreground"
              )}
            >
              {step.title}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
        <motion.div
          className="h-full bg-primary"
          initial={{ width: 0 }}
          animate={{
            width: `${(currentStep / (steps.length - 1)) * 100}%`,
          }}
          transition={{ duration: 0.3 }}
        />
      </div>
    </div>
  )
}
