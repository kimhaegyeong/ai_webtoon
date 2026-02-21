import CollabRoom from '@/components/features/CollabRoom';

interface CollabPageProps {
  params: Promise<{ episodeId: string }>;
}

export default async function CollabPage({ params }: CollabPageProps) {
  const { episodeId } = await params;
  return <CollabRoom episodeId={episodeId} />;
}
