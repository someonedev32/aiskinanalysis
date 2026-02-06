import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Zap, Shield, ArrowRight } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_ICONS = {
  starter: Zap,
  professional: Shield,
};

export default function Billing() {
  const [plans, setPlans] = useState({});
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  const shopDomain = "demo-store.myshopify.com";

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
  }, []);

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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="h-96 bg-white rounded-xl border border-[#E4E4E7] animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  const currentPlan = billingStatus?.plan;

  return (
    <div className="space-y-8 animate-fade-in" data-testid="billing-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Billing</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">
          Manage your subscription and billing
        </p>
      </div>

      {/* Current Status */}
      {billingStatus && (
        <Card className="p-5 border-[#E4E4E7]" data-testid="billing-status-card">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F2F0EB] flex items-center justify-center">
                <Zap className="w-5 h-5 text-[#4A6C58]" strokeWidth={1.5} />
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {currentPlan
                    ? `${currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1)} Plan`
                    : "No Active Plan"}
                </p>
                <p className="text-xs text-[#A1A1AA]">
                  {billingStatus.scan_count} / {billingStatus.scan_limit} scans used
                </p>
              </div>
            </div>
            <Badge
              variant={billingStatus.billing_status === "active" ? "default" : "secondary"}
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
        </Card>
      )}

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
        {Object.entries(plans).map(([id, plan]) => {
          const PlanIcon = PLAN_ICONS[id] || Zap;
          const isCurrentPlan = currentPlan === id;
          const isPro = id === "professional";

          return (
            <Card
              key={id}
              className={`p-6 border-2 transition-all duration-300 relative overflow-hidden ${
                isPro
                  ? "border-[#4A6C58] shadow-[0_12px_24px_rgba(74,108,88,0.15)]"
                  : "border-[#E4E4E7] hover:border-[#4A6C58]/30"
              }`}
              data-testid={`plan-card-${id}`}
            >
              {isPro && (
                <div className="absolute top-0 right-0">
                  <Badge className="bg-[#D4A373] text-white border-0 rounded-none rounded-bl-lg text-[10px] px-3 py-1">
                    POPULAR
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-3 mb-5">
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isPro ? "bg-[#4A6C58]" : "bg-[#F2F0EB]"
                  }`}
                >
                  <PlanIcon
                    className={`w-5 h-5 ${isPro ? "text-white" : "text-[#4A6C58]"}`}
                    strokeWidth={1.5}
                  />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#1A1A1A]">{plan.name}</h3>
                  <p className="text-xs text-[#A1A1AA]">7-day free trial</p>
                </div>
              </div>

              <div className="flex items-end gap-1 mb-6">
                <span className="text-4xl font-bold text-[#1A1A1A] font-[Manrope]">
                  ${plan.price}
                </span>
                <span className="text-sm text-[#A1A1AA] mb-1">/month</span>
              </div>

              <ul className="space-y-3 mb-6">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-2.5 text-sm text-[#52525B]">
                    <Check className="w-4 h-4 text-[#4A6C58] flex-shrink-0" strokeWidth={2} />
                    {feature}
                  </li>
                ))}
              </ul>

              {isCurrentPlan ? (
                <div className="space-y-2">
                  <Button
                    disabled
                    className="w-full bg-[#F2F0EB] text-[#4A6C58] cursor-default"
                    data-testid={`plan-current-${id}`}
                  >
                    Current Plan
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={handleCancel}
                    className="w-full text-[#991B1B] hover:bg-red-50 text-xs"
                    data-testid={`plan-cancel-${id}`}
                  >
                    Cancel Subscription
                  </Button>
                </div>
              ) : (
                <Button
                  onClick={() => handleSubscribe(id)}
                  className={`w-full ${
                    isPro
                      ? "bg-[#4A6C58] hover:bg-[#3D5A49] text-white"
                      : "bg-white border border-[#4A6C58] text-[#4A6C58] hover:bg-[#F2F0EB]"
                  }`}
                  data-testid={`plan-subscribe-${id}`}
                >
                  Subscribe
                  <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.5} />
                </Button>
              )}
            </Card>
          );
        })}
      </div>

      {/* Info Note */}
      <Card className="p-4 border-[#E4E4E7] bg-[#F9FAFB]" data-testid="billing-info">
        <p className="text-xs text-[#A1A1AA] leading-relaxed">
          All plans include a 7-day free trial. Billing is managed through Shopify's recurring
          subscription system. Charges appear on your Shopify invoice. Quotas reset monthly.
          You can upgrade, downgrade, or cancel at any time.
        </p>
      </Card>
    </div>
  );
}
