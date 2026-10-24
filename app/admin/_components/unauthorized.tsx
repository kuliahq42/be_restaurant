import Link from "next/link";

/** Shared "you may not open this" panel for role-restricted admin screens. */
export default function Unauthorized({
  title = "Unauthorized",
  description = "Your role does not have permission to open this page.",
  allowedRoles,
}: {
  title?: string;
  description?: string;
  allowedRoles?: string[];
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-8 py-16 text-center shadow-sm">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-lg font-semibold text-red-600">
        !
      </div>
      <h1 className="mt-5 text-xl font-semibold tracking-tight text-slate-900">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-500">{description}</p>

      {allowedRoles && allowedRoles.length > 0 ? (
        <p className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
          Allowed roles:{" "}
          <span className="font-medium text-slate-700">
            {allowedRoles.join(", ")}
          </span>
        </p>
      ) : null}

      <Link
        href="/admin/pos"
        className="mt-8 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
      >
        Back to Point of Sale
      </Link>
    </div>
  );
}
