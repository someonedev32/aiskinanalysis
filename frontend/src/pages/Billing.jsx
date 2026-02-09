import { useEffect, useState } from "react";
import api from "@/utils/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Zap, ExternalLink, Crown, Rocket, RefreshCw, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useShopDomain } from "@/hooks/useShopDomain";

const PLAN_ICONS = { start: Zap, plus: Crown, growth: Rocket };
const PLAN_ORDER = ["start", "plus", "growth"];

export default function Billing() {
  const [plans, setPlans] = useState({});
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { shopDomain, loading: shopLoading, error: shopError } = useShopDomain();

  useEffect(() => {
    if (shopLoading || !shopDomain) return;
    
    const fetchData = async () => {
      try {
        const [plansRes, statusRes] = await Promise.all([
          api.get('/billing/plans'),
          api.get(`/billing/status/${shopDomain}`).catch(() => null),
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
  }, [shopDomain, shopLoading]);

  const handleSyncSubscription = async () => {
    setSyncing(true);
    try {
      const res = await api.get(`/billing/sync/${shopDomain}`);
      setBillingStatus(prev => ({
        ...prev,
        plan: res.data.plan,
        scan_limit: res.data.scan_limit,
        billing_status: res.data.plan ? "active" : "none"
      }));
      toast.success(res.data.plan ? "Subscription synced!" : "No active subscription found");
    } catch (err) {
      toast.error("Failed to sync subscription status");
    } finally {
      setSyncing(false);
    }
  };

  const handleManageSubscription = () => {
    // Open Shopify App Store page for this app
    window.open(`https://apps.shopify.com/ai-skinanalysis`, "_blank");
  };

  if (shopError) {
    return (
      <div className="space-y-6 animate-fade-in" data-testid="billing-error">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Shop Not Found</h2>
          <p className="text-sm text-red-600 mb-4">
            Could not detect your shop domain. Please access this page through your Shopify admin panel.
          </p>
          <p className="text-xs text-red-500">
            If you continue to see this error, try reinstalling the app or contact support.
          </p>
        </div>
      </div>
    );
  }

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
  const isNearLimit = scanUsage >= 80;
  const isAtLimit = scanUsage >= 100;

  return (
    <div className="space-y-6 sm:space-y-8 animate-fade-in" data-testid="billing-page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Billing</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">View your subscription and usage</p>
        </div>
        <Button
          variant="outline"
          onClick={handleSyncSubscription}
          disabled={syncing}
          className="border-[#4A6C58] text-[#4A6C58] hover:bg-[#F2F0EB]"
          data-testid="sync-btn"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${syncing ? 'animate-spin' : ''}`} strokeWidth={1.5} />
          Sync Status
        </Button>
      </div>

      {/* Managed Pricing Notice */}
      <Card className="p-4 border-[#3B82F6]/20 bg-[#EFF6FF]" data-testid="managed-pricing-notice">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#3B82F6]/20 flex items-center justify-center flex-shrink-0">
            <ExternalLink className="w-4 h-4 text-[#2563EB]" strokeWidth={1.5} />
          </div>
          <div>
            <p className="text-sm font-medium text-[#1E40AF]">Billing Managed by Shopify</p>
            <p className="text-xs text-[#3730A3] mt-0.5">
              Subscriptions are managed through the Shopify App Store. To subscribe, upgrade, or cancel, 
              please visit the app listing in the Shopify App Store.
            </p>
            <Button
              variant="link"
              onClick={handleManageSubscription}
              className="text-[#2563EB] p-0 h-auto mt-2 text-xs"
            >
              Manage in Shopify App Store
              <ExternalLink className="w-3 h-3 ml-1" strokeWidth={1.5} />
            </Button>
          </div>
        </div>
      </Card>

      {/* Current Status */}
      {billingStatus && (
        <Card className="p-4 sm:p-5 border-[#E4E4E7]" data-testid="billing-status-card">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-[#F2F0EB] flex items-center justify-center">
                {currentPlan ? (
                  (() => {
                    const PlanIcon = PLAN_ICONS[currentPlan] || Zap;
                    return <PlanIcon className="w-5 h-5 text-[#4A6C58]" strokeWidth={1.5} />;
                  })()
                ) : (
                  <Zap className="w-5 h-5 text-[#A1A1AA]" strokeWidth={1.5} />
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">
                  {billingStatus.plan_info?.name || "No Active Plan"}
                </p>
                {currentPlan ? (
                  <p className="text-xs text-[#A1A1AA]">
                    {billingStatus.scan_count?.toLocaleString()} / {billingStatus.scan_limit?.toLocaleString()} analysis used
                  </p>
                ) : (
                  <p className="text-xs text-[#A1A1AA]">
                    Subscribe through the Shopify App Store to get started
                  </p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {currentPlan && (
                <Progress value={scanUsage} className="w-24 h-2 bg-[#F2F0EB] hidden sm:block" />
              )}
              <Badge
                className={
                  billingStatus.billing_status === "active"
                    ? "bg-[#3F6212]/10 text-[#3F6212] border-0"
                    : "bg-[#F2F0EB] text-[#52525B] border-0"
                }
                data-testid="billing-status-badge"
              >
                {billingStatus.billing_status === "active" ? "Active" : "No Subscription"}
              </Badge>
            </div>
          </div>
        </Card>
      )}

      {/* Warning: Near Limit */}
      {isNearLimit && !isAtLimit && currentPlan && (
        <Card className="p-4 border-[#F59E0B]/30 bg-[#FFFBEB]" data-testid="near-limit-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#D97706] flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-[#92400E]">Running low on analysis credits</p>
              <p className="text-xs text-[#B45309] mt-0.5">
                You've used {scanUsage}% of your monthly limit. Consider upgrading your plan in the Shopify App Store.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Warning: At Limit */}
      {isAtLimit && currentPlan && (
        <Card className="p-4 border-[#EF4444]/30 bg-[#FEF2F2]" data-testid="at-limit-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-[#991B1B]">Analysis limit reached!</p>
              <p className="text-xs text-[#B91C1C] mt-0.5">
                Your customers can't use skin analysis until the limit resets or you upgrade.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Plan Cards - Read Only Display */}
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
                isCurrentPlan
                  ? "border-[#4A6C58] bg-[#4A6C58]/5"
                  : isPopular
                    ? "border-[#4A6C58]/50"
                    : "border-[#E4E4E7]"
              }`}
              data-testid={`plan-card-${id}`}
            >
              {isPopular && !isCurrentPlan && (
                <div className="absolute top-0 right-0">
                  <Badge className="bg-[#D4A373] text-white border-0 rounded-none rounded-bl-lg text-[10px] px-2.5 py-1">
                    POPULAR
                  </Badge>
                </div>
              )}
              
              {isCurrentPlan && (
                <div className="absolute top-0 right-0">
                  <Badge className="bg-[#4A6C58] text-white border-0 rounded-none rounded-bl-lg text-[10px] px-2.5 py-1">
                    CURRENT PLAN
                  </Badge>
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-5">
                <div
                  className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                    isCurrentPlan ? "bg-[#4A6C58]" : "bg-[#F2F0EB]"
                  }`}
                >
                  <PlanIcon
                    className={`w-4 h-4 ${isCurrentPlan ? "text-white" : "text-[#4A6C58]"}`}
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
                {plan.scan_limit?.toLocaleString()} Analysis / Monthly
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

              {/* Status Badge */}
              <div className="mt-auto pt-4 border-t border-[#E4E4E7]">
                {isCurrentPlan ? (
                  <div className="text-center">
                    <Badge className="bg-[#4A6C58]/10 text-[#4A6C58] border-0 px-4 py-1">
                      <Check className="w-3 h-3 mr-1.5" strokeWidth={2} />
                      Active Subscription
                    </Badge>
                  </div>
                ) : (
                  <div className="text-center">
                    <p className="text-xs text-[#A1A1AA]">
                      {currentPlan ? "Switch plans in App Store" : "Subscribe in App Store"}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          );
        })}
      </div>

      {/* Call to Action */}
      {!currentPlan && (
        <Card className="p-5 border-[#4A6C58]/20 bg-gradient-to-r from-[#4A6C58]/5 to-transparent" data-testid="subscribe-cta">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">Ready to get started?</h3>
              <p className="text-xs text-[#52525B]">
                Subscribe to any plan through the Shopify App Store to unlock AI skin analysis for your customers.
              </p>
            </div>
            <Button
              onClick={handleManageSubscription}
              className="bg-[#4A6C58] hover:bg-[#3D5A49] text-white whitespace-nowrap"
            >
              Subscribe Now
              <ExternalLink className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.5} />
            </Button>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="p-3 sm:p-4 border-[#E4E4E7] bg-[#F9FAFB]" data-testid="billing-info">
        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
          All plans include a 3-day free trial. Billing is managed through Shopify's App Store.
          Charges appear on your Shopify invoice. Quotas reset monthly.
          Upgrade, downgrade, or cancel anytime through the Shopify App Store.
          Need help? Contact us at support@inovation.app
        </p>
      </Card>
    </div>
  );
}
