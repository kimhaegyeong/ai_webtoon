import EpisodeViewer from '@/components/features/EpisodeViewer';

interface EpisodePageProps {
  params: Promise<{ episodeId: string }>;
}

export default async function EpisodePage({ params }: EpisodePageProps) {
  const { episodeId } = await params;
  return <EpisodeViewer episodeId={episodeId} />;
}
