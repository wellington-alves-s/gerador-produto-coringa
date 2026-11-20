import type { ReactNode } from "react";

// Mesmo container das telas do assistente (app/criar/layout.tsx): centralizado e com respiro nas laterais.
export default function AdminLayout({ children }: { children: ReactNode }) {
  return <div className="mx-auto max-w-5xl px-4 py-8">{children}</div>;
}
