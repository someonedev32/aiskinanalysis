import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Zap, Shield, Crown, Rocket, ArrowRight, Star } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_ICONS = {
  trial: Zap,
  starter: Shield,
  professional: Crown,
  enterprise: Rocket,
  enterprise_plus: Star,
};

const ALL_PLANS = ["trial", "starter", "professional", "enterprise", "enterprise_plus"];

export default function Billing() {
  const [plans, setPlans] = useState({});
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const shopDomain = new URLSearchParams(window.location.search).get("shop") || "demo-store.myshopify.com";

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [plansRes, statusRes] = await Promise.all([
          axios.get(`${API}/billing/plans`),
          axios.get(`${API}/billing/status/${shopDomain}`).catch(() => null),
        ]);
        setPlans(plansRes.data.plans || {});
        if (statusRes) setBillingStatus(statusRes.data);
      } catch (err) {
        console.error("Billing fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [shopDomain]);

  const handleSubscribe = async (planId) => {
    try {
      const res = await axios.post(`${API}/billing/subscribe`, {
        shop_domain: shopDomain,
        plan_id: planId,
      });
      if (res.data.confirmation_url) {
        window.open(res.data.confirmation_url, "_blank");
      } else {
        toast.success("Subscription created. Confirm in Shopify admin.");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create subscription");
    }
  };

  const handleCancel = async () => {
    try {
      await axios.post(`${API}/billing/cancel`, {
        shop_domain: shopDomain,
        plan_id: billingStatus?.plan || "",
      });
      toast.success("Subscription cancelled");
      setBillingStatus((prev) => ({ ...prev, billing_status: "cancelled", plan: null }));
    } catch (err) {
      toast.error("Failed to cancel subscription");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="billing-loading">
        <div className="h-8 w-40 bg-[#F2F0EB] rounded-lg animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="h-80 bg-white rounded-xl border border-[#E4E4E7] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currentPlan = billingStatus?.plan;
  const scanUsage = billingStatus ? Math.round((billingStatus.scan_count / (billingStatus.scan_limit || 1)) * 100) : 0;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in" data-testid="billing-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Billing</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Manage your subscription and billing</p>
      </div>

      {/* Current Status */}
      {billingStatus && billingStatus.plan && (
        <Card className="p-4 sm:p-5 border-[#E4E4E7]" data-testid="billing-status-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F2F0EB] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#4A6C58]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {billingStatus.plan_info?.name || "No Plan"}
                </p>
                <p className="text-xs text-[#A1A1AA]">
                  {billingStatus.scan_count} / {billingStatus.scan_limit} scans used
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Progress value={scanUsage} className="w-24 h-2 bg-[#F2F0EB] hidden sm:block" />
              <Badge
                className={
                  billingStatus.billing_status === "active"
                    ? "bg-[#3F6212]/10 text-[#3F6212] border-0"
                    : "bg-[#F2F0EB] text-[#52525B] border-0"
                }
                data-testid="billing-status-badge"
              >
                {billingStatus.billing_status || "inactive"}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        {ALL_PLANS.filter(id => plans[id]).map((id) => {
          const plan = plans[id];
          const PlanIcon = PLAN_ICONS[id] || Zap;
          const isCurrentPlan = currentPlan === id;
          const isPopular = id === "professional";
          const isTrial = id === "trial";
          const isPlus = id === "enterprise_plus";

          return (
            <Card
              key={id}
              className={`p-4 border-2 transition-all duration-300 relative overflow-hidden flex flex-col ${
                isPopular
                  ? "border-[#4A6C58] shadow-[0_8px_20px_rgba(74,108,88,0.12)]"
                  : isPlus
                  ? "border-[#D4A373] shadow-[0_8px_20px_rgba(212,163,115,0.12)]"
                  : "border-[#E4E4E7] hover:border-[#4A6C58]/30"
              }`}
              data-testid={`plan-card-${id}`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0">
                  <Badge className="bg-[#D4A373] text-white border-0 rounded-none rounded-bl-lg text-[9px] px-2 py-0.5">
                    POPULAR
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div
                  className={`w-7 h-7 rounded-md flex items-center justify-center ${
                    isPopular ? "bg-[#4A6C58]" : isPlus ? "bg-[#D4A373]" : "bg-[#F2F0EB]"
                  }`}
                >
                  <PlanIcon
                    className={`w-3.5 h-3.5 ${isPopular || isPlus ? "text-white" : "text-[#4A6C58]"}`}
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h3 className="text-xs font-semibold text-[#1A1A1A]">{plan.name}</h3>
                  {isTrial && <p className="text-[9px] text-[#D4A373] font-medium">3-day trial</p>}
                </div>
              </div>

              <div className="flex items-end gap-0.5 mb-3">
                {isTrial ? (
                  <span className="text-xl sm:text-2xl font-bold text-[#1A1A1A] font-[Manrope]">Free</span>
                ) : (
                  <>
                    <span className="text-xl sm:text-2xl font-bold text-[#1A1A1A] font-[Manrope]">
                      ${plan.price}
                    </span>
                    <span className="text-[10px] text-[#A1A1AA] mb-0.5">/mo</span>
                  </>
                )}
              </div>

              <ul className="space-y-1.5 mb-4 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-1.5 text-[11px] text-[#52525B]">
                    <Check className="w-3 h-3 text-[#4A6C58] flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <div className="space-y-1.5 mt-auto">
                  <Button
                    disabled
                    className="w-full bg-[#F2F0EB] text-[#4A6C58] cursor-default text-[11px] h-8"
                    data-testid={`plan-current-${id}`}
                  >
                    Current Plan
                  </Button>
                  {!isTrial && (
                    <Button
                      variant="ghost"
                      onClick={handleCancel}
                      className="w-full text-[#991B1B] hover:bg-red-50 text-[10px] h-6"
                      data-testid={`plan-cancel-${id}`}
                    >
                      Cancel
                    </Button>
                  )}
                </div>
              ) : (
                <Button
                  onClick={() => handleSubscribe(id)}
                  className={`w-full mt-auto text-[11px] h-8 ${
                    isPopular
                      ? "bg-[#4A6C58] hover:bg-[#3D5A49] text-white"
                      : isPlus
                      ? "bg-[#D4A373] hover:bg-[#C49363] text-white"
                      : "bg-white border border-[#4A6C58] text-[#4A6C58] hover:bg-[#F2F0EB]"
                  }`}
                  data-testid={`plan-subscribe-${id}`}
                >
                  {isTrial ? "Start Trial" : "Subscribe"}
                  <ArrowRight className="w-3 h-3 ml-1" strokeWidth={1.5} />
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card className="p-3 sm:p-4 border-[#E4E4E7] bg-[#F9FAFB]" data-testid="billing-info">
        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
          Free trial lasts 3 days with a maximum of 10 scans. Annual plans save 10% and double your scan credits.
          Billing is managed through Shopify's recurring subscription system.
          Quotas reset monthly. Upgrade, downgrade, or cancel at any time.
          Need more? Contact us at support@inovation.app
        </p>
      </Card>
    </div>
  );
}
