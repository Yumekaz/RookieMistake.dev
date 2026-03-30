import ProjectComparePageClient from '@/components/ProjectComparePageClient';

export const dynamic = 'force-dynamic';

interface ProjectComparePageProps {
  searchParams?: {
    baseId?: string;
    targetId?: string;
  };
}

export default function ProjectComparePage({ searchParams }: ProjectComparePageProps) {
  return (
    <ProjectComparePageClient
      initialBaseId={searchParams?.baseId || ''}
      initialTargetId={searchParams?.targetId || ''}
    />
  );
}
