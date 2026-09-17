import Link from "next/link";

export default function Home() {
  return (
    <div className="mx-auto max-w-2xl px-4 py-16 text-center">
      <h1 className="mb-4 text-3xl font-semibold">Produto Coringa</h1>
      <p className="mb-8 text-gray-600 dark:text-gray-300">
        Gere a encomenda especial de portas, esquadrias e outros produtos sob medida da Madel.
      </p>
      <Link href="/criar/tipo" className="rounded-md bg-red-700 px-6 py-3 text-white">
        Nova encomenda
      </Link>
    </div>
  );
}
