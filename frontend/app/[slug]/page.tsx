import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { BACKEND_INTERNAL_URL } from '@/lib/server-env';
import { PublicLeadForm } from '@/components/public/lead-form';

interface PublicForm {
  id: number;
  name: string;
  slug: string;
}

/** Server-side lookup: the private API is reachable from this process, never the browser. */
const loadForm = async (slug: string): Promise<PublicForm | null> => {
  try {
    const response = await fetch(
      `${BACKEND_INTERNAL_URL}/api/public/forms/${encodeURIComponent(slug)}`,
      { cache: 'no-store' },
    );
    if (!response.ok) return null;
    const payload = await response.json();
    return payload.data as PublicForm;
  } catch {
    return null;
  }
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const form = await loadForm(slug);
  return { title: form ? form.name : 'Form not found' };
}

export default async function PublicFormPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const form = await loadForm(slug);

  if (!form) notFound();

  return (
    <div className="bg-canvas grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="mb-7 text-center">
          <h1 className="text-display text-ink text-[28px] font-semibold">{form.name}</h1>
          <p className="text-ink-secondary mt-2 text-[14.5px] leading-relaxed">
            Share a few details and the right broker will reach out to you.
          </p>
        </div>

        <div className="bg-surface border-hairline shadow-card rounded-[22px] border p-6 sm:p-7">
          <PublicLeadForm slug={form.slug} />
        </div>
      </div>
    </div>
  );
}
