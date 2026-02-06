import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Zap, ArrowRight, Crown, Rocket } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_ICONS = { start: Zap, plus: Crown, growth: Rocket };
const PLAN_ORDER = ["start", "plus", "growth"];

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
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-96 bg-white rounded-xl border border-[#E4E4E7] animate-pulse" />
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
                  {billingStatus.scan_count} / {billingStatus.scan_limit} analysis used
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

      {/* Trial Banner */}
      <Card className="p-4 border-[#4A6C58]/20 bg-[#4A6C58]/5" data-testid="trial-banner">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-[#4A6C58]" strokeWidth={1.5} />
          <p className="text-sm text-[#1A1A1A] font-medium">
            You have a 3-day free trial on all plans
          </p>
        </div>
      </Card>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {PLAN_ORDER.filter(id => plans[id]).map((id) => {
          const plan = plans[id];
          const PlanIcon = PLAN_ICONS[id] || Zap;
          const isCurrentPlan = currentPlan === id;
          const isPopular = id === "plus";

          return (
            <Card
              key={id}
              className={`p-5 sm:p-6 border-2 transition-all duration-300 relative overflow-hidden flex flex-col ${
                isPopular
                  ? "border-[#4A6C58] shadow-[0_12px_24px_rgba(74,108,88,0.15)]"
                  : "border-[#E4E4E7] hover:border-[#4A6C58]/30"
              }`}
              data-testid={`plan-card-${id}`}
            >
              {isPopular && (
                <div className="absolute top-0 right-0">
                  <Badge className="bg-[#D4A373] text-white border-0 rounded-none rounded-bl-lg text-[10px] px-2.5 py-1">
                    POPULAR
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isPopular ? "bg-[#4A6C58]" : "bg-[#F2F0EB]"
                  }`}
                >
                  <PlanIcon
                    className={`w-4 h-4 ${isPopular ? "text-white" : "text-[#4A6C58]"}`}
                    strokeWidth={1.5}
                  />
                </div>
                <h3 className="text-base font-semibold text-[#1A1A1A]">{plan.name}</h3>
              </div>

              {/* Price */}
              <div className="mb-1">
                <div className="flex items-end gap-1">
                  <span className="text-3xl sm:text-4xl font-bold text-[#1A1A1A] font-[Manrope]">
                    ${plan.price}
                  </span>
                  <span className="text-sm text-[#A1A1AA] mb-1">/ month</span>
                </div>
              </div>

              {/* Scan Limit */}
              <p className="text-sm font-medium text-[#52525B] mb-5">
                {plan.scan_limit.toLocaleString()} Analysis / Monthly
              </p>

              {/* Features */}
              <ul className="space-y-2.5 mb-6 flex-1">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-[#52525B]">
                    <Check className="w-4 h-4 text-[#4A6C58] flex-shrink-0 mt-0.5" strokeWidth={2} />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              {isCurrentPlan ? (
                <div className="space-y-2 mt-auto">
                  <Button
                    disabled
                    className="w-full bg-[#F2F0EB] text-[#4A6C58] cursor-default h-10"
                    data-testid={`plan-current-${id}`}
                  >
                    Current Plan
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="w-full text-[#991B1B] hover:bg-red-50 text-xs h-8"
                    data-testid={`plan-cancel-${id}`}
                  >
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleSubscribe(id)}
                  className={`w-full mt-auto h-10 ${
                    isPopular
                      ? "bg-[#4A6C58] hover:bg-[#3D5A49] text-white"
                      : "bg-white border border-[#4A6C58] text-[#4A6C58] hover:bg-[#F2F0EB]"
                  }`}
                  data-testid={`plan-subscribe-${id}`}
                >
                  Start
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.5} />
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info */}
      <Card className="p-3 sm:p-4 border-[#E4E4E7] bg-[#F9FAFB]" data-testid="billing-info">
        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
          All plans include a 3-day free trial. Billing is managed through Shopify's recurring
          subscription system. Charges appear on your Shopify invoice.
          Quotas reset monthly. Upgrade, downgrade, or cancel at any time.
          Need help? Contact us at support@inovation.app
        </p>
      </Card>
    </div>
  );
}
