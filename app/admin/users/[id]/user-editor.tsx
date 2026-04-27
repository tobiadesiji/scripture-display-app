"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type AdminUserEditorProps = {
  user: {
    id: string;
    name: string;
    email: string;
    emailVerified: boolean;
    createdAt: string;
    updatedAt: string;
    role?: string | null;
  };
  adminEmail: string;
};

export default function AdminUserEditor({
  user,
  adminEmail,
}: AdminUserEditorProps) {
  const router = useRouter();

  const [name, setName] = useState(user.name);
  const [email, setEmail] = useState(user.email);
  const [newPassword, setNewPassword] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const isSelf = adminEmail.toLowerCase() === user.email.toLowerCase();

  const handleSave = async () => {
    setIsSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name,
          email,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to update user.");
        return;
      }

      setMessage("User updated.");
      router.refresh();
    } catch {
      setError("Failed to update user.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetPassword = async () => {
    setIsResettingPassword(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}/reset-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          newPassword,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to reset password.");
        return;
      }

      setNewPassword("");
      setMessage("Password reset successfully.");
    } catch {
      setError("Failed to reset password.");
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleDelete = async () => {
    if (isSelf) {
      setError("You cannot delete the current admin account.");
      return;
    }

    const confirmed = window.confirm(
      `Delete ${user.email}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setIsDeleting(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch(`/api/admin/users/${user.id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Failed to delete user.");
        return;
      }

      router.push("/admin/users");
      router.refresh();
    } catch {
      setError("Failed to delete user.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">Edit Details</h2>

        <div className="mt-5 space-y-4">
          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Name
            </label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              placeholder="Full name"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-slate-300">
              Email
            </label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-blue-500"
              placeholder="Email address"
            />
          </div>
        </div>

        <div className="mt-6 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="rounded-xl bg-white px-4 py-2.5 text-sm font-medium text-slate-900 transition hover:bg-slate-200 disabled:opacity-60"
          >
            {isSaving ? "Saving..." : "Save Changes"}
          </button>

          <a
            href="/admin/users"
            className="rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:bg-slate-800"
          >
            Back to Users
          </a>
        </div>

        {message ? (
          <p className="mt-4 text-sm text-emerald-300">{message}</p>
        ) : null}

        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
      </div>

      <div className="rounded-3xl border border-amber-900/40 bg-amber-950/20 p-6">
        <h2 className="text-xl font-semibold text-amber-200">Reset Password</h2>
        <p className="mt-2 text-sm text-amber-300/90">
          Set a new password directly for this user.
        </p>

        <div className="mt-4 space-y-3">
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none transition focus:border-amber-500"
            placeholder="New password"
          />

          <button
            type="button"
            onClick={handleResetPassword}
            disabled={isResettingPassword || newPassword.length < 8}
            className="rounded-xl border border-amber-800 px-4 py-2.5 text-sm font-medium text-amber-200 transition hover:bg-amber-950/40 disabled:opacity-50"
          >
            {isResettingPassword ? "Resetting..." : "Reset Password"}
          </button>
        </div>
      </div>

      <div className="rounded-3xl border border-red-900/40 bg-red-950/20 p-6">
        <h2 className="text-xl font-semibold text-red-200">Danger Zone</h2>
        <p className="mt-2 text-sm text-red-300/90">
          Deleting a user removes their account and related data.
        </p>

        <button
          type="button"
          onClick={handleDelete}
          disabled={isDeleting || isSelf}
          className="mt-5 rounded-xl border border-red-800 px-4 py-2.5 text-sm font-medium text-red-200 transition hover:bg-red-950/40 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isDeleting ? "Deleting..." : "Delete User"}
        </button>

        {isSelf ? (
          <p className="mt-3 text-xs text-red-300/80">
            The current admin account cannot be deleted here.
          </p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-slate-800 bg-slate-900 p-6">
        <h2 className="text-xl font-semibold">User Info</h2>
        <div className="mt-4 space-y-2 text-sm text-slate-300">
          <p>
            <span className="text-slate-400">Role:</span> {user.role || "user"}
          </p>
          <p>
            <span className="text-slate-400">Verified:</span>{" "}
            {user.emailVerified ? "Yes" : "No"}
          </p>
          <p>
            <span className="text-slate-400">Created:</span>{" "}
            {new Date(user.createdAt).toLocaleString()}
          </p>
          <p>
            <span className="text-slate-400">Updated:</span>{" "}
            {new Date(user.updatedAt).toLocaleString()}
          </p>
        </div>
      </div>
    </div>
  );
}