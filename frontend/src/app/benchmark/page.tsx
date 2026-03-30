import Link from 'next/link';
import ResourceShell from '@/components/ResourceShell';
import { BENCHMARK_SUMMARY, DETECTOR_CATALOG } from '@/lib/catalog';

const categoryCounts = DETECTOR_CATALOG.reduce<Record<string, number>>((acc, detector) => {
  acc[detector.category] = (acc[detector.category] || 0) + 1;
  return acc;
}, {});

export default function BenchmarkPage() {
  return (
    <ResourceShell
      eyebrow="Trust and signal"
      title="Benchmark and evaluation posture"
      description="This project is deterministic AST analysis, so credibility comes from coverage and false-positive control, not vague AI claims. The benchmark page makes that explicit."
      actions={
        <Link href="/detectors" className="btn-primary inline-flex items-center gap-2">
          <span>Open detector catalog</span>
        </Link>
      }
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">High-signal detectors</p>
          <p className="text-4xl font-semibold text-gh-text mt-3">{BENCHMARK_SUMMARY.detectorCount}</p>
          <p className="text-sm text-gh-text-muted mt-2">Focused on correctness, safety, and junior mistakes that still bite in production.</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Golden corpus samples</p>
          <p className="text-4xl font-semibold text-gh-text mt-3">{BENCHMARK_SUMMARY.goldenCorpusCases}</p>
          <p className="text-sm text-gh-text-muted mt-2">Paired should-flag and should-not-flag examples used to keep precision honest.</p>
        </div>
        <div className="card p-5">
          <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">Supported languages</p>
          <p className="text-4xl font-semibold text-gh-text mt-3">{BENCHMARK_SUMMARY.languages}</p>
          <p className="text-sm text-gh-text-muted mt-2">JavaScript, TypeScript, and Python on the same deterministic analysis path.</p>
        </div>
      </div>

      <section className="card p-6">
        <h2 className="text-xl font-semibold text-gh-text">What this benchmark means</h2>
        <div className="mt-4 space-y-3 text-sm text-gh-text-muted">
          <p>The benchmark is precision-oriented. The goal is not to surface every lint smell, it is to catch issues that feel obviously worth acting on.</p>
          <p>Each detector gets at least one positive corpus sample and one negative sample when there is a realistic false-positive edge. That keeps the engine from turning into noisy lint spam.</p>
          <p>The compare and history views make the benchmark practical: you can measure whether edits reduced the set of active detectors instead of just trusting a score.</p>
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold text-gh-text">Coverage by category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 mt-4">
          {Object.entries(categoryCounts)
            .sort((left, right) => right[1] - left[1])
            .map(([category, count]) => (
              <div key={category} className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-4">
                <p className="text-sm font-semibold text-gh-text">{category}</p>
                <p className="text-2xl font-semibold text-gh-accent mt-2">{count}</p>
                <p className="text-xs text-gh-text-muted mt-2">detector{count !== 1 ? 's' : ''}</p>
              </div>
            ))}
        </div>
      </section>

      <section className="card p-6">
        <h2 className="text-xl font-semibold text-gh-text">What the engine catches well</h2>
        <div className="mt-4 grid grid-cols-1 lg:grid-cols-2 gap-4 text-sm text-gh-text-muted">
          <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-4">
            <p className="font-semibold text-gh-text">Strong fit</p>
            <p className="mt-2">Concrete AST patterns with obvious actionability: async misuse, security footguns, mutation traps, and duplicated logic.</p>
          </div>
          <div className="rounded-xl border border-gh-border bg-gh-bg-secondary/60 p-4">
            <p className="font-semibold text-gh-text">Weak fit</p>
            <p className="mt-2">Cross-file typing, framework-specific intent, and issues that need deep dataflow or runtime context.</p>
          </div>
        </div>
      </section>
    </ResourceShell>
  );
}
