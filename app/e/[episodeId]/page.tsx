// S9: 감상(뷰어) 페이지
interface ViewerPageProps {
  params: Promise<{ episodeId: string }>;
}

export default async function ViewerPage({ params }: ViewerPageProps) {
  const { episodeId } = await params;

  return (
    <main className='flex min-h-screen flex-col items-center'>
      <h1 className='text-2xl font-bold'>에피소드 감상</h1>
      <p className='mt-2 text-gray-500'>episodeId: {episodeId}</p>
    </main>
  );
}
