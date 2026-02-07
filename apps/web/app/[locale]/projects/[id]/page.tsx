import { redirect } from 'next/navigation';

export default async function ProjectIndexPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  redirect(`/${locale}/projects/${id}/overview`);
}
