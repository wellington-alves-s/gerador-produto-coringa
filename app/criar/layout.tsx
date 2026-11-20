import type { ReactNode } from "react";
import { WizardProvider } from "@/lib/wizard-context";
import { IndicadorSalvamento } from "@/components/wizard/IndicadorSalvamento";

export default function CriarLayout({ children }: { children: ReactNode }) {
  return (
    <WizardProvider>
      <IndicadorSalvamento />
      <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>
    </WizardProvider>
  );
}
