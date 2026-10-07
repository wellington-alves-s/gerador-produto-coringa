import { useId } from "react";

/** Símbolo do Gemini (estrela de quatro pontas em degradê). Decorativo: o botão já tem nome acessível. */
export function LogoGemini({ tamanho = 24 }: { tamanho?: number }) {
  const id = useId();
  const degrade = `gemini-degrade-${id}`;
  return (
    <svg viewBox="0 0 24 24" width={tamanho} height={tamanho} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id={degrade} x1="3" y1="21" x2="21" y2="3" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#34a853" />
          <stop offset="0.28" stopColor="#fbbc04" />
          <stop offset="0.52" stopColor="#ea4335" />
          <stop offset="0.72" stopColor="#4285f4" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${degrade})`}
        d="M12 0C12.9 6.9 17.1 11.1 24 12C17.1 12.9 12.9 17.1 12 24C11.1 17.1 6.9 12.9 0 12C6.9 11.1 11.1 6.9 12 0Z"
      />
    </svg>
  );
}
