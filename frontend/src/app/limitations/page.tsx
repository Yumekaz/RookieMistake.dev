import Link from 'next/link';
import ResourceShell from '@/components/ResourceShell';
import { LIMITATIONS } from '@/lib/catalog';

export default function LimitationsPage() {
  return (
    <ResourceShell
      eyebrow="Boundaries"
      title="What this tool does poorly"
      description="Trust comes from saying where the engine stops. These limitations are not excuses; they are the current boundary conditions for interpreting results."
      actions={
        <Link href="/benchmark" className="btn-secondary inline-flex items-center gap-2">
          <span>Open benchmark</span>
        </Link>
      }
    >
      <section className="card p-6">
        <h2 className="text-xl font-semibold text-gh-text">Known limits</h2>
        <div className="mt-4 space-y-3">
          {LIMITATIONS.map((item) => (
            <div key={item} className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-4 text-sm text-gh-text-muted">
              {item}
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gh-text">Interpretation rule</h2>
          <p className="text-sm text-gh-text-muted mt-3">
            Treat a finding as a strong code-review prompt, not an unquestionable verdict. The product is tuned for high-signal mistakes, but it still lacks whole-program context.
          </p>
        </div>

        <div className="card p-6">
          <h2 className="text-xl font-semibold text-gh-text">Next hard problems</h2>
          <p className="text-sm text-gh-text-muted mt-3">
            Auth, user-scoped history, cross-file type awareness, and deeper framework semantics are the next material upgrades if you want this to move from strong project to durable product.
          </p>
        </div>
      </section>
    </ResourceShell>
  );
}
