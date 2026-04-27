"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import Button from "@/components/ui/Button";
import PreviewPanel from "./PreviewPanel";
import ReferenceInput from "./ReferenceInput";
import SettingsPanel from "./SettingsPanel";
import {
  parseReferenceDetailed,
  type ParseReferenceResult,
} from "@/lib/parseReference";
import { buildReferenceLabel } from "@/lib/getPassage";
import { paginatePassageMeasured } from "@/lib/paginatePassageMeasured";
import { openDisplayWindow } from "@/lib/openDisplayWindow";
import {
  publishOutputState,
  readDisplayPresence,
  readServerDisplayPresence,
  readStoredOutputState,
  readStoredOutputViewport,
  subscribeToDisplayPresence,
  subscribeToOutputState,
  subscribeToOutputViewport,
  writeDisplaySessionBinding,
} from "@/lib/syncOutput";
import { getAdjacentVerseReference } from "@/lib/getAdjacentVerse";
import { ensureSessionInLocation } from "@/lib/session";
import type {
  BibleVersion,
  OutputState,
  PassageBundle,
  ParsedReference,
  ThemeSettings,
  Verse,
} from "@/types/scripture";
import { authClient } from "@/lib/auth-client";

const DEFAULT_THEME: ThemeSettings = {
  fontSize: 54,
  textAlign: "center",
  textColor: "#ffffff",
  backgroundColor: "#000000",
  lineHeight: 1.5,
  showReference: true,
  fontFamily: "inter",
  textShadow: "soft",
  textOutline: "none",
};

const DEFAULT_VIEWPORT = { width: 1400, height: 900 };
const CONTROLLER_SESSION_STORAGE_KEY = "scripture-controller-session";
const CONTROL_THEME_STORAGE_KEY = "scripture-control-theme";
const FREE_TEXT_BOOKMARK_PREFIX = "INFO_BOOKMARK:";

const LIVE_BUTTON_TAILWIND = "border-emerald-300/30 bg-emerald-400 text-slate-950 shadow-[0_18px_48px_rgba(16,185,129,0.28)]";
const NEXT_GLOW_CLASSES =
  "ring-2 ring-cyan-300/40 shadow-[0_0_18px_rgba(56,189,248,0.28)]";

type ScriptureApiResponse = {
  ok: boolean;
  verses?: Verse[];
  error?: string;
  provider?: string;
  cached?: boolean;
  fallback?: boolean;
};

type HistoryItem = {
  id: string;
  reference: string;
  version: string;
  openedAt: string;
};

type BookmarkItem = {
  id: string;
  reference: string;
  version: string;
  label: string;
  createdAt: string;
};

type FreeTextBookmarkPayload = {
  title: string;
  content: string;
};

type ControlClientProps = {
  userId?: string;
  userEmail?: string;
  userName?: string;
  isAdmin?: boolean;
  remoteOnly?: boolean;
  initialPreferredVersion?: BibleVersion;
  initialTheme?: ThemeSettings;
  initialHistory?: HistoryItem[];
  initialBookmarks?: BookmarkItem[];
};

function readPersistedControllerSession() {
  if (typeof window === "undefined") return "";
  return localStorage.getItem(CONTROLLER_SESSION_STORAGE_KEY) ?? "";
}

function persistControllerSession(sessionId: string) {
  if (typeof window === "undefined" || !sessionId) return;
  localStorage.setItem(CONTROLLER_SESSION_STORAGE_KEY, sessionId);
}

function PencilIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4 12.5-12.5Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-3.5 w-3.5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6" />
      <path d="M14 11v6" />
    </svg>
  );
}

function MenuIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M3 6h18" />
      <path d="M3 12h18" />
      <path d="M3 18h18" />
    </svg>
  );
}

function SunIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2.5" />
      <path d="M12 19.5V22" />
      <path d="M4.93 4.93l1.77 1.77" />
      <path d="M17.3 17.3l1.77 1.77" />
      <path d="M2 12h2.5" />
      <path d="M19.5 12H22" />
      <path d="M4.93 19.07l1.77-1.77" />
      <path d="M17.3 6.7l1.77-1.77" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8Z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 1-3 0 1.7 1.7 0 0 0-1-.6 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 1 0-3 1.7 1.7 0 0 0 .6-1 1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 1 3 0 1.7 1.7 0 0 0 1 .6 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.26.37.47.79.6 1.23a1.7 1.7 0 0 0 .99.99 1.7 1.7 0 0 1 0 3 1.7 1.7 0 0 0-.99.99c-.13.44-.34.86-.6 1.23Z" />
    </svg>
  );
}

function RemoteIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
      <circle cx="12" cy="18" r="1" />
      <path d="M9 6h6" />
    </svg>
  );
}

function UserIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M20 21a8 8 0 0 0-16 0" />
      <circle cx="12" cy="8" r="4" />
    </svg>
  );
}

function ThemeToggle({
  isLight,
  onToggle,
}: {
  isLight: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isLight ? "Switch to dark mode" : "Switch to light mode"}
      title={isLight ? "Switch to dark mode" : "Switch to light mode"}
      className={`inline-flex items-center gap-2 rounded-full border px-2 py-1.5 transition ${
        isLight
          ? "border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
          : "border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800"
      }`}
    >
      <span
        className={`flex h-7 w-7 items-center justify-center rounded-full transition ${
          isLight
            ? "bg-amber-100 text-amber-600"
            : "bg-slate-800 text-slate-200"
        }`}
      >
        {isLight ? <SunIcon /> : <MoonIcon />}
      </span>

      <span className="text-xs font-semibold uppercase tracking-wider">
        {isLight ? "Light" : "Dark"}
      </span>
    </button>
  );
}

function CompactActionButton({
  label,
  icon,
  onClick,
  className,
}: {
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  className: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={className}
      title={label}
      aria-label={label}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10">
        {icon}
      </span>
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}

function MobileRemoteModal({
  isOpen,
  onClose,
  remoteUrl,
}: {
  isOpen: boolean;
  onClose: () => void;
  remoteUrl: string;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Mobile Remote</h2>
            <p className="mt-1 text-sm text-slate-400">
              Scan to open the controller on mobile and bind to this live
              session.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="px-5 py-5 text-center">
          <div className="mb-4 inline-block rounded-xl bg-white p-3">
            <QRCodeSVG value={remoteUrl} size={180} />
          </div>
          <p className="mb-2 text-xs text-slate-400">
            This QR opens the controller, not the display.
          </p>
          <p className="break-all rounded border border-slate-800 bg-slate-950 p-2 text-xs text-slate-300">
            {remoteUrl}
          </p>
        </div>
      </div>
    </div>
  );
}

function SettingsModal({
  isOpen,
  onClose,
  theme,
  onThemeChange,
}: {
  isOpen: boolean;
  onClose: () => void;
  theme: ThemeSettings;
  onThemeChange: (theme: ThemeSettings) => void;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">
              Display Settings
            </h2>
            <p className="mt-1 text-sm text-slate-400">Styling and colors</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Close
          </button>
        </div>
        <div className="max-h-[75vh] overflow-y-auto p-6">
          <SettingsPanel theme={theme} onThemeChange={onThemeChange} />
        </div>
      </div>
    </div>
  );
}

function AccountModal({
  isOpen,
  onClose,
  userEmail,
  isAdmin,
}: {
  isOpen: boolean;
  onClose: () => void;
  userEmail?: string;
  isAdmin: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-800 px-5 py-4">
          <div>
            <h2 className="text-xl font-semibold text-white">Account</h2>
            <p className="mt-1 text-sm text-slate-400">
              Signed in as {userEmail || "User"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            Close
          </button>
        </div>

        <div className="space-y-3 p-5">
          {isAdmin ? (
            <a
              href="/admin"
              className="flex w-full items-center justify-between rounded-xl border border-blue-500/30 bg-blue-500/10 px-4 py-3 text-sm font-medium text-blue-300 transition hover:bg-blue-500/15"
            >
              <span>Open Admin</span>
              <span className="text-xs uppercase tracking-wide">Go</span>
            </a>
          ) : null}

          <button
            type="button"
            onClick={async () => {
              await authClient.signOut();
              window.location.href = "/login";
            }}
            className="flex w-full items-center justify-between rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            <span>Sign out</span>
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Exit
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function MobileMenu({
  isOpen,
  onClose,
  onOpenSettings,
  onOpenAccount,
  onOpenRemote,
  onToggleControlTheme,
  isLightControlTheme,
}: {
  isOpen: boolean;
  onClose: () => void;
  onOpenSettings: () => void;
  onOpenAccount: () => void;
  onOpenRemote: () => void;
  onToggleControlTheme: () => void;
  isLightControlTheme: boolean;
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-40 xl:hidden">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="absolute right-4 top-16 w-72 overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="border-b border-slate-800 px-4 py-3">
          <p className="text-sm font-semibold text-white">Menu</p>
          <p className="mt-1 text-xs text-slate-400">Quick actions</p>
        </div>

        <div className="p-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenSettings();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-white transition hover:bg-slate-800"
          >
            <span>Display Settings</span>
            <span className="text-xs text-slate-400">Open</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenRemote();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-white transition hover:bg-slate-800"
          >
            <span>Mobile Remote</span>
            <span className="text-xs text-slate-400">Open</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAccount();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-white transition hover:bg-slate-800"
          >
            <span>Account</span>
            <span className="text-xs text-slate-400">Open</span>
          </button>

          <button
            type="button"
            onClick={() => {
              onClose();
              onToggleControlTheme();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-3 text-left text-sm text-white transition hover:bg-slate-800"
          >
            <span className="flex items-center gap-2">
              {isLightControlTheme ? <SunIcon /> : <MoonIcon />}
              <span>Control Theme</span>
            </span>
            <span className="text-xs text-slate-400">
              {isLightControlTheme ? "Light" : "Dark"}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}

function SidePanel({
  title,
  subtitle,
  children,
  action,
  className,
  titleClassName,
  subtitleClassName,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  action?: React.ReactNode;
  className: string;
  titleClassName: string;
  subtitleClassName: string;
}) {
  return (
    <section className={className}>
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <h3 className={titleClassName}>{title}</h3>
          <p className={subtitleClassName}>{subtitle}</p>
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function formatDateTime(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(value));
  } catch {
    return value;
  }
}

function buildFreeTextBookmarkReference(
  title: string,
  content: string,
): string {
  return FREE_TEXT_BOOKMARK_PREFIX + JSON.stringify({
    title: title.trim(),
    content: content.trim(),
  });
}

function readFreeTextBookmarkReference(
  reference: string,
): FreeTextBookmarkPayload | null {
  if (reference.startsWith(FREE_TEXT_BOOKMARK_PREFIX)) {
    try {
      const parsed = JSON.parse(
        reference.slice(FREE_TEXT_BOOKMARK_PREFIX.length),
      ) as Partial<FreeTextBookmarkPayload>;

      return {
        title: typeof parsed.title === "string" ? parsed.title : "",
        content: typeof parsed.content === "string" ? parsed.content : "",
      };
    } catch {
      return {
        title: "Announcement",
        content: "",
      };
    }
  }

  // Backwards compatibility for older info bookmarks already saved as "INFO: ...".
  // Those older bookmarks did not store the message body, so only the title can be restored.
  if (reference.startsWith("INFO:")) {
    return {
      title: reference.replace(/^INFO:\\s*/, "").trim() || "Announcement",
      content: "",
    };
  }

  return null;
}

export default function ControlClient({
  userEmail,
  userName,
  isAdmin = false,
  remoteOnly = false,
  initialPreferredVersion = "KJV",
  initialTheme,
  initialHistory = [],
  initialBookmarks = [],
}: ControlClientProps) {
  const [referenceInput, setReferenceInput] = useState("John 3:16");
  const [activeReference, setActiveReference] = useState("John 3:16");
  const [version, setVersion] = useState<BibleVersion>(initialPreferredVersion);
  const [theme, setTheme] = useState<ThemeSettings>(
    initialTheme ?? DEFAULT_THEME,
  );
  const [controlTheme, setControlTheme] = useState<"dark" | "light">("dark");
  const [error, setError] = useState("");
  const [bundle, setBundle] = useState<PassageBundle | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [outputViewport, setOutputViewport] = useState(DEFAULT_VIEWPORT);
  const [sessionId, setSessionId] = useState("");
  const [hasLiveOutput, setHasLiveOutput] = useState(false);
  const [isSessionLive, setIsSessionLive] = useState(false);
  const [liveBundleKey, setLiveBundleKey] = useState("");
  const [recentPassages, setRecentPassages] = useState<string[]>([]);
  const [isDisplayConnected, setIsDisplayConnected] = useState(false);

  const [history, setHistory] = useState<HistoryItem[]>(
    initialHistory.slice(0, 12),
  );
  const [bookmarks, setBookmarks] = useState<BookmarkItem[]>(
    initialBookmarks.slice(0, 10),
  );
  const [bookmarkLabel, setBookmarkLabel] = useState("");
  const [isSavingBookmark, setIsSavingBookmark] = useState(false);
  const [editingBookmarkId, setEditingBookmarkId] = useState<string | null>(
    null,
  );
  const [editingBookmarkLabel, setEditingBookmarkLabel] = useState("");

  const [freeTextTitle, setFreeTextTitle] = useState("");
  const [freeTextContent, setFreeTextContent] = useState("");
  const [freeTextBookmarkLabel, setFreeTextBookmarkLabel] = useState("");

  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const hasMounted = useRef(false);
  const requestIdRef = useRef(0);
  const preferenceSaveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const lastThemeSyncKeyRef = useRef("");

  const isLightControlTheme = controlTheme === "light";
  const canUseAccountFeatures = Boolean(userEmail) && !remoteOnly;

  const shellClass = isLightControlTheme
    ? "min-h-screen bg-slate-100 px-4 py-5 text-slate-900 sm:px-6 md:px-8"
    : "brand-shell";

  const cardClass = isLightControlTheme
    ? "rounded-3xl border border-slate-200 bg-white shadow-sm"
    : "brand-card";

  const sidePanelClass = isLightControlTheme
    ? "rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"
    : "brand-card p-4";

  const titleTextClass = isLightControlTheme
    ? "text-base font-bold text-slate-900"
    : "text-base font-bold text-white";

  const subtitleTextClass = isLightControlTheme
    ? "mt-1 text-xs text-slate-500"
    : "mt-1 text-xs text-slate-400";

  const subtleTextClass = isLightControlTheme
    ? "text-slate-500"
    : "text-slate-400";

  const surfaceMutedClass = isLightControlTheme
    ? "bg-slate-50 border-slate-200"
    : "bg-white/[0.035] border-white/10";

  const inputClass = isLightControlTheme
    ? "w-full rounded-2xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"
    : "brand-input";

  const smallActionClass = isLightControlTheme
    ? "rounded-xl border border-slate-300 px-3 py-1.5 text-[11px] font-bold text-slate-700 transition hover:border-slate-400 hover:bg-slate-100"
    : "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[11px] font-bold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08]";

  const compactActionButtonClass = isLightControlTheme
    ? "inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-2.5 py-1.5 text-slate-700 shadow-sm transition hover:bg-slate-50"
    : "inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-slate-200 transition hover:bg-white/[0.085]";

  const compactActionGroupClass = isLightControlTheme
    ? "flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm"
    : "flex items-center gap-2 rounded-full border border-white/10 bg-slate-950/55 px-2 py-1 backdrop-blur-xl";

  const firstName = useMemo(() => {
    if (userName?.trim()) return userName.trim().split(/\s+/)[0];
    if (userEmail?.trim()) return userEmail.trim().split("@")[0];
    return "User";
  }, [userEmail, userName]);

  const getBundleKey = useCallback((nextBundle: PassageBundle | null) => {
    if (!nextBundle) return "";
    return `${nextBundle.translation}-${nextBundle.reference}-p${nextBundle.currentPageIndex}`;
  }, []);

  const isActivelyLive = isSessionLive && isDisplayConnected;

  const hasMoreContent = useMemo(() => {
    if (!bundle) return false;
    return bundle.currentPageIndex < bundle.pages.length - 1;
  }, [bundle]);

  const addToRecentPassages = useCallback((ref: string) => {
    setRecentPassages((prev) => {
      const filtered = prev.filter((p) => p !== ref);
      return [ref, ...filtered].slice(0, 5);
    });
  }, []);

  const sendBundle = useCallback(
    (nextBundle: PassageBundle | null, nextTheme = theme) => {
      if (!nextBundle || !sessionId) return;

      publishOutputState(
        { mode: "passage", bundle: nextBundle, theme: nextTheme },
        sessionId,
      );
      setHasLiveOutput(true);
      setIsSessionLive(true);
      setLiveBundleKey(getBundleKey(nextBundle));
    },
    [getBundleKey, sessionId, theme],
  );

  const fetchUnifiedScripture = useCallback(
    async (
      targetVersion: BibleVersion,
      submittedReference: string,
      parsed: ParsedReference,
    ): Promise<Verse[]> => {
      const response = await fetch("/api/api-bible", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          version: targetVersion,
          reference: submittedReference,
          parsed,
        }),
      });

      const data = (await response.json()) as ScriptureApiResponse;

      if (!response.ok || !data.ok || !data.verses?.length) {
        throw new Error(data.error || `Not found in ${targetVersion}.`);
      }

      return data.verses;
    },
    [],
  );

  const refreshHistory = useCallback(async () => {
    if (!canUseAccountFeatures) return;

    try {
      const response = await fetch("/api/user/history?limit=12", {
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok && data.history) {
        setHistory(
          data.history.map(
            (item: HistoryItem & { openedAt: string | Date }) => ({
              ...item,
              openedAt:
                typeof item.openedAt === "string"
                  ? item.openedAt
                  : new Date(item.openedAt).toISOString(),
            }),
          ),
        );
      }
    } catch (historyError) {
      console.error("Failed to refresh history", historyError);
    }
  }, [canUseAccountFeatures]);

  const refreshBookmarks = useCallback(async () => {
    if (!canUseAccountFeatures) return;

    try {
      const response = await fetch("/api/user/bookmarks", {
        cache: "no-store",
      });
      const data = await response.json();
      if (response.ok && data.bookmarks) {
        setBookmarks(
          data.bookmarks
            .map((item: BookmarkItem & { createdAt: string | Date }) => ({
              ...item,
              createdAt:
                typeof item.createdAt === "string"
                  ? item.createdAt
                  : new Date(item.createdAt).toISOString(),
            }))
            .slice(0, 10),
        );
      }
    } catch (bookmarkError) {
      console.error("Failed to refresh bookmarks", bookmarkError);
    }
  }, [canUseAccountFeatures]);

  const persistReferenceHistory = useCallback(
    async (reference: string, nextVersion: BibleVersion) => {
      if (!canUseAccountFeatures) return;

      try {
        await fetch("/api/user/history", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            sessionKey: sessionId || null,
            reference,
            version: nextVersion,
          }),
        });
        await refreshHistory();
      } catch (historyError) {
        console.error("Failed to persist reference history", historyError);
      }
    },
    [canUseAccountFeatures, refreshHistory, sessionId],
  );

  const savePreferences = useCallback(
    async (nextVersion: BibleVersion, nextTheme: ThemeSettings) => {
      if (!canUseAccountFeatures) return;

      try {
        await fetch("/api/user/preferences", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            preferredVersion: nextVersion,
            themeSettingsJson: nextTheme,
          }),
        });
      } catch (preferenceError) {
        console.error("Failed to save preferences", preferenceError);
      }
    },
    [canUseAccountFeatures],
  );

  const schedulePreferenceSave = useCallback(
    (nextVersion: BibleVersion, nextTheme: ThemeSettings) => {
      if (!canUseAccountFeatures) return;

      if (preferenceSaveTimeoutRef.current) {
        clearTimeout(preferenceSaveTimeoutRef.current);
      }

      preferenceSaveTimeoutRef.current = setTimeout(() => {
        void savePreferences(nextVersion, nextTheme);
      }, 500);
    },
    [savePreferences],
  );

  const loadPassage = useCallback(
    async (
      submittedReference: string,
      options?: {
        autoSend?: boolean;
        overrideVersion?: BibleVersion;
        saveHistory?: boolean;
      },
    ) => {
      const parseResult: ParseReferenceResult =
        parseReferenceDetailed(submittedReference);

      if (!parseResult.ok) {
        setBundle(null);
        setError(parseResult.error.message);
        return null;
      }

      const requestId = ++requestIdRef.current;
      setIsLoading(true);
      setError("");

      try {
        const targetVersion = options?.overrideVersion ?? version;

        const selected = await fetchUnifiedScripture(
          targetVersion,
          submittedReference,
          parseResult.value,
        );

        if (requestId !== requestIdRef.current) return null;

        if (!selected.length) {
          setBundle(null);
          setError(`Not found in ${targetVersion}.`);
          return null;
        }

        const normalizedReference = buildReferenceLabel(
          parseResult.value,
          selected,
        );

        const nextBundle: PassageBundle = {
          reference: normalizedReference,
          translation: targetVersion,
          verses: selected,
          pages: paginatePassageMeasured(selected, theme, outputViewport),
          currentPageIndex: 0,
        };

        setVersion(targetVersion);
        setActiveReference(normalizedReference);
        setReferenceInput(normalizedReference);
        setBundle(nextBundle);
        addToRecentPassages(nextBundle.reference);

        if (options?.autoSend) {
          sendBundle(nextBundle);
        }

        if (options?.saveHistory !== false) {
          await persistReferenceHistory(normalizedReference, targetVersion);
        }

        schedulePreferenceSave(targetVersion, theme);

        return nextBundle;
      } catch (caught) {
        const message =
          caught instanceof Error ? caught.message : "Error loading passage.";
        setError(message);
        return null;
      } finally {
        if (requestId === requestIdRef.current) {
          setIsLoading(false);
        }
      }
    },
    [
      version,
      theme,
      outputViewport,
      addToRecentPassages,
      fetchUnifiedScripture,
      persistReferenceHistory,
      schedulePreferenceSave,
      sendBundle,
    ],
  );

  const clearScreen = useCallback(() => {
    if (!sessionId) return;
    publishOutputState({ mode: "blank", theme }, sessionId);
    setHasLiveOutput(false);
    setIsSessionLive(false);
    setLiveBundleKey("");
  }, [sessionId, theme]);

  const handleSend = useCallback(async () => {
    await loadPassage(referenceInput, { autoSend: true, saveHistory: true });
  }, [loadPassage, referenceInput]);

  const handleLoadOnly = useCallback(async () => {
    await loadPassage(referenceInput, { autoSend: false, saveHistory: true });
  }, [loadPassage, referenceInput]);

  const handleSendFreeText = useCallback(() => {
    if (!sessionId || !freeTextContent.trim()) return;

    const nextState: OutputState = {
      mode: "text",
      title: freeTextTitle.trim() || undefined,
      content: freeTextContent.trim(),
      theme,
    };

    publishOutputState(nextState, sessionId);
    setHasLiveOutput(true);
    setIsSessionLive(true);
    setLiveBundleKey("");
  }, [freeTextContent, freeTextTitle, sessionId, theme]);

  const handleBookmarkFreeText = useCallback(async () => {
    if (!freeTextContent.trim()) return;

    try {
      const reference = buildFreeTextBookmarkReference(
        freeTextTitle,
        freeTextContent,
      );

      await fetch("/api/user/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference,
          version: "INFO",
          label:
            freeTextBookmarkLabel.trim() ||
            freeTextTitle.trim() ||
            "Announcement",
        }),
      });

      setFreeTextBookmarkLabel("");
      await refreshBookmarks();
    } catch (bookmarkError) {
      console.error("Failed to bookmark free text", bookmarkError);
    }
  }, [freeTextContent, freeTextTitle, freeTextBookmarkLabel, refreshBookmarks]);

  const handleSelectBookmark = useCallback(
    (item: BookmarkItem) => {
      const infoBookmark = readFreeTextBookmarkReference(item.reference);

      if (infoBookmark) {
        const title = infoBookmark.title || item.label || "Announcement";
        const content = infoBookmark.content;

        setFreeTextTitle(title);
        setFreeTextContent(content);
        setFreeTextBookmarkLabel(item.label || title);
        setError("");

        if (sessionId && content.trim()) {
          publishOutputState(
            {
              mode: "text",
              title: title.trim() || undefined,
              content: content.trim(),
              theme,
            },
            sessionId,
          );
          setHasLiveOutput(true);
          setIsSessionLive(true);
          setLiveBundleKey("");
        }

        return;
      }

      setReferenceInput(item.reference);
      void loadPassage(item.reference, {
        autoSend: true,
        overrideVersion: (item.version || version) as BibleVersion,
        saveHistory: true,
      });
    },
    [loadPassage, sessionId, theme, version],
  );

  const navigate = useCallback(
    async (direction: "prev" | "next") => {
      if (!bundle || isLoading || isNavigating) return;

      const hasPrev = bundle.currentPageIndex > 0;
      const hasNext = bundle.currentPageIndex < bundle.pages.length - 1;

      if (direction === "prev" && hasPrev) {
        const nextBundle: PassageBundle = {
          ...bundle,
          currentPageIndex: bundle.currentPageIndex - 1,
        };
        setBundle(nextBundle);
        sendBundle(nextBundle);
        return;
      }

      if (direction === "next" && hasNext) {
        const nextBundle: PassageBundle = {
          ...bundle,
          currentPageIndex: bundle.currentPageIndex + 1,
        };
        setBundle(nextBundle);
        sendBundle(nextBundle);
        return;
      }

      const parseResult = parseReferenceDetailed(activeReference);
      if (!parseResult.ok) return;

      setIsNavigating(true);

      try {
        const res = await getAdjacentVerseReference(
          parseResult.value,
          version,
          direction,
        );

        if (res) {
          const loaded = await loadPassage(res.reference, {
            autoSend: true,
            saveHistory: false,
          });
          if (loaded) {
            setReferenceInput(res.reference);
            setActiveReference(loaded.reference);
          }
        }
      } finally {
        setIsNavigating(false);
      }
    },
    [
      activeReference,
      bundle,
      isLoading,
      isNavigating,
      loadPassage,
      sendBundle,
      version,
    ],
  );

  const handleBookmarkCurrent = useCallback(async () => {
    if (!activeReference.trim()) return;

    try {
      setIsSavingBookmark(true);

      const response = await fetch("/api/user/bookmarks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reference: activeReference,
          version,
          label: bookmarkLabel.trim() || null,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        setError(data.error || "Failed to bookmark reference.");
        return;
      }

      setBookmarkLabel("");
      await refreshBookmarks();
    } catch (bookmarkError) {
      console.error(bookmarkError);
      setError("Failed to bookmark reference.");
    } finally {
      setIsSavingBookmark(false);
    }
  }, [activeReference, bookmarkLabel, refreshBookmarks, version]);

  const handleDeleteBookmark = useCallback(
    async (bookmarkId: string) => {
      try {
        await fetch("/api/user/bookmarks", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ bookmarkId }),
        });
        await refreshBookmarks();
      } catch (bookmarkError) {
        console.error("Failed to delete bookmark", bookmarkError);
      }
    },
    [refreshBookmarks],
  );

  const handleEditBookmarkStart = useCallback((bookmark: BookmarkItem) => {
    setEditingBookmarkId(bookmark.id);
    setEditingBookmarkLabel(bookmark.label || bookmark.reference);
  }, []);

  const handleEditBookmarkSave = useCallback(async () => {
    if (!editingBookmarkId) return;

    try {
      await fetch("/api/user/bookmarks", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          bookmarkId: editingBookmarkId,
          label: editingBookmarkLabel.trim() || null,
        }),
      });
      setEditingBookmarkId(null);
      setEditingBookmarkLabel("");
      await refreshBookmarks();
    } catch (bookmarkError) {
      console.error("Failed to update bookmark label", bookmarkError);
    }
  }, [editingBookmarkId, editingBookmarkLabel, refreshBookmarks]);

  const handleDeleteHistoryItem = useCallback(
    async (historyId: string) => {
      try {
        await fetch("/api/user/history", {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ historyId }),
        });
        await refreshHistory();
      } catch (historyError) {
        console.error("Failed to hide history item", historyError);
      }
    },
    [refreshHistory],
  );

  const handleClearHistory = useCallback(async () => {
    try {
      await fetch("/api/user/history", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ clear: true }),
      });
      await refreshHistory();
    } catch (historyError) {
      console.error("Failed to clear history", historyError);
    }
  }, [refreshHistory]);

  const toggleControlTheme = useCallback(() => {
    setControlTheme((prev) => (prev === "dark" ? "light" : "dark"));
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = window.localStorage.getItem(CONTROL_THEME_STORAGE_KEY);
    if (saved === "light" || saved === "dark") {
      setControlTheme(saved);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CONTROL_THEME_STORAGE_KEY, controlTheme);
  }, [controlTheme]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      ) {
        return;
      }

      switch (e.code) {
        case "Space":
          e.preventDefault();
          void handleSend();
          break;
        case "ArrowRight":
          void navigate("next");
          break;
        case "ArrowLeft":
          void navigate("prev");
          break;
        case "Escape":
          clearScreen();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [clearScreen, handleSend, navigate]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const params = new URLSearchParams(window.location.search);
    const sharedSessionId = params.get("session")?.trim() || "";
    const persistedSessionId = readPersistedControllerSession().trim();

    const safeSession =
      sharedSessionId || persistedSessionId || ensureSessionInLocation();

    setSessionId(safeSession);
    persistControllerSession(safeSession);
  }, []);

  useEffect(() => {
    if (!sessionId) return;
    writeDisplaySessionBinding(sessionId);
    persistControllerSession(sessionId);
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) {
      setIsDisplayConnected(false);
      return;
    }

    let cancelled = false;

    const checkPresence = async () => {
      const localTs = readDisplayPresence(sessionId);
      const serverTs = await readServerDisplayPresence(sessionId);

      const freshest = Math.max(localTs ?? 0, serverTs ?? 0);
      const connected = freshest > 0 && Date.now() - freshest < 7000;

      if (!cancelled) {
        setIsDisplayConnected(connected);
      }
    };

    void checkPresence();

    const stop = subscribeToDisplayPresence(sessionId, () => {
      void checkPresence();
    });

    const interval = window.setInterval(() => {
      void checkPresence();
    }, 2000);

    return () => {
      cancelled = true;
      stop();
      window.clearInterval(interval);
    };
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;

    const stopState = subscribeToOutputState(sessionId, (nextState) => {
      if (nextState.mode === "passage") {
        setHasLiveOutput(true);
        setIsSessionLive(true);
        setLiveBundleKey(getBundleKey(nextState.bundle));

        setBundle(nextState.bundle);
        setReferenceInput(nextState.bundle.reference);
        setActiveReference(nextState.bundle.reference);
        setVersion(nextState.bundle.translation as BibleVersion);
        setTheme(nextState.theme);
      } else if (nextState.mode === "text") {
        setHasLiveOutput(true);
        setIsSessionLive(true);
        setLiveBundleKey("");
        setTheme(nextState.theme);
        setFreeTextTitle(nextState.title || "");
        setFreeTextContent(nextState.content);
      } else {
        setHasLiveOutput(false);
        setIsSessionLive(false);
        setLiveBundleKey("");
      }
    });

    return () => stopState();
  }, [getBundleKey, sessionId]);

  useEffect(() => {
    if (!sessionId || hasMounted.current) return;

    const storedState = readStoredOutputState(sessionId);
    if (storedState?.mode === "passage") {
      setHasLiveOutput(true);
      setIsSessionLive(true);
      setLiveBundleKey(getBundleKey(storedState.bundle));

      setBundle(storedState.bundle);
      setReferenceInput(storedState.bundle.reference);
      setActiveReference(storedState.bundle.reference);
      setVersion(storedState.bundle.translation as BibleVersion);
      setTheme(storedState.theme);
    } else if (storedState?.mode === "text") {
      setHasLiveOutput(true);
      setIsSessionLive(true);
      setLiveBundleKey("");
      setTheme(storedState.theme);
      setFreeTextTitle(storedState.title || "");
      setFreeTextContent(storedState.content);
    } else {
      setHasLiveOutput(false);
      setIsSessionLive(false);
      setLiveBundleKey("");
    }

    const storedViewport = readStoredOutputViewport(sessionId);
    if (storedViewport) {
      setOutputViewport(storedViewport);
    }

    const stopViewport = subscribeToOutputViewport(sessionId, (viewport) => {
      setOutputViewport(viewport);
    });

    hasMounted.current = true;

    return () => stopViewport();
  }, [getBundleKey, sessionId]);

  useEffect(() => {
    if (!bundle) return;

    const nextPages = paginatePassageMeasured(
      bundle.verses,
      theme,
      outputViewport,
    );
    const nextPageIndex = Math.min(
      bundle.currentPageIndex,
      Math.max(0, nextPages.length - 1),
    );

    const currentPagesSignature = JSON.stringify(bundle.pages);
    const nextPagesSignature = JSON.stringify(nextPages);

    if (
      nextPagesSignature !== currentPagesSignature ||
      nextPageIndex !== bundle.currentPageIndex
    ) {
      setBundle({
        ...bundle,
        pages: nextPages,
        currentPageIndex: nextPageIndex,
      });
    }
  }, [theme, outputViewport, bundle]);

  useEffect(() => {
    if (!sessionId || !isSessionLive || !bundle) return;

    const nextPages = paginatePassageMeasured(
      bundle.verses,
      theme,
      outputViewport,
    );
    const nextPageIndex = Math.min(
      bundle.currentPageIndex,
      Math.max(0, nextPages.length - 1),
    );

    const nextBundle: PassageBundle = {
      ...bundle,
      pages: nextPages,
      currentPageIndex: nextPageIndex,
    };

    const syncKey = JSON.stringify({
      mode: "passage",
      sessionId,
      reference: nextBundle.reference,
      translation: nextBundle.translation,
      pageIndex: nextBundle.currentPageIndex,
      theme,
      viewport: outputViewport,
    });

    if (lastThemeSyncKeyRef.current === syncKey) return;
    lastThemeSyncKeyRef.current = syncKey;

    publishOutputState(
      {
        mode: "passage",
        bundle: nextBundle,
        theme,
      },
      sessionId,
    );
  }, [theme, outputViewport, bundle, isSessionLive, sessionId]);

  useEffect(() => {
    if (!sessionId || !isSessionLive || !freeTextContent.trim() || bundle) return;

    const syncKey = JSON.stringify({
      mode: "text",
      sessionId,
      title: freeTextTitle.trim(),
      content: freeTextContent.trim(),
      theme,
    });

    if (lastThemeSyncKeyRef.current === syncKey) return;
    lastThemeSyncKeyRef.current = syncKey;

    publishOutputState(
      {
        mode: "text",
        title: freeTextTitle.trim() || undefined,
        content: freeTextContent.trim(),
        theme,
      },
      sessionId,
    );
  }, [theme, sessionId, isSessionLive, freeTextTitle, freeTextContent, bundle]);

  useEffect(() => {
    if (!canUseAccountFeatures) return;
    schedulePreferenceSave(version, theme);
  }, [canUseAccountFeatures, schedulePreferenceSave, theme, version]);

  useEffect(() => {
    return () => {
      if (preferenceSaveTimeoutRef.current) {
        clearTimeout(preferenceSaveTimeoutRef.current);
      }
    };
  }, []);

  const remoteUrl = useMemo(() => {
    if (typeof window === "undefined") return "";

    const url = new URL("/remote", window.location.origin);
    if (sessionId) {
      url.searchParams.set("session", sessionId);
    }
    return url.toString();
  }, [sessionId]);

  const statusText = bundle
    ? `${bundle.reference} · Page ${bundle.currentPageIndex + 1}/${bundle.pages.length}`
    : isSessionLive
      ? "Live content active."
      : "Ready.";

  if (remoteOnly) {
    return (
      <main className="brand-shell">
        <div className="mx-auto flex min-h-[calc(100vh-3rem)] max-w-xl flex-col justify-center">
          <section className="brand-card-strong brand-glow-line p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="brand-kicker">WordFlow Remote</p>
                <h1 className="brand-heading mt-2 text-3xl font-black tracking-tight">
                  Mobile Control
                </h1>
                <p className="mt-3 text-sm leading-6 text-slate-400">
                  Control the live scripture display from this device.
                </p>
              </div>
              <span
                className={`brand-pill shrink-0 ${
                  isDisplayConnected
                    ? "brand-pill-connected"
                    : "brand-pill-disconnected"
                }`}
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isDisplayConnected ? "bg-emerald-300" : "bg-slate-500"
                  }`}
                />
                {isDisplayConnected ? "Online" : "Offline"}
              </span>
            </div>

            <div className="mt-5 rounded-3xl border border-white/10 bg-white/[0.035] p-4">
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-slate-500">
                Current
              </p>
              <p className="mt-2 text-xl font-black text-white">
                {bundle?.reference || "No passage loaded"}
              </p>
              <p className="mt-1 text-sm text-slate-400">{statusText}</p>
            </div>

            <div className="mt-5">
              <label className="brand-label">Bible Version</label>
              <select
                value={version}
                onChange={(e) =>
                  void loadPassage(activeReference, {
                    overrideVersion: e.target.value as BibleVersion,
                    autoSend: hasLiveOutput,
                    saveHistory: false,
                  })
                }
                className="brand-select"
              >
                {["KJV", "NLT", "NIV", "AMP", "TPT"].map((v) => (
                  <option key={v} value={v}>
                    {v}
                  </option>
                ))}
              </select>
            </div>

            <div className="mt-5">
              <ReferenceInput
                value={referenceInput}
                error={error || null}
                onChange={(v) => {
                  setReferenceInput(v);
                  setError("");
                }}
                onSubmit={handleSend}
              />
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Button
                controlTheme={controlTheme}
                onClick={() => void navigate("prev")}
                disabled={!bundle || isLoading || isNavigating}
                className="min-h-20 text-lg"
              >
                Prev
              </Button>
              <Button
                controlTheme={controlTheme}
                variant="primary"
                onClick={() => void navigate("next")}
                disabled={!bundle || isLoading || isNavigating}
                className="min-h-20 text-lg"
              >
                Next
              </Button>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-3">
              <Button
                controlTheme={controlTheme}
                onClick={handleLoadOnly}
                disabled={isLoading}
              >
                Load
              </Button>
              <Button
                controlTheme={controlTheme}
                variant="primary"
                onClick={handleSend}
                disabled={isLoading || !sessionId}
              >
                Send Live
              </Button>
              <Button
                controlTheme={controlTheme}
                onClick={clearScreen}
                disabled={!sessionId}
              >
                Clear
              </Button>
              <Button
                controlTheme={controlTheme}
                onClick={() =>
                  sessionId && publishOutputState({ mode: "black", theme }, sessionId)
                }
                disabled={!sessionId}
              >
                Black
              </Button>
            </div>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className={shellClass}>
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-start justify-between gap-4">
          <div>
            <p className={isLightControlTheme ? "text-xs font-black uppercase tracking-[0.28em] text-emerald-600" : "brand-kicker"}>
              WordFlow
            </p>
            <h1
              className={
                isLightControlTheme
                  ? "mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl"
                  : "brand-heading mt-2 text-3xl font-black tracking-tight sm:text-4xl"
              }
            >
              Scripture Controller
            </h1>
            <p className={`mt-3 max-w-2xl text-sm leading-6 ${subtleTextClass}`}>
              Welcome back, {firstName}. Search scripture, send it live, manage bookmarks,
              and control the display from one polished worship-media workspace.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-2">
              <div
                className={
                  isLightControlTheme
                    ? "inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 shadow-sm"
                    : `brand-pill ${isDisplayConnected ? "brand-pill-connected" : "brand-pill-disconnected"}`
                }
              >
                <span
                  className={`h-2 w-2 rounded-full ${
                    isDisplayConnected ? "bg-emerald-500" : "bg-slate-500"
                  }`}
                />
                <span
                  className={`text-[11px] font-bold uppercase tracking-widest ${
                    isDisplayConnected
                      ? "text-emerald-400"
                      : isLightControlTheme
                        ? "text-slate-500"
                        : "text-slate-400"
                  }`}
                >
                  {isDisplayConnected
                    ? "Display Connected"
                    : "Display Disconnected"}
                </span>
              </div>

              {userEmail ? (
                <div
                  className={
                    isLightControlTheme
                      ? "inline-flex items-center rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-600"
                      : "inline-flex items-center rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-blue-300"
                  }
                >
                  {userEmail}
                </div>
              ) : null}
            </div>
          </div>

          <div className="hidden items-center gap-2 xl:flex xl:shrink-0">
            <ThemeToggle
              isLight={isLightControlTheme}
              onToggle={toggleControlTheme}
            />

            <div className={compactActionGroupClass}>
              <CompactActionButton
                label="Settings"
                icon={<SettingsIcon />}
                onClick={() => setIsSettingsModalOpen(true)}
                className={compactActionButtonClass}
              />

              <CompactActionButton
                label="Remote"
                icon={<RemoteIcon />}
                onClick={() => setIsRemoteModalOpen(true)}
                className={compactActionButtonClass}
              />

              <CompactActionButton
                label="Account"
                icon={<UserIcon />}
                onClick={() => setIsAccountModalOpen(true)}
                className={compactActionButtonClass}
              />
            </div>
          </div>

          <div className="xl:hidden">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((prev) => !prev)}
              className={
                isLightControlTheme
                  ? "rounded-xl border border-slate-300 bg-white p-3 text-slate-700 transition hover:bg-slate-50"
                  : "rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-200 transition hover:bg-slate-800"
              }
              aria-label="Open menu"
            >
              <MenuIcon />
            </button>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-[430px,1fr,320px]">
          <div className="space-y-4">
            <section className={`${cardClass} p-4 sm:p-5`}>
              <div className="mb-4">
                <label
                  className={`mb-2 block text-sm font-medium ${
                    isLightControlTheme ? "text-slate-800" : "text-white"
                  }`}
                >
                  Bible Version
                </label>
                <select
                  value={version}
                  onChange={(e) =>
                    void loadPassage(activeReference, {
                      overrideVersion: e.target.value as BibleVersion,
                      autoSend: hasLiveOutput,
                      saveHistory: false,
                    })
                  }
                  className={
                    isLightControlTheme
                      ? "h-10 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900"
                      : "h-10 w-full rounded-xl border border-slate-700 bg-slate-950 px-3 text-sm text-white"
                  }
                >
                  {["KJV", "NLT", "NIV", "AMP", "TPT"].map((v) => (
                    <option key={v} value={v}>
                      {v}
                    </option>
                  ))}
                </select>
              </div>

              <ReferenceInput
                value={referenceInput}
                error={error || null}
                onChange={(v) => {
                  setReferenceInput(v);
                  setError("");
                }}
                onSubmit={handleSend}
              />

              {recentPassages.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {recentPassages.map((ref) => (
                    <button
                      key={ref}
                      onClick={() => {
                        setReferenceInput(ref);
                        void loadPassage(ref, {
                          autoSend: true,
                          saveHistory: true,
                        });
                      }}
                      className={
                        isLightControlTheme
                          ? "rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-700 transition hover:bg-slate-200 hover:text-slate-900"
                          : "rounded bg-slate-800 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-300 transition hover:bg-slate-700 hover:text-white"
                      }
                    >
                      {ref}
                    </button>
                  ))}
                </div>
              )}

              <div className={`mt-3 text-xs ${subtleTextClass}`}>{statusText}</div>

              <div className="mt-4 grid grid-cols-2 gap-2 sm:gap-3">
                <Button controlTheme={controlTheme} onClick={handleLoadOnly} disabled={isLoading}>
                  Load
                </Button>

                <Button controlTheme={controlTheme}
                  variant="primary"
                  onClick={handleSend}
                  disabled={isLoading || !sessionId}
                  style={{
                    backgroundColor: isActivelyLive ? "#10b981" : "",
                    borderColor: isActivelyLive ? "#059669" : "",
                  }}
                  className={`relative flex items-center justify-center transition-all ${
                    isActivelyLive ? LIVE_BUTTON_TAILWIND : ""
                  }`}
                >
                  <div className="relative flex w-full items-center justify-center">
                    {isActivelyLive && (
                      <div className="relative flex h-0 w-0 items-center justify-center">
                        <span className="absolute right-3 flex h-2 w-2 items-center justify-center">
                          <span className="h-2 w-2 rounded-full bg-white" />
                        </span>
                      </div>
                    )}
                    <span className="text-center font-semibold">
                      {isActivelyLive ? "Live" : "Send"}
                    </span>
                  </div>
                </Button>

                <Button controlTheme={controlTheme}
                  onClick={() => sessionId && openDisplayWindow(sessionId)}
                  disabled={!sessionId}
                >
                  Open Display
                </Button>

                <Button controlTheme={controlTheme} onClick={clearScreen} disabled={!sessionId}>
                  Clear
                </Button>
              </div>

              <div className={`mt-4 rounded-xl border p-3 ${surfaceMutedClass}`}>
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  <Button controlTheme={controlTheme}
                    onClick={() => void navigate("prev")}
                    disabled={!bundle || isLoading}
                  >
                    Prev
                  </Button>
                  <Button controlTheme={controlTheme}
                    onClick={() => void navigate("next")}
                    disabled={!bundle || isLoading}
                    className={hasMoreContent ? NEXT_GLOW_CLASSES : ""}
                  >
                    Next {hasMoreContent ? "Page" : ""}
                  </Button>
                </div>
              </div>

              <div className={`mt-4 rounded-xl border p-3 ${surfaceMutedClass}`}>
                <p
                  className={`mb-3 text-xs font-bold uppercase tracking-wider ${subtleTextClass}`}
                >
                  Bookmark Current Reference
                </p>
                <input
                  type="text"
                  value={bookmarkLabel}
                  onChange={(e) => setBookmarkLabel(e.target.value)}
                  placeholder="Optional label"
                  className={inputClass}
                />
                <div className="mt-3">
                  <Button controlTheme={controlTheme}
                    onClick={handleBookmarkCurrent}
                    disabled={!activeReference || isSavingBookmark}
                  >
                    {isSavingBookmark ? "Saving..." : "Add Bookmark"}
                  </Button>
                </div>
              </div>

              <div className="mt-4 xl:hidden">
                <div className="mb-2 flex items-center justify-between">
                  <h2
                    className={
                      isLightControlTheme
                        ? "text-lg font-semibold text-slate-900"
                        : "text-lg font-semibold text-white"
                    }
                  >
                    Preview
                  </h2>
                  {isActivelyLive && (
                    <span className="animate-pulse rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                      Live
                    </span>
                  )}
                </div>
                <PreviewPanel
                    bundle={bundle}
                    error={error}
                    controlTheme={controlTheme}
/>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-2">
                <Button controlTheme={controlTheme}
                  onClick={clearScreen}
                  disabled={!sessionId}
                  className="text-[10px]"
                >
                  Clear
                </Button>
                <Button controlTheme={controlTheme}
                  onClick={() =>
                    publishOutputState({ mode: "black", theme }, sessionId)
                  }
                  disabled={!sessionId}
                  className="text-[10px]"
                >
                  Black
                </Button>
                <Button controlTheme={controlTheme}
                  onClick={() =>
                    publishOutputState({ mode: "white", theme }, sessionId)
                  }
                  disabled={!sessionId}
                  className="text-[10px]"
                >
                  White
                </Button>
              </div>
            </section>
          </div>

          <div className="space-y-4">
            <div className="hidden xl:block">
              <div className="mb-4 flex items-center gap-4">
                <h2
                  className={
                    isLightControlTheme
                      ? "text-2xl font-bold tracking-tight text-slate-900"
                      : "text-2xl font-bold tracking-tight text-white"
                  }
                >
                  Preview
                </h2>
                {isActivelyLive && (
                  <div className="flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1">
                    <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-500" />
                    <span className="text-xs font-bold uppercase tracking-widest text-emerald-500">
                      Live on Screen
                    </span>
                  </div>
                )}
              </div>

              <div
                className={`overflow-hidden rounded-xl transition-all duration-300 ${
                  isActivelyLive ? "ring-2 ring-emerald-500/20" : ""
                }`}
              >
                <PreviewPanel
                  bundle={bundle}
                  error={error}
                  controlTheme={controlTheme}
                  />
              </div>
            </div>

            <div className={`${cardClass} p-4`}>
              <p
                className={`mb-3 text-xs font-bold uppercase tracking-wider ${subtleTextClass}`}
              >
                Announcement / Info
              </p>

              <input
                type="text"
                value={freeTextTitle}
                onChange={(e) => setFreeTextTitle(e.target.value)}
                placeholder="Optional title"
                className={`${inputClass} mb-3`}
              />

              <textarea
                value={freeTextContent}
                onChange={(e) => setFreeTextContent(e.target.value)}
                placeholder="Type announcement or information to show on output..."
                rows={4}
                className={inputClass}
              />

              <input
                type="text"
                value={freeTextBookmarkLabel}
                onChange={(e) => setFreeTextBookmarkLabel(e.target.value)}
                placeholder="Optional bookmark label"
                className={`${inputClass} mt-3`}
              />

              <div className="mt-3 grid grid-cols-2 gap-2">
                <Button controlTheme={controlTheme}
                  variant="primary"
                  onClick={handleSendFreeText}
                  disabled={!sessionId || !freeTextContent.trim()}
                >
                  Send Info
                </Button>

                <Button controlTheme={controlTheme}
                  onClick={() => void handleBookmarkFreeText()}
                  disabled={!freeTextContent.trim()}
                >
                  Bookmark Info
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <SidePanel
              title="Recent History"
              subtitle=""
              action={
                <button
                  type="button"
                  onClick={() => void handleClearHistory()}
                  className={smallActionClass}
                >
                  Clear
                </button>
              }
              className={sidePanelClass}
              titleClassName={titleTextClass}
              subtitleClassName={subtitleTextClass}
            >
              {history.length === 0 ? (
                <p className={`text-sm ${subtleTextClass}`}>No history yet.</p>
              ) : (
                <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {history.map((item) => (
                    <div
                      key={item.id}
                      className={
                        isLightControlTheme
                          ? "rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                          : "rounded-xl border border-slate-800 bg-slate-950/80 p-2.5"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setReferenceInput(item.reference);
                          void loadPassage(item.reference, {
                            autoSend: true,
                            overrideVersion: (item.version ||
                              version) as BibleVersion,
                            saveHistory: true,
                          });
                        }}
                        className="w-full text-left"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p
                              className={
                                isLightControlTheme
                                  ? "truncate text-sm font-semibold text-slate-900"
                                  : "truncate text-sm font-semibold text-slate-100"
                              }
                            >
                              {item.reference}
                            </p>
                            <p className="mt-1 text-xs text-emerald-400">
                              {item.version || "Unknown version"}
                            </p>
                          </div>
                          <span
                            className={`shrink-0 text-[10px] uppercase tracking-wider ${subtleTextClass}`}
                          >
                            {formatDateTime(item.openedAt)}
                          </span>
                        </div>
                      </button>

                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => void handleDeleteHistoryItem(item.id)}
                          className={
                            isLightControlTheme
                              ? "rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-100"
                              : "rounded-lg border border-slate-700 p-1.5 text-slate-300 transition hover:bg-slate-800"
                          }
                          title="Hide from my history"
                          aria-label="Hide from my history"
                        >
                          <TrashIcon />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SidePanel>

            <SidePanel
              title="Bookmarks"
              subtitle=""
              className={sidePanelClass}
              titleClassName={titleTextClass}
              subtitleClassName={subtitleTextClass}
            >
              {bookmarks.length === 0 ? (
                <p className={`text-sm ${subtleTextClass}`}>No bookmarks yet.</p>
              ) : (
                <div className="max-h-[280px] space-y-2 overflow-y-auto pr-1">
                  {bookmarks.map((item) => (
                    <div
                      key={item.id}
                      className={
                        isLightControlTheme
                          ? "rounded-xl border border-slate-200 bg-slate-50 p-2.5"
                          : "rounded-xl border border-slate-800 bg-slate-950/80 p-2.5"
                      }
                    >
                      <button
                        type="button"
                        onClick={() => handleSelectBookmark(item)}
                        className="w-full text-left"
                      >
                        <p
                          className={
                            isLightControlTheme
                              ? "text-sm font-semibold text-slate-900"
                              : "text-sm font-semibold text-slate-100"
                          }
                        >
                          {item.label || item.reference}
                        </p>
                        <p className="mt-1 text-xs text-blue-400">
                          {(() => {
                            const infoBookmark = readFreeTextBookmarkReference(
                              item.reference,
                            );

                            if (infoBookmark) {
                              return infoBookmark.content
                                ? "Info / Announcement"
                                : "Info / Announcement • older bookmark, content not stored";
                            }

                            return item.label
                              ? item.reference + (item.version ? " • " + item.version : "")
                              : item.version || "Unknown version";
                          })()}
                        </p>
                      </button>

                      <div className="mt-2 flex items-center justify-end gap-2">
                        {editingBookmarkId === item.id ? (
                          <>
                            <input
                              type="text"
                              value={editingBookmarkLabel}
                              onChange={(e) =>
                                setEditingBookmarkLabel(e.target.value)
                              }
                              className={
                                isLightControlTheme
                                  ? "w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 outline-none focus:border-blue-500"
                                  : "w-full rounded-lg border border-slate-700 bg-slate-900 px-2 py-1.5 text-xs text-white outline-none focus:border-blue-500"
                              }
                              placeholder="Bookmark label"
                            />
                            <button
                              type="button"
                              onClick={() => void handleEditBookmarkSave()}
                              className={smallActionClass}
                            >
                              Save
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingBookmarkId(null);
                                setEditingBookmarkLabel("");
                              }}
                              className={smallActionClass}
                            >
                              Cancel
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              onClick={() => handleEditBookmarkStart(item)}
                              className={
                                isLightControlTheme
                                  ? "rounded-lg border border-slate-300 p-1.5 text-slate-600 transition hover:bg-slate-100"
                                  : "rounded-lg border border-slate-700 p-1.5 text-slate-300 transition hover:bg-slate-800"
                              }
                              title="Edit bookmark"
                              aria-label="Edit bookmark"
                            >
                              <PencilIcon />
                            </button>
                            <button
                              type="button"
                              onClick={() => void handleDeleteBookmark(item.id)}
                              className="rounded-lg border border-red-900/60 p-1.5 text-red-300 transition hover:bg-red-950/40"
                              title="Delete bookmark"
                              aria-label="Delete bookmark"
                            >
                              <TrashIcon />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </SidePanel>
          </div>
        </div>
      </div>

      <MobileMenu
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        onOpenSettings={() => setIsSettingsModalOpen(true)}
        onOpenAccount={() => setIsAccountModalOpen(true)}
        onOpenRemote={() => setIsRemoteModalOpen(true)}
        onToggleControlTheme={toggleControlTheme}
        isLightControlTheme={isLightControlTheme}
      />

      <SettingsModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        theme={theme}
        onThemeChange={setTheme}
      />

      <MobileRemoteModal
        isOpen={isRemoteModalOpen}
        onClose={() => setIsRemoteModalOpen(false)}
        remoteUrl={remoteUrl}
      />

      <AccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        userEmail={userEmail}
        isAdmin={isAdmin}
      />
    </main>
  );
}