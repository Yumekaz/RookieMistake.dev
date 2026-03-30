import ResourceShell from '@/components/ResourceShell';
import { DETECTOR_CATALOG } from '@/lib/catalog';

export default function DetectorsPage() {
  return (
    <ResourceShell
      eyebrow="Detector catalog"
      title="What the engine actually flags"
      description="A mature analysis product should make its rules visible. This catalog lists every detector, its target languages, and the false-positive guardrails behind it."
    >
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {DETECTOR_CATALOG.map((detector) => (
          <article key={detector.name} className="card p-5 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-gh-text-muted">{detector.category}</p>
                <h2 className="text-xl font-semibold text-gh-text mt-2">{detector.label}</h2>
                <p className="text-sm text-gh-text-muted mt-2 font-mono">{detector.name}</p>
              </div>
              <span className="px-3 py-1.5 rounded-lg border border-gh-border bg-gh-bg-secondary text-sm text-gh-text capitalize">
                {detector.severity}
              </span>
            </div>

            <div className="flex flex-wrap gap-2">
              {detector.languages.map((language) => (
                <span key={language} className="px-2.5 py-1 rounded-md border border-gh-border bg-gh-bg-secondary text-xs text-gh-text-muted">
                  {language}
                </span>
              ))}
            </div>

            <div className="space-y-3 text-sm text-gh-text-muted">
              <p>
                <span className="text-gh-text font-medium">Catches:</span> {detector.catches}
              </p>
              <p>
                <span className="text-gh-text font-medium">False-positive guard:</span> {detector.falsePositiveGuard}
              </p>
            </div>
          </article>
        ))}
      </div>
    </ResourceShell>
  );
}
