import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect, useRef } from "react";
import { loadMakeWebhooks } from "@/config/makeWebhooks";

export const Route = createFileRoute("/")({
  component: MinasShowBoxHome,
});

// ─── CONFIGURATION ───────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDPYS2zUzJXZ9Zold_N1EjVCIHLKTH3Cpw",
  authDomain: "minasshow-box.firebaseapp.com",
  projectId: "minasshow-box",
  storageBucket: "minasshow-box.firebasestorage.app",
  messagingSenderId: "194477969451",
  appId: "1:194477969451:web:df3295899d7d6b0e39da6e",
};

const VAPID_KEY =
  "BBVvVafjBHZYL7gK2-SGwRi4GLg2lQurM--ppCPOaS7QHOsdf_yZjQKd_a0SLpl0YT4M7KEGWbxZxThYv72CRjo";

// ─────────────────────────────────────────────────────────────────────────────

type Step = "idle" | "loading" | "success" | "error";

function MinasShowBoxHome() {
  const [step, setStep] = useState<Step>("idle");
  const [qrToken, setQrToken] = useState("");
  const [message, setMessage] = useState("");
  const [isDark, setIsDark] = useState(false);
  const [showIOSInstallModal, setShowIOSInstallModal] = useState(false);
  const [makeAccountLabel, setMakeAccountLabel] = useState<string | null>(null);
  const [makeConfigError, setMakeConfigError] = useState<string | null>(null);
  const makeAccountOverrideRef = useRef<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    setIsDark(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsDark(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  useEffect(() => {
    const q = new URLSearchParams(window.location.search).get("makeAccount");
    makeAccountOverrideRef.current = q?.trim() || null;
    loadMakeWebhooks(makeAccountOverrideRef.current)
      .then((c) => {
        setMakeAccountLabel(c.active);
        setMakeConfigError(null);
      })
      .catch((err: unknown) => {
        setMakeConfigError(
          err instanceof Error ? err.message : "Failed to load Make.com config.",
        );
      });
  }, []);

  const isIOSDevice = () =>
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (navigator.userAgent.includes("Mac") && "ontouchend" in document);

  const isStandaloneMode = () =>
    window.matchMedia("(display-mode: standalone)").matches ||
    Boolean((navigator as Navigator & { standalone?: boolean }).standalone);

  async function runEnableFlow() {
    if (!qrToken.trim()) {
      inputRef.current?.focus();
      setMessage("QR token is required 👋");
      setTimeout(() => setMessage(""), 2500);
      return;
    }

    setStep("loading");
    setMessage("");

    try {
      if (typeof window === "undefined" || !("Notification" in window)) {
        throw new Error(
          "Push notifications are not supported in this browser.",
        );
      }

      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error(
          "This browser does not support service worker push notifications.",
        );
      }

      // 1. Request browser notification permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStep("error");
        setMessage(
          "Notification permission denied. Please allow notifications in your browser settings.",
        );
        return;
      }

      // 2. Register service worker
      const registration = await navigator.serviceWorker.register(
        "/firebase-messaging-sw.js",
      );

      // 3. Dynamically load Firebase SDK and get FCM token
      // In production, replace these CDN imports with your bundled Firebase SDK
      const { initializeApp } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js" as any
      );
      const { getMessaging, getToken } = await import(
        "https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging.js" as any
      );

      const app = initializeApp(FIREBASE_CONFIG);
      const messaging = getMessaging(app);

      const fcmToken = await getToken(messaging, {
        vapidKey: VAPID_KEY,
        serviceWorkerRegistration: registration,
      });

      if (!fcmToken) {
        throw new Error("Failed to get FCM token");
      }

      // 4. Send token + qrToken to register webhook (Make.com)
      const { register: registerWebhook } = await loadMakeWebhooks(
        makeAccountOverrideRef.current,
      );
      const res = await fetch(registerWebhook, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qrToken: qrToken.trim(),
          deviceToken: fcmToken,
          registeredAt: new Date().toISOString(),
        }),
      });

      if (!res.ok) throw new Error(`Webhook returned ${res.status}`);

      setStep("success");
      setMessage(`Notifications enabled successfully`);
    } catch (err: any) {
      console.error(err);
      setStep("error");
      const rawMessage = String(err?.message ?? "");
      const isIOSSupportGap =
        /Notification is not defined|can't find variable: notification/i.test(
          rawMessage,
        );
      setMessage(
        isIOSSupportGap
          ? "This iPhone browser does not support web push here. Use Safari, add this site to Home Screen, then enable notifications from the app icon."
          : err?.message ?? "Something went wrong. Please try again.",
      );
    }
  }

  async function handleEnable() {
    if (typeof window !== "undefined" && isIOSDevice() && !isStandaloneMode()) {
      setShowIOSInstallModal(true);
      return;
    }

    await runEnableFlow();
  }

  async function handleIOSAddedIt() {
    setShowIOSInstallModal(false);
    await runEnableFlow();
  }

  function handleOpenInSafari() {
    // iOS does not provide a reliable script API to force-open Safari from
    // in-app browsers. Opening the current URL in a new tab is the best effort.
    window.open(window.location.href, "_blank", "noopener,noreferrer");
  }

  const canTryAgain = step === "error";

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-gradient-to-br from-amber-50 via-orange-50 to-stone-100 dark:from-stone-950 dark:via-stone-900 dark:to-neutral-950 flex flex-col items-center justify-center px-4 py-12 transition-colors duration-500">
        {/* Decorative top glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-64 bg-amber-300/20 dark:bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Card */}
        <div className="relative w-full max-w-sm bg-white/80 dark:bg-stone-900/80 backdrop-blur-xl rounded-3xl shadow-2xl shadow-amber-900/10 dark:shadow-black/40 border border-white/60 dark:border-stone-700/50 p-8 flex flex-col items-center gap-6 animate-fadeIn">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-400/30 text-4xl select-none">
            💌
          </div>

          {/* Title */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-stone-800 dark:text-stone-100">
              MinasShow Box
            </h1>
            <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">
              Receive anonymous MinasShow notifications 💌
            </p>
          </div>

          {/* Divider */}
          <div className="w-full h-px bg-stone-200 dark:bg-stone-700" />

          {/* Church icon row */}
          <div className="flex items-center gap-3 text-stone-400 dark:text-stone-500 text-xs">
            <span>🕊️</span>
            <span className="flex-1 text-center italic">
              Anonymous • Spiritual • Community
            </span>
            <span>✝️</span>
          </div>

          {step === "success" ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center gap-4 py-4 animate-fadeIn">
              <div className="text-5xl animate-bounce">✅</div>
              <p className="text-center text-stone-700 dark:text-stone-300 font-medium">
                {message}
              </p>
              <p className="text-center text-stone-500 dark:text-stone-400 text-sm">
                You'll be notified when someone leaves a message in your box.
              </p>
            </div>
          ) : (
            /* ── Form state ── */
            <div className="w-full flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-stone-500 dark:text-stone-400 uppercase tracking-wide">
                  QR Token
                </label>
                <input
                  ref={inputRef}
                  type="text"
                  value={qrToken}
                  onChange={(e) => setQrToken(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleEnable()}
                  placeholder="Enter your QR token"
                  disabled={step === "loading" || !!makeConfigError}
                  className="w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white/70 dark:bg-stone-800/70 text-stone-800 dark:text-stone-100 placeholder-stone-400 dark:placeholder-stone-500 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400 dark:focus:ring-amber-500 transition disabled:opacity-50"
                />
              </div>

              {/* Message feedback */}
              {message && (
                <p
                  className={`text-xs text-center px-2 animate-fadeIn ${step === "error" ? "text-red-500" : "text-stone-500 dark:text-stone-400"}`}
                >
                  {message}
                </p>
              )}

              <button
                onClick={
                  canTryAgain
                    ? () => {
                        setStep("idle");
                        setMessage("");
                      }
                    : handleEnable
                }
                disabled={step === "loading" || !!makeConfigError}
                className="w-full py-3.5 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-95 shadow-lg shadow-amber-500/30 transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {step === "loading" ? (
                  <>
                    <Spinner />
                    Enabling…
                  </>
                ) : canTryAgain ? (
                  "Try Again"
                ) : (
                  "🔔 Enable Notifications"
                )}
              </button>

              <p className="text-center text-xs text-stone-400 dark:text-stone-500">
                Notifications are completely anonymous. We never share your
                info.
              </p>
              {makeConfigError && (
                <p className="text-center text-xs text-red-500 px-1">
                  {makeConfigError}
                </p>
              )}
              {makeAccountLabel && !makeConfigError && (
                <p className="text-center text-[11px] text-stone-400 dark:text-stone-500">
                  Make.com account:{" "}
                  <span className="font-medium text-stone-600 dark:text-stone-400">
                    {makeAccountLabel}
                  </span>
                </p>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <p className="mt-8 text-xs text-stone-400 dark:text-stone-600">
          MinasShow Box · Church Community
        </p>
      </div>

      {showIOSInstallModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/45 backdrop-blur-sm px-3 py-3 sm:p-6 animate-fadeIn">
          <div className="w-full max-w-md rounded-3xl border border-white/40 dark:border-stone-700/70 bg-white/95 dark:bg-stone-900/95 shadow-2xl shadow-black/30 p-5 sm:p-6 animate-sheetUp">
            <div className="flex items-center gap-3 mb-3">
              <div className="h-11 w-11 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-xl shadow-md">
                🍎
              </div>
              <div>
                <h2 className="text-base sm:text-lg font-bold text-stone-800 dark:text-stone-100">
                  Enable Notifications on iPhone 🍎
                </h2>
              </div>
            </div>

            <p className="text-sm text-stone-600 dark:text-stone-300 leading-relaxed">
              To receive anonymous message notifications on iPhone, Apple
              requires opening MinasShow Box as a Home Screen app.
            </p>

            <div className="mt-4 space-y-2.5">
              {[
                "Open this website in Safari",
                "Tap the Share button",
                'Tap "Add to Home Screen"',
                "Open the app from your Home Screen",
                'Tap "Enable Notifications"',
              ].map((item, idx) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl bg-stone-100/80 dark:bg-stone-800/70 p-3 animate-fadeIn"
                  style={{ animationDelay: `${idx * 70}ms` }}
                >
                  <div className="mt-0.5 h-6 w-6 shrink-0 rounded-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  <p className="text-sm text-stone-700 dark:text-stone-200">
                    {item}
                  </p>
                </div>
              ))}
            </div>

            <p className="mt-4 text-xs leading-relaxed text-amber-700 dark:text-amber-300 bg-amber-50/90 dark:bg-amber-950/40 border border-amber-200/70 dark:border-amber-900/50 rounded-xl p-3">
              Notifications won't work inside Instagram, WhatsApp, or normal
              browser tabs on iPhone.
            </p>

            <div className="mt-5 flex flex-col sm:flex-row gap-2.5">
              <button
                onClick={handleIOSAddedIt}
                className="flex-1 py-3 rounded-xl font-semibold text-sm text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 active:scale-[0.99] transition-all shadow-lg shadow-amber-500/30"
              >
                I Added It
              </button>
              <button
                onClick={handleOpenInSafari}
                className="flex-1 py-3 rounded-xl font-semibold text-sm border border-stone-300 dark:border-stone-600 text-stone-700 dark:text-stone-200 bg-white/80 dark:bg-stone-800/80 hover:bg-stone-50 dark:hover:bg-stone-800 transition"
              >
                Open in Safari
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes sheetUp {
          from { opacity: 0; transform: translateY(24px) scale(0.98); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn { animation: fadeIn 0.4s ease both; }
        .animate-sheetUp { animation: sheetUp 0.35s ease both; }
      `}</style>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
      />
    </svg>
  );
}
