import Link from "next/link";

export default function AuthErrorPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-paper px-6 text-center">
      <h1 className="mb-2 font-mono text-2xl font-bold text-ink">
        Something went wrong
      </h1>
      <p className="mb-6 max-w-sm text-sm text-muted">
        That authentication link is invalid or has expired. Please try signing
        in again.
      </p>
      <Link
        href="/"
        className="rounded-lg bg-brand-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-brand-800"
      >
        Back to Daily
      </Link>
    </div>
  );
}
