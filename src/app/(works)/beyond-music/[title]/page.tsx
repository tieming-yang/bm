import ClientPlayerPage from "./client-page";

export default async function PlayerPage({ params }: { params: Promise<{ title: string }> }) {
  const { title } = await params;

  return <ClientPlayerPage title={title} />;
}
