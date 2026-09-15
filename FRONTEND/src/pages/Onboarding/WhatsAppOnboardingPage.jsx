import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ShieldCheck,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  Lock,
  Zap,
  AlertCircle,
  RefreshCw,
  Check,
} from "lucide-react";
import {
  completeEmbeddedSignup,
  fetchWhatsAppConnectionStatus,
  checkWhatsAppHealth,
  fetchCompanySetupStatus,
} from "../../services/api";
import useAuthStore from "../../store/authStore";


const META_APP_ID = import.meta.env.VITE_META_APP_ID;
const META_CONFIG_ID = import.meta.env.VITE_META_CONFIG_ID;

export default function WhatsAppOnboardingPage() {
  const navigate = useNavigate();
  const { user, logout } = useAuthStore();
  const [connecting, setConnecting] = useState(false);
  const [statusStage, setStatusStage] = useState(""); // "" | "CONNECTING" | "PROCESSING" | "SAVING" | "SUCCESS" | "ERROR"
  const [errorMessage, setErrorMessage] = useState("");
  const [alreadyConnected, setAlreadyConnected] = useState(false);
  const [connectedDetails, setConnectedDetails] = useState(null);
  const [checkingInitialStatus, setCheckingInitialStatus] = useState(true);
  const [paymentBlocked, setPaymentBlocked] = useState(false);
  const [paymentReason, setPaymentReason] = useState("");
  const [checkingPayment, setCheckingPayment] = useState(false);

  const runPaymentCheck = async () => {
    setCheckingPayment(true);
    try {
      const result = await checkWhatsAppHealth();
      setPaymentBlocked(Boolean(result.isBlocked));
      setPaymentReason(result.reason || "");
    } catch {
      // If the check itself fails, don't falsely claim payment is fine —
      // but also don't hard-fail the page. Leave paymentBlocked as-is.
    } finally {
      setCheckingPayment(false);
    }
  };

  // Stashes WABA ID / Phone Number ID from WA_EMBEDDED_SIGNUP postMessage
  const metaSessionRef = useRef({ wabaId: "", phoneNumberId: "" });

  // 1. Check if the company is already connected on mount
  useEffect(() => {
    async function checkCurrentStatus() {
      try {
        const data = await fetchWhatsAppConnectionStatus();
        if (data?.connected || data?.whatsapp?.connected) {
          setAlreadyConnected(true);
          setConnectedDetails(data.whatsapp || data);
          runPaymentCheck();
        }
      } catch (err) {
        console.warn(
          "[Onboarding] Could not fetch initial WhatsApp status:",
          err,
        );
      } finally {
        setCheckingInitialStatus(false);
      }
    }

    checkCurrentStatus();
  }, []);

  // 2. Load Meta/Facebook SDK and setup postMessage listener
  useEffect(() => {
    window.fbAsyncInit = function () {
      if (window.FB && META_APP_ID) {
        window.FB.init({
          appId: META_APP_ID,
          cookie: true,
          xfbml: true,
          version: "v23.0",
        });
      }
    };

    if (!document.getElementById("facebook-jssdk")) {
      const script = document.createElement("script");
      script.id = "facebook-jssdk";
      script.src = "https://connect.facebook.net/en_US/sdk.js";
      script.async = true;
      script.defer = true;
      script.crossOrigin = "anonymous";
      document.body.appendChild(script);
    }

    // Receive Embedded Signup session information
    const handleMessage = (event) => {
      if (
        event.origin !== "https://www.facebook.com" &&
        event.origin !== "https://web.facebook.com"
      ) {
        return;
      }

      try {
        const data =
          typeof event.data === "string" ? JSON.parse(event.data) : event.data;

        if (data?.type === "WA_EMBEDDED_SIGNUP") {
          console.log(
            "[EmbeddedSignup] Event received:",
            data.event,
            data.data,
          );

          if (data.event === "FINISH" && data.data) {
            if (data.data.waba_id) {
              metaSessionRef.current.wabaId = String(data.data.waba_id);
            }
            if (data.data.phone_number_id) {
              metaSessionRef.current.phoneNumberId = String(
                data.data.phone_number_id,
              );
            }
          } else if (data.event === "CANCEL") {
            setConnecting(false);
            if (statusStage !== "SAVING" && statusStage !== "SUCCESS") {
              setStatusStage("");
            }
            toast("Meta setup was closed or cancelled");
          } else if (data.event === "ERROR") {
            setConnecting(false);
            setStatusStage("ERROR");
            setErrorMessage(
              data.data?.error_message ||
                "Meta Embedded Signup encountered an error.",
            );
          }
        }
      } catch {
        // Ignore non-JSON messages
      }
    };

    window.addEventListener("message", handleMessage);

    return () => {
      window.removeEventListener("message", handleMessage);
    };
  }, [statusStage]);

  const handleMetaLoginResponse = async (response) => {
    setConnecting(false);
    console.log("[EmbeddedSignup] Meta dialog response:", response);

    const authCode = response?.authResponse?.code;

    if (!authCode) {
      // Check if cancelled or error
      if (response?.status === "not_authorized") {
        setStatusStage("ERROR");
        setErrorMessage(
          "Authorization was denied. Please grant the required permissions in the Meta dialog.",
        );
      } else if (statusStage !== "SUCCESS") {
        setStatusStage("ERROR");
        setErrorMessage(
          "Setup was cancelled or closed before completion. Please try again.",
        );
      }
      return;
    }

    // We received the Meta authorization code!
    console.log(
      "[EmbeddedSignup] Received authorization code. Beginning backend exchange...",
    );

    try {
      setStatusStage("CONNECTING");

      // Visual transition to processing stage
      await new Promise((resolve) => setTimeout(resolve, 600));
      setStatusStage("PROCESSING");

      await new Promise((resolve) => setTimeout(resolve, 500));
      setStatusStage("SAVING");

      // Send code and optional session hints to Wagenius backend
      const result = await completeEmbeddedSignup({
        code: authCode,
        wabaId: metaSessionRef.current.wabaId || undefined,
        phoneNumberId: metaSessionRef.current.phoneNumberId || undefined,
      });

      console.log(
        "[EmbeddedSignup] Backend successfully connected WhatsApp:",
        result,
      );

      const phoneRegistered = result?.phoneStatus === "registered";

      useAuthStore
        .getState()
        .setSetupStatus(phoneRegistered ? "READY" : "WHATSAPP_ONBOARDING_REQUIRED");
      setStatusStage("SUCCESS");

      if (phoneRegistered) {
        toast.success("WhatsApp Business Account connected successfully!");
      } else {
        // WABA is linked but no phone number was added/verified yet —
        // don't claim the integration is fully ready to send messages.
        toast(
          "Business account linked. Add and verify a phone number to start sending messages.",
        );
      }

      // Wait briefly so user sees the success confirmation before navigation
      setTimeout(() => {
        navigate(phoneRegistered ? "/dashboard" : "/onboarding/whatsapp");
      }, 1500);
    } catch (error) {
      console.error(
        "[EmbeddedSignup] Error during backend exchange:",
        error,
      );
      setStatusStage("ERROR");
      const msg =
        error.response?.data?.message ||
        error.message ||
        "Failed to complete WhatsApp connection. Please verify your Meta Business details and try again.";
      setErrorMessage(msg);
      toast.error(msg);
    }
  };

  const handleConnectWhatsApp = () => {
    if (!window.FB) {
      console.error("Meta SDK is not loaded yet.");
      toast.error(
        "WhatsApp setup is still initializing. Please wait a few seconds and try again.",
      );
      return;
    }

    if (!META_CONFIG_ID) {
      console.error("VITE_META_CONFIG_ID is not configured in environment.");
      toast.error(
        "Meta configuration is missing. Please contact platform support.",
      );
      return;
    }

    setErrorMessage("");
    setStatusStage("");
    setConnecting(true);

    window.FB.login(
      (response) => {
        void handleMetaLoginResponse(response);
      },
      {
        config_id: META_CONFIG_ID,
        response_type: "code",
        override_default_response_type: true,
        extras: {
          version: "v4",
          sessionInfoVersion: "3",
        },
      },
    );
  };

  const getStageLabel = () => {
    switch (statusStage) {
      case "CONNECTING":
        return "Connecting WhatsApp...";
      case "PROCESSING":
        return "Completing setup with Meta...";
      case "SAVING":
        return "Saving WhatsApp account & configuring webhooks...";
      case "SUCCESS":
        return "WhatsApp Connected Successfully!";
      default:
        return "";
    }
  };

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-slate-900 flex flex-col justify-between">
      {/* Top Navbar */}
      <header className="max-w-5xl w-full mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="h-9 w-9 rounded-xl bg-slate-950 flex items-center justify-center shadow-sm font-black text-white text-xs tracking-wider">
            WA
          </div>
          <span className="font-bold text-lg tracking-tight text-slate-900">
            WA GENIUS
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-xs font-semibold text-emerald-700">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Official Meta Cloud API Partner</span>
          </div>
          <div className="text-right hidden sm:block">
            <p className="text-xs font-semibold text-slate-800">{user?.name || user?.email}</p>
            <p className="text-[11px] text-slate-500">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              logout();
              navigate("/login");
            }}
            className="text-xs font-semibold text-slate-700 hover:text-red-700 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 shadow-sm transition"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl w-full mx-auto px-6 py-4 sm:py-8 flex-1 flex flex-col justify-center">
        {/* Header Title */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-8">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            <span>Step 2 of 2 • WhatsApp Business Connection</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
            Connect your WhatsApp Business account
          </h1>
          <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
            Connect your WhatsApp Business number directly through Meta in under
            2 minutes to start launching campaigns, automated bots, and shared
            inboxes.
          </p>
        </div>

        {/* Central Card */}
        <div className="rounded-3xl border border-slate-200 bg-white p-7 sm:p-10 shadow-sm space-y-8">
          {/* Action Box */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-6 sm:p-8 text-center space-y-5">
            {/* Status: Already Connected */}
            {alreadyConnected ? (
              <div className="space-y-4 py-2">
                <div
                  className={`mx-auto h-16 w-16 rounded-2xl flex items-center justify-center shadow-lg text-white ${
                    paymentBlocked
                      ? "bg-amber-500 shadow-amber-500/20"
                      : "bg-emerald-600 shadow-emerald-600/20"
                  }`}
                >
                  <CheckCircle2 className="h-9 w-9" />
                </div>
                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-slate-900">
                    WhatsApp is Already Connected
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    Your company account is already linked to WhatsApp Business
                    API.
                    {connectedDetails?.phoneNumberId && (
                      <span className="block mt-1 text-slate-600 font-mono text-xs">
                        Phone ID: {connectedDetails.phoneNumberId}
                      </span>
                    )}
                  </p>
                </div>

                {paymentBlocked ? (
                  <div className="mx-auto max-w-md space-y-3">
                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-left">
                      <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                        Payment Method Required
                      </p>
                      <p className="mt-1 text-xs sm:text-sm text-amber-900/90">
                        {paymentReason ||
                          "Add a payment method to your WhatsApp Business Account before you can start sending messages."}
                      </p>
                    </div>
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                      <a
                        href="https://business.facebook.com/billing_hub/payment_methods"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full sm:w-auto min-w-[200px] py-3 px-6 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                      >
                        <span>Add Payment Method</span>
                        <ArrowRight className="h-4 w-4" />
                      </a>
                      <button
                        type="button"
                        onClick={runPaymentCheck}
                        disabled={checkingPayment}
                        className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition text-center disabled:opacity-60"
                      >
                        {checkingPayment ? "Checking…" : "I've added it — Recheck"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={async () => {
                        // Always re-verify with the server instead of
                        // trusting a hardcoded "READY" — the server is the
                        // only source of truth for whether payment is
                        // actually set up, and this button must not be able
                        // to bypass that check.
                        try {
                          const data = await fetchCompanySetupStatus();
                          if (data?.setupStatus) {
                            useAuthStore.getState().setSetupStatus(data.setupStatus);
                          }
                        } catch {
                          // fall through — ProtectedRoute will re-verify on
                          // navigation anyway if this fetch fails
                        }
                        navigate("/dashboard");
                      }}
                      className="w-full sm:w-auto min-w-[200px] py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs sm:text-sm shadow-sm transition-all flex items-center justify-center gap-2"
                    >
                      <span>Go to Dashboard</span>
                      <ArrowRight className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setAlreadyConnected(false)}
                      className="w-full sm:w-auto py-3 px-5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-semibold text-xs sm:text-sm transition text-center"
                    >
                      Reconnect Number
                    </button>
                  </div>
                )}
              </div>
            ) : statusStage && statusStage !== "ERROR" ? (
              /* Status: Active In-Progress Stages */
              <div className="space-y-6 py-4">
                <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20 text-white">
                  {statusStage === "SUCCESS" ? (
                    <Check className="h-9 w-9 stroke-[3]" />
                  ) : (
                    <div className="h-8 w-8 border-3 border-white/30 border-t-white rounded-full animate-spin" />
                  )}
                </div>

                <div className="space-y-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    {getStageLabel()}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    {statusStage === "SUCCESS"
                      ? "Your WhatsApp Business account has been verified, encrypted, and linked to your company workspace. Redirecting..."
                      : "Please wait while we exchange Meta authorization tokens, discover your WABA and phone numbers, and register your webhooks."}
                  </p>
                </div>

                {/* Stepper indicators */}
                <div className="max-w-md mx-auto pt-2 grid grid-cols-4 gap-2">
                  {[
                    { key: "CONNECTING", label: "Auth Code" },
                    { key: "PROCESSING", label: "Meta Token" },
                    { key: "SAVING", label: "WABA Setup" },
                    { key: "SUCCESS", label: "Connected" },
                  ].map((step, idx) => {
                    const stepOrder = [
                      "CONNECTING",
                      "PROCESSING",
                      "SAVING",
                      "SUCCESS",
                    ];
                    const currentIdx = stepOrder.indexOf(statusStage);
                    const isDone = currentIdx >= idx;
                    const isCurrent = statusStage === step.key;

                    return (
                      <div
                        key={step.key}
                        className="flex flex-col items-center gap-1.5"
                      >
                        <div
                          className={`h-2 w-full rounded-full transition-all duration-300 ${
                            isDone
                              ? "bg-emerald-600"
                              : isCurrent
                                ? "bg-emerald-400 animate-pulse"
                                : "bg-slate-200"
                          }`}
                        />
                        <span
                          className={`text-[10px] font-medium ${
                            isDone
                              ? "text-emerald-700 font-semibold"
                              : "text-slate-400"
                          }`}
                        >
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              /* Status: Idle or Error (Ready to Connect) */
              <>
                <div className="mx-auto h-16 w-16 rounded-2xl bg-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-600/20">
                  <svg className="h-9 w-9 fill-white" viewBox="0 0 24 24">
                    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
                  </svg>
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-xl font-bold text-slate-900">
                    Official WhatsApp Business Connection
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
                    A secure Meta dialog window will open to authenticate and
                    link your WhatsApp Business number.
                  </p>
                </div>

                {/* Error Banner */}
                {statusStage === "ERROR" && errorMessage && (
                  <div className="max-w-md mx-auto p-4 rounded-xl border border-red-200 bg-red-50/80 text-left flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                    <div className="space-y-1 text-xs">
                      <p className="font-semibold text-red-900">
                        Connection Incomplete
                      </p>
                      <p className="text-red-700 leading-relaxed">
                        {errorMessage}
                      </p>
                    </div>
                  </div>
                )}

                <div className="pt-2 flex items-center justify-center">
                  <button
                    type="button"
                    onClick={handleConnectWhatsApp}
                    disabled={connecting || checkingInitialStatus}
                    className="w-full sm:w-auto min-w-[240px] py-3.5 px-7 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {connecting ? (
                      <>
                        <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Opening Meta Dialog...</span>
                      </>
                    ) : statusStage === "ERROR" ? (
                      <>
                        <RefreshCw className="h-4 w-4" />
                        <span>Try Again via Meta</span>
                      </>
                    ) : (
                      <>
                        <span>Connect WhatsApp via Meta</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Benefits Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <h3 className="text-xs font-bold text-slate-900">
                  Direct Meta Cloud API
                </h3>
              </div>
              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                Direct official connection with 0% extra fee or middleman
                charges.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-amber-500" />
                <h3 className="text-xs font-bold text-slate-900">
                  Auto Template Sync
                </h3>
              </div>
              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                All approved Meta message templates sync into your workspace
                instantly.
              </p>
            </div>

            <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 space-y-2">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-blue-500" />
                <h3 className="text-xs font-bold text-slate-900">
                  End-to-End Secure
                </h3>
              </div>
              <p className="text-[11.5px] text-slate-500 leading-relaxed">
                Authenticated directly via Meta OAuth 2.0 with token-based
                encryption.
              </p>
            </div>
          </div>

          {/* Security & Info Footer */}
          <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>
                Official Graph API v23.0 • Meta Verified Embedded Signup
              </span>
            </div>
            <button
              type="button"
              onClick={() => navigate("/billing")}
              className="text-slate-500 hover:text-slate-800 font-medium hover:underline flex items-center gap-1"
            >
              ← Review Plan & Billing
            </button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-5xl w-full mx-auto px-6 py-6 border-t border-slate-200/60 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <p>© 2026 WA GENIUS. All rights reserved.</p>
        <div className="flex items-center gap-4">
          <a href="/privacy-policy" className="hover:text-slate-700 transition">
            Privacy Policy
          </a>
          <span>•</span>
          <a href="/data-deletion" className="hover:text-slate-700 transition">
            Data Deletion
          </a>
        </div>
      </footer>
    </div>
  );
}
