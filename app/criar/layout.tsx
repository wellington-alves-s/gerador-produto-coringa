import type { ReactNode } from "react";
import { WizardProvider } from "@/lib/wizard-context";
import { DraftRecoveryPrompt } from "@/components/wizard/DraftRecoveryPrompt";

export default function CriarLayout({ children }: { children: ReactNode }) {
  return (
    <WizardProvider>
      <DraftRecoveryPrompt />
      <div className="mx-auto max-w-2xl px-4 py-8">{children}</div>
    </WizardProvider>
  );
}
