import type { Metadata } from "next";
import { InterviewSetup } from "@/features/interview/InterviewSetup";

export const metadata: Metadata = { title: "Start Your Interview" };

export default function InterviewPage() {
  return <InterviewSetup />;
}
