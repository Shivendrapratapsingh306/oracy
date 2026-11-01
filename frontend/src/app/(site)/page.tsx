import { Hero } from "@/features/landing/Hero";
import { Features } from "@/features/landing/Features";
import { InterviewPreview } from "@/features/landing/InterviewPreview";
import { Workflow } from "@/features/landing/Workflow";
import { ScoreShowcase } from "@/features/landing/ScoreShowcase";
import { CtaFaq } from "@/features/landing/CtaFaq";

export default function HomePage() {
  return (
    <>
      <Hero />
      <Features />
      <InterviewPreview />
      <Workflow />
      <ScoreShowcase />
      <CtaFaq />
    </>
  );
}
