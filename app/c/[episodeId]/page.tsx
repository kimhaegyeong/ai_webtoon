// S6: 닉네임 입력 / S5: 콜라보 대기실
interface CollabPageProps {
  params: Promise<{ episodeId: string }>;
}

export default async function CollabPage({ params }: CollabPageProps) {
  const { episodeId } = await params;

  return (
    <main className='flex min-h-screen flex-col items-center justify-center'>
      <h1 className='text-2xl font-bold'>에피소드 참여</h1>
      <p className='mt-2 text-gray-500'>episodeId: {episodeId}</p>
    </main>
  );
}
