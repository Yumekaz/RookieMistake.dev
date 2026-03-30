import ComparePageClient from '@/components/ComparePageClient';

interface ComparePageProps {
  searchParams?: {
    baseId?: string;
    targetId?: string;
  };
}

export default function ComparePage({ searchParams }: ComparePageProps) {
  return (
    <ComparePageClient
      initialBaseId={searchParams?.baseId || ''}
      initialTargetId={searchParams?.targetId || ''}
    />
  );
}
