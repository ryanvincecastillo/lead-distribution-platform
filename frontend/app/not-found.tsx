import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="bg-canvas grid min-h-dvh place-items-center px-4 text-center">
      <div>
        <p className="text-ink-tertiary text-[13px] font-medium tracking-wide uppercase">404</p>
        <h1 className="text-display text-ink mt-2 text-[28px] font-semibold">Page not found</h1>
        <p className="text-ink-secondary mt-2 text-[14px]">
          The page you are looking for does not exist.
        </p>
        <Link href="/dashboard" className="text-accent mt-5 inline-block text-[14px] font-medium hover:underline">
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
