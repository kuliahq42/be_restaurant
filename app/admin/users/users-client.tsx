"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ROLES, ROLE_LABELS, type Role } from "@/lib/roles";
import { Modal, ModalActions } from "../_components/modal";
import {
  changeAdminPassword,
  createAdmin,
  deleteAdmin,
  updateAdminRole,
} from "./actions";

export type AdminRow = {
  id: string;
  username: string;
  role: Role;
  createdAt: string;
};

type Feedback = { type: "success" | "error"; message: string };

const inputClass =
  "mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30";

export default function UsersClient({
  admins,
  currentAdminId,
}: {
  admins: AdminRow[];
  currentAdminId: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [roleDraft, setRoleDraft] = useState<Record<string, Role>>({});

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("CASHIER");

  const [passwordTarget, setPasswordTarget] = useState<AdminRow | null>(null);
  const [replacementPassword, setReplacementPassword] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<AdminRow | null>(null);

  function run(
    action: () => Promise<{ ok: boolean; message?: string; error?: string }>,
    onSuccess?: () => void
  ) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        setFeedback({ type: "success", message: result.message ?? "Saved." });
        onSuccess?.();
        router.refresh();
      } else {
        setFeedback({
          type: "error",
          message: result.error ?? "Something went wrong.",
        });
        setRoleDraft({});
      }
    });
  }

  function closeAddModal() {
    setIsAddOpen(false);
    setNewUsername("");
    setNewPassword("");
    setNewRole("CASHIER");
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            User Management
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Admin accounts and their roles. Restricted to the Master role.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setIsAddOpen(true)}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500 focus-visible:ring-offset-2"
        >
          Add Admin
        </button>
      </header>

      {feedback ? (
        <p
          role="status"
          className={`rounded-lg border px-4 py-3 text-sm ${
            feedback.type === "success"
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          {feedback.message}
        </p>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-sm">
            <thead className="bg-slate-50">
              <tr className="text-[11px] uppercase tracking-wider text-slate-500">
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  No
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  Username
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  Role
                </th>
                <th scope="col" className="px-6 py-3 text-left font-semibold">
                  Created
                </th>
                <th scope="col" className="px-6 py-3 text-right font-semibold">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {admins.map((admin, index) => {
                const isSelf = admin.id === currentAdminId;

                return (
                  <tr key={admin.id} className="transition-colors hover:bg-slate-50">
                    <td className="whitespace-nowrap px-6 py-3 text-slate-500">
                      {index + 1}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <span className="font-medium text-slate-900">
                        {admin.username}
                      </span>
                      {isSelf ? (
                        <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                          You
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3">
                      <select
                        value={roleDraft[admin.id] ?? admin.role}
                        disabled={isPending || isSelf}
                        onChange={(event) => {
                          const role = event.target.value as Role;
                          setRoleDraft((draft) => ({ ...draft, [admin.id]: role }));
                          run(() => updateAdminRole({ id: admin.id, role }));
                        }}
                        className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-900 shadow-sm transition focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
                      >
                        {ROLES.map((role) => (
                          <option key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 tabular-nums text-slate-500">
                      {admin.createdAt}
                    </td>
                    <td className="whitespace-nowrap px-6 py-3 text-right">
                      <div className="inline-flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setPasswordTarget(admin);
                            setReplacementPassword("");
                          }}
                          className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                        >
                          Change Password
                        </button>
                        <button
                          type="button"
                          disabled={isSelf}
                          onClick={() => setDeleteTarget(admin)}
                          className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:border-slate-200 disabled:text-slate-300"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <footer className="border-t border-slate-100 px-6 py-3 text-xs text-slate-500">
          {admins.length} {admins.length === 1 ? "admin" : "admins"} registered
        </footer>
      </section>

      {/* Add admin */}
      {isAddOpen ? (
        <Modal title="Add Admin" onClose={closeAddModal}>
          <div className="space-y-4">
            <div>
              <label htmlFor="new-username" className="text-sm font-medium text-slate-700">
                Username
              </label>
              <input
                id="new-username"
                value={newUsername}
                onChange={(event) => setNewUsername(event.target.value)}
                placeholder="e.g. cashier.kasir1"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-password" className="text-sm font-medium text-slate-700">
                Password
              </label>
              <input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
                placeholder="At least 6 characters"
                className={inputClass}
              />
            </div>
            <div>
              <label htmlFor="new-role" className="text-sm font-medium text-slate-700">
                Role
              </label>
              <select
                id="new-role"
                value={newRole}
                onChange={(event) => setNewRole(event.target.value as Role)}
                className={inputClass}
              >
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ROLE_LABELS[role]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <ModalActions
            isPending={isPending}
            confirmLabel="Create Admin"
            onCancel={closeAddModal}
            onConfirm={() =>
              run(
                () =>
                  createAdmin({
                    username: newUsername,
                    password: newPassword,
                    role: newRole,
                  }),
                closeAddModal
              )
            }
          />
        </Modal>
      ) : null}

      {/* Change password */}
      {passwordTarget ? (
        <Modal
          title={`Change password · ${passwordTarget.username}`}
          onClose={() => setPasswordTarget(null)}
        >
          <div>
            <label htmlFor="replacement-password" className="text-sm font-medium text-slate-700">
              New password
            </label>
            <input
              id="replacement-password"
              type="password"
              value={replacementPassword}
              onChange={(event) => setReplacementPassword(event.target.value)}
              placeholder="At least 6 characters"
              className={inputClass}
            />
            <p className="mt-2 text-xs text-slate-500">
              The password is hashed with bcrypt before it is stored.
            </p>
          </div>

          <ModalActions
            isPending={isPending}
            confirmLabel="Update Password"
            onCancel={() => setPasswordTarget(null)}
            onConfirm={() =>
              run(
                () =>
                  changeAdminPassword({
                    id: passwordTarget.id,
                    password: replacementPassword,
                  }),
                () => setPasswordTarget(null)
              )
            }
          />
        </Modal>
      ) : null}

      {/* Delete confirmation */}
      {deleteTarget ? (
        <Modal title="Delete admin" onClose={() => setDeleteTarget(null)}>
          <p className="text-sm text-slate-600">
            Permanently delete{" "}
            <span className="font-semibold text-slate-900">
              {deleteTarget.username}
            </span>
            ? This cannot be undone.
          </p>

          <ModalActions
            isPending={isPending}
            confirmLabel="Delete"
            destructive
            onCancel={() => setDeleteTarget(null)}
            onConfirm={() =>
              run(
                () => deleteAdmin(deleteTarget.id),
                () => setDeleteTarget(null)
              )
            }
          />
        </Modal>
      ) : null}
    </div>
  );
}
