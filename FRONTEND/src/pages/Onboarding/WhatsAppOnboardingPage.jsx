import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import {
  ShieldCheck,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  Lock,
  Zap,
  AlertCircle,
  RefreshCw,
  Check,
  Loader2,
  CreditCard,
  Clock3,
  ExternalLink,
  LogOut,
} from "lucide-react";
import {
  completeEmbeddedSignup,
  fetchWhatsAppConnectionStatus,
  checkWhatsAppHealth,
  fetchCompanySetupStatus,
} from "../../services/api";
import useAuthStore from "../../store/authStore";
import { Badge, Button, Card, Logo } from "../../components/ui";
import { cn } from "../../utils/cn";


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
  const authSetupStatus = useAuthStore((state) => state.setupStatus);
  const [checkingInitialStatus, setCheckingInitialStatus] = useState(true);
  const [paymentBlocked, setPaymentBlocked] = useState(
    authSetupStatus === "PAYMENT_REQUIRED",
  );
  const [paymentReason, setPaymentReason] = useState("");
  const [checkingPayment, setCheckingPayment] = useState(false);
  const [businessVerificationPending, setBusinessVerificationPending] = useState(false);

  const runPaymentCheck = async () => {
    setCheckingPayment(true);
    try {
      const result = await checkWhatsAppHealth();
      const isBlocked = Boolean(
        result.isBlocked || result.setupStatus === "PAYMENT_REQUIRED",
      );
      setPaymentBlocked(isBlocked);
      setPaymentReason(result.reason || "");
      if (typeof result.needsBusinessVerification === "boolean") {
        setBusinessVerificationPending(result.needsBusinessVerification);
      }
      // Merge in businessId/businessName from the health check — these
      // aren't available right after embedded signup completes, only
      // after this check runs, and the "Add Payment Method" link needs
      // businessId to deep-link to the correct business's payment page.
      if (result.businessId) {
        setConnectedDetails((prev) => ({
          ...prev,
          businessId: result.businessId,
          businessName: result.businessName,
        }));
      }
      if (result.setupStatus) {
        useAuthStore.getState().setSetupStatus(result.setupStatus);
      }
      if (!isBlocked && result.setupStatus === "READY") {
        toast.success("Payment method verified on Meta! Full access unlocked.", {
          id: "payment-verified-toast",
        });
      } else if (isBlocked) {
        toast.error(
          result.reason ||
            "Payment method not found on Meta. Please add a credit/debit card in Meta Business Suite and retry.",
          { id: "payment-not-verified-toast" },
        );
      }
    } catch {
      toast.error(
        "Could not verify payment method with Meta right now. Please try again.",
        { id: "payment-error-toast" },
      );
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
        const wa = data?.whatsapp || data;
        if (data?.connected || wa?.connected) {
          setAlreadyConnected(true);
          setConnectedDetails(wa);
          const isBlocked = Boolean(
            wa.messagingBlocked || data.setupStatus === "PAYMENT_REQUIRED",
          );
          setPaymentBlocked(isBlocked);
          if (wa.messagingBlockedReason) {
            setPaymentReason(wa.messagingBlockedReason);
          }
          if (typeof wa.businessVerificationPending === "boolean") {
            setBusinessVerificationPending(wa.businessVerificationPending);
          }
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
      const isReady =
        result?.setupStatus === "READY" && !result?.messagingBlocked;

      const newSetupStatus = result?.setupStatus || (phoneRegistered && isReady ? "READY" : "PAYMENT_REQUIRED");
      useAuthStore.getState().setSetupStatus(newSetupStatus);

      if (isReady && phoneRegistered) {
        setStatusStage("SUCCESS");
        toast.success("WhatsApp Business Account connected and verified!");
        setTimeout(() => {
          navigate("/dashboard");
        }, 1500);
      } else if (phoneRegistered) {
        // WhatsApp is connected, but Meta payment method is pending
        setStatusStage("");
        setAlreadyConnected(true);
        setConnectedDetails({
          phoneNumberId: result?.phoneNumberId,
          wabaId: result?.wabaId,
          businessId: result?.businessId,
          businessName: result?.businessName,
          connected: true,
        });
        setPaymentBlocked(true);
        if (typeof result?.businessVerificationPending === "boolean") {
          setBusinessVerificationPending(result.businessVerificationPending);
        }
        setPaymentReason(
          result?.messagingBlockedReason ||
            "Add a credit/debit card to your WhatsApp Business Account on Meta before sending messages.",
        );
        toast(
          "WhatsApp connected! Please add a payment method in Meta Business Suite to complete setup.",
          { icon: "💳", duration: 6000 },
        );
      } else {
        // WABA is linked but phone is not registered
        setStatusStage("");
        setAlreadyConnected(true);
        toast(
          "Business account linked. Add and verify a phone number to start sending messages.",
        );
      }
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

  /* ── Derived presentation state for the stepper (display only) ───── */
  const inProgress = Boolean(statusStage && statusStage !== "ERROR");
  const connectStepState = alreadyConnected || statusStage === "SUCCESS" ? "done" : "current";
  const paymentStepState =
    statusStage === "SUCCESS" || (alreadyConnected && !paymentBlocked)
      ? "done"
      : alreadyConnected && paymentBlocked
        ? "current"
        : "upcoming";
  const readyStepState =
    statusStage === "SUCCESS" ? "done" : alreadyConnected && !paymentBlocked ? "current" : "upcoming";

  return (
    <div className="flex min-h-screen flex-col bg-canvas text-ink">
      {/* Top bar */}
      <header className="border-b border-line bg-surface">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Logo />

          <div className="flex items-center gap-3">
            <Badge tone="brand" className="hidden md:inline-flex">
              <ShieldCheck className="h-3.5 w-3.5" />
              Official Meta Cloud API partner
            </Badge>
            <div className="hidden text-right sm:block">
              <p className="text-[14px] font-medium text-ink">{user?.name || user?.email}</p>
              <p className="text-[13px] text-ink-muted">{user?.email}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={LogOut}
              onClick={() => {
                logout();
                navigate("/login");
              }}
            >
              Sign out
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:px-6 sm:py-10">
        {/* Page header */}
        <div className="mb-6">
          <p className="text-[13px] font-medium text-brand-700">Step 2 of 2: WhatsApp connection</p>
          <h1 className="mt-1 text-[28px] font-semibold tracking-[-0.025em] text-ink sm:text-[30px]">
            Connect your WhatsApp Business account
          </h1>
          <p className="mt-1.5 text-[15px] text-ink-muted">
            Link your WhatsApp Business number through Meta. It takes about 2 minutes, then you can send campaigns,
            reply to customers in the shared inbox and set up automated replies.
          </p>
        </div>

        {/* Stepper summary */}
        <ol className="mb-5 grid grid-cols-3 gap-2 rounded-[var(--radius-card)] border border-line bg-surface p-2 shadow-[var(--shadow-card)]">
          <StepperItem number="1" label="Connect WhatsApp" state={connectStepState} />
          <StepperItem number="2" label="Payment method" state={paymentStepState} />
          <StepperItem number="3" label="Ready to go" state={readyStepState} />
        </ol>

        <div className="space-y-4">
          {/* ── Step 1: Connect WhatsApp ───────────────────────────── */}
          <StepCard
            number="1"
            title="Connect WhatsApp"
            description="A secure Meta window opens so you can log in and choose your WhatsApp Business number."
            state={connectStepState}
            statusLabel={
              connectStepState === "done"
                ? "Connected"
                : inProgress
                  ? "Connecting"
                  : statusStage === "ERROR"
                    ? "Not finished"
                    : "To do"
            }
          >
            {alreadyConnected ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  <div>
                    <p className="text-[14px] font-medium text-ink">WhatsApp is already connected</p>
                    <p className="text-[14px] text-ink-muted">
                      Your company account is linked to the WhatsApp Business API.
                    </p>
                    {connectedDetails?.phoneNumberId && (
                      <p className="mt-1 font-mono text-[13px] text-ink-muted">
                        Phone ID: {connectedDetails.phoneNumberId}
                      </p>
                    )}
                  </div>
                </div>
                {!paymentBlocked && (
                  <Button variant="secondary" onClick={() => setAlreadyConnected(false)}>
                    Reconnect number
                  </Button>
                )}
              </div>
            ) : inProgress ? (
              <div className="space-y-4">
                <div className="flex items-start gap-3">
                  {statusStage === "SUCCESS" ? (
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-brand-600" />
                  ) : (
                    <Loader2 className="mt-0.5 h-5 w-5 shrink-0 animate-spin text-brand-600" />
                  )}
                  <div>
                    <p className="text-[15px] font-semibold text-ink">{getStageLabel()}</p>
                    <p className="mt-0.5 text-[14px] text-ink-muted">
                      {statusStage === "SUCCESS"
                        ? "Your WhatsApp Business account is verified and linked to your workspace. Taking you to your dashboard..."
                        : "Please wait. We're confirming your Meta login, finding your WhatsApp number and setting up message delivery."}
                    </p>
                  </div>
                </div>

                {/* Progress segments */}
                <div className="grid grid-cols-4 gap-2">
                  {[
                    { key: "CONNECTING", label: "Meta login" },
                    { key: "PROCESSING", label: "Access granted" },
                    { key: "SAVING", label: "Number setup" },
                    { key: "SUCCESS", label: "Connected" },
                  ].map((step, idx) => {
                    const stepOrder = ["CONNECTING", "PROCESSING", "SAVING", "SUCCESS"];
                    const currentIdx = stepOrder.indexOf(statusStage);
                    const isDone = currentIdx >= idx;
                    const isCurrent = statusStage === step.key;

                    return (
                      <div key={step.key} className="flex flex-col gap-1.5">
                        <div
                          className={cn(
                            "h-1.5 w-full rounded-full transition-colors duration-300",
                            isDone ? "bg-brand-600" : isCurrent ? "bg-brand-300" : "bg-[#eceeed]",
                          )}
                        />
                        <span className={cn("text-[12px]", isDone ? "font-medium text-brand-700" : "text-ink-muted")}>
                          {step.label}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Error box */}
                {statusStage === "ERROR" && errorMessage && (
                  <div className="flex items-start gap-3 rounded-xl border border-danger/20 bg-danger-soft p-4">
                    <AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                    <div className="space-y-1">
                      <p className="text-[14px] font-semibold text-danger">The connection didn&apos;t finish</p>
                      <p className="text-[14px] text-ink">{errorMessage}</p>
                      <p className="text-[13px] text-ink-muted">
                        What to do: click &quot;Try again&quot; below and complete every screen in the Meta window
                        without closing it.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    size="lg"
                    onClick={handleConnectWhatsApp}
                    disabled={connecting || checkingInitialStatus}
                    loading={connecting}
                    leftIcon={!connecting && statusStage === "ERROR" ? RefreshCw : WhatsAppIcon}
                    rightIcon={!connecting && statusStage !== "ERROR" ? ArrowRight : undefined}
                    className="w-full sm:w-auto"
                  >
                    {connecting
                      ? "Opening Meta window..."
                      : statusStage === "ERROR"
                        ? "Try again with Meta"
                        : "Connect WhatsApp with Meta"}
                  </Button>
                  {checkingInitialStatus && (
                    <span className="text-[13px] text-ink-muted">Checking your current connection...</span>
                  )}
                </div>
              </div>
            )}
          </StepCard>

          {/* ── Step 2: Payment method ─────────────────────────────── */}
          <StepCard
            number="2"
            title="Add a payment method in Meta"
            description="Meta needs a credit or debit card on your WhatsApp Business account before you can send messages."
            state={paymentStepState}
            statusLabel={
              paymentStepState === "done" ? "Done" : paymentStepState === "current" ? "Action needed" : "After step 1"
            }
          >
            {alreadyConnected && paymentBlocked && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 rounded-xl border border-warning/20 bg-warning-soft p-4">
                  <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                  <div>
                    <p className="text-[14px] font-semibold text-ink">Payment method required</p>
                    <p className="mt-0.5 text-[14px] text-ink">
                      {paymentReason ||
                        "Add a payment method to your WhatsApp Business Account before you can start sending messages."}
                    </p>
                    <p className="mt-1 text-[13px] text-ink-muted">
                      What to do: open Meta, add a card, then come back and click &quot;I&apos;ve added it, check
                      again&quot;.
                    </p>
                  </div>
                </div>

                {businessVerificationPending && (
                  <div className="flex items-start gap-3 rounded-xl border border-info/20 bg-info-soft p-4">
                    <Clock3 className="mt-0.5 h-5 w-5 shrink-0 text-info" />
                    <div>
                      <p className="text-[14px] font-semibold text-ink">Meta business verification in progress</p>
                      <p className="mt-0.5 text-[14px] text-ink-muted">
                        Meta is still verifying your business. Until it finishes, Meta may limit how many messages you
                        can send.
                      </p>
                    </div>
                  </div>
                )}

                <div className="flex flex-col gap-3 sm:flex-row">
                  <a
                    href={
                      connectedDetails?.wabaId && connectedDetails?.businessId
                        ? `https://business.facebook.com/latest/billing_hub/accounts/details/?asset_id=${connectedDetails.wabaId}&business_id=${connectedDetails.businessId}&placement=BILLING_HUB`
                        : "https://business.facebook.com/billing_hub/payment_methods"
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-brand-900 px-6 font-display text-[15px] font-medium text-white shadow-[0_1px_2px_rgba(11,59,46,0.2)] transition-colors hover:bg-brand-800"
                  >
                    Add payment method in Meta
                    <ExternalLink className="h-4 w-4" />
                  </a>
                  <Button
                    size="lg"
                    variant="secondary"
                    onClick={runPaymentCheck}
                    disabled={checkingPayment}
                    loading={checkingPayment}
                    leftIcon={RefreshCw}
                  >
                    {checkingPayment ? "Checking…" : "I've added it, check again"}
                  </Button>
                </div>
              </div>
            )}
          </StepCard>

          {/* ── Step 3: Ready ──────────────────────────────────────── */}
          <StepCard
            number="3"
            title="Start using Wagenius"
            description="Once WhatsApp and payment are set up, your full dashboard unlocks."
            state={readyStepState}
            statusLabel={readyStepState === "done" ? "Done" : readyStepState === "current" ? "Ready" : "Locked"}
          >
            {alreadyConnected && !paymentBlocked && (
              <Button
                size="lg"
                rightIcon={ArrowRight}
                className="w-full sm:w-auto"
                onClick={async () => {
                  try {
                    const data = await fetchCompanySetupStatus();
                    if (data?.setupStatus) {
                      useAuthStore.getState().setSetupStatus(data.setupStatus);
                      if (data.setupStatus === "PAYMENT_REQUIRED") {
                        setPaymentBlocked(true);
                        toast.error("Payment method required on Meta before accessing dashboard.");
                        return;
                      }
                    }
                  } catch {
                    // fall through
                  }
                  navigate("/dashboard");
                }}
              >
                Go to dashboard
              </Button>
            )}
          </StepCard>

          {/* Why it's safe */}
          <Card>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              <Benefit
                icon={CheckCircle2}
                title="Direct Meta connection"
                text="Official connection with no extra fee or middleman charges."
              />
              <Benefit
                icon={Zap}
                title="Templates sync automatically"
                text="Your approved Meta message templates appear in Wagenius right away."
              />
              <Benefit
                icon={Lock}
                title="Secure login"
                text="You sign in directly with Meta. Your access is stored encrypted."
              />
            </div>

            <div className="mt-5 flex flex-col items-start justify-between gap-3 border-t border-line pt-4 sm:flex-row sm:items-center">
              <span className="inline-flex items-center gap-2 text-[13px] text-ink-muted">
                <Lock className="h-3.5 w-3.5 text-brand-600" />
                Official Graph API v23.0, Meta verified Embedded Signup
              </span>
              <Button variant="ghost" size="sm" leftIcon={ArrowLeft} onClick={() => navigate("/billing")}>
                Review plan and billing
              </Button>
            </div>
          </Card>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-line">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center justify-between gap-3 px-4 py-5 text-[13px] text-ink-muted sm:flex-row sm:px-6">
          <p>© 2026 Wagenius. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="/privacy-policy" className="transition hover:text-ink">
              Privacy policy
            </a>
            <a href="/data-deletion" className="transition hover:text-ink">
              Data deletion
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}

/* ── Presentational building blocks ──────────────────────────────────── */

function WhatsAppIcon({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-5.805 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
  );
}

function StepMarker({ number, state }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold tabular-nums",
        state === "done" && "bg-brand-600 text-white",
        state === "current" && "bg-brand-900 text-white",
        state === "upcoming" && "border border-line-strong bg-surface text-ink-muted",
      )}
    >
      {state === "done" ? <Check className="h-4 w-4 stroke-[2.5]" /> : number}
    </span>
  );
}

function StepperItem({ number, label, state }) {
  return (
    <li
      className={cn(
        "flex min-w-0 items-center gap-2.5 rounded-xl px-2.5 py-2 sm:px-3",
        state === "current" && "bg-brand-50",
      )}
      aria-current={state === "current" ? "step" : undefined}
    >
      <StepMarker number={number} state={state} />
      <span
        className={cn(
          "min-w-0 truncate text-[13px] sm:text-[14px]",
          state === "upcoming" ? "text-ink-muted" : "font-medium text-ink",
        )}
      >
        {label}
      </span>
    </li>
  );
}

function StepCard({ number, title, description, state, statusLabel, children }) {
  const hasBody = Boolean(children) && children !== false;
  return (
    <Card className={cn(state === "current" && "border-brand-600 ring-4 ring-brand-600/10")}>
      <div className="flex items-start gap-4">
        <StepMarker number={number} state={state} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className={cn("text-[17px] font-semibold", state === "upcoming" ? "text-ink-muted" : "text-ink")}>
              {title}
            </h2>
            <Badge tone={state === "done" ? "brand" : state === "current" ? "dark" : "neutral"} dot={state !== "current"}>
              {statusLabel}
            </Badge>
          </div>
          <p className="mt-1 text-[14px] text-ink-muted">{description}</p>
          {hasBody && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </Card>
  );
}

function Benefit({ icon: Icon, title, text }) {
  return (
    <div>
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-brand-600" />
        <h3 className="text-[14px] font-semibold text-ink">{title}</h3>
      </div>
      <p className="mt-1 text-[14px] text-ink-muted">{text}</p>
    </div>
  );
}
