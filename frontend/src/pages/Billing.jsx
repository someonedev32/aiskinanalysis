import { useEffect, useState } from "react";
import api from "@/utils/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Zap, ExternalLink, RefreshCw, Crown, Rocket, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useShopDomain } from "@/hooks/useShopDomain";

const PLAN_ICONS = { start: Zap, plus: Crown, growth: Rocket };
const PLAN_INFO = {
  start: { name: "Start", price: 39, scans: 1000 },
  plus: { name: "Plus", price: 99, scans: 5000 },
  growth: { name: "Growth", price: 179, scans: 10000 }
};

export default function Billing() {
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const { shopDomain, loading: shopLoading, error: shopError } = useShopDomain();

  useEffect(() => {
    if (shopLoading || !shopDomain) return;
    fetchBillingStatus();
  }, [shopDomain, shopLoading]);

  const fetchBillingStatus = async () => {
    try {
      const res = await api.get(`/billing/status/${shopDomain}`);
      setBillingStatus(res.data);
    } catch (err) {
      console.error("Billing fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleManageSubscription = () => {
    // Redirect to Shopify's managed pricing page
    const shopHandle = shopDomain.replace('.myshopify.com', '');
    const pricingUrl = `https://admin.shopify.com/store/${shopHandle}/charges/ai-skinanalysis/pricing_plans`;
    
    // Check if we're in an iframe (embedded)
    const isEmbedded = window.self !== window.top;
    
    if (isEmbedded) {
      try {
        window.top.location.href = pricingUrl;
      } catch (e) {
        window.open(pricingUrl, '_blank');
      }
    } else {
      window.location.href = pricingUrl;
    }
  };

  const handleSyncStatus = async () => {
    setSyncing(true);
    try {
      const res = await api.get(`/billing/sync/${shopDomain}`);
      if (res.data.synced) {
        toast.success(`Plan synced: ${res.data.plan || 'No active plan'}`);
        // Refresh billing status
        await fetchBillingStatus();
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to sync subscription");
    } finally {
      setSyncing(false);
    }
  };

  if (loading || shopLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#4A6C58]" />
      </div>
    );
  }

  if (shopError) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="p-6 bg-red-50 border border-red-200 rounded-xl">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Shop Not Found</h2>
          <p className="text-sm text-red-600">
            Please access this page through your Shopify admin panel.
          </p>
        </div>
      </div>
    );
  }

  // Handle needs_reinstall case
  if (billingStatus?.needs_reinstall) {
    const handleReinstall = () => {
      const shopHandle = shopDomain.replace('.myshopify.com', '');
      window.open(`https://admin.shopify.com/store/${shopHandle}/settings/apps`, '_blank');
    };

    return (
      <div className="space-y-6 animate-fade-in">
        <div className="p-6 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-amber-600 mt-0.5" />
            <div>
              <h2 className="text-lg font-semibold text-amber-800 mb-2">App Setup Required</h2>
              <p className="text-sm text-amber-700 mb-4">
                {billingStatus.message || "Please reinstall the app to complete setup."}
              </p>
              <Button onClick={handleReinstall} className="bg-amber-600 hover:bg-amber-700 text-white">
                Open App Settings
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentPlan = billingStatus?.plan;
  const planInfo = currentPlan ? PLAN_INFO[currentPlan] : null;
  const PlanIcon = currentPlan ? PLAN_ICONS[currentPlan] : Zap;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#1A1A1A]">Billing</h1>
          <p className="text-[#71717A]">Manage your subscription</p>
        </div>
        <Button
          variant="outline"
          onClick={handleSyncStatus}
          disabled={syncing}
          className="gap-2"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          Sync Status
        </Button>
      </div>

      {/* Current Plan Card */}
      <Card className="p-6 bg-gradient-to-br from-[#4A6C58]/5 to-[#4A6C58]/10 border-[#4A6C58]/20">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-[#4A6C58]/10">
              <PlanIcon className="w-8 h-8 text-[#4A6C58]" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-[#1A1A1A]">
                {currentPlan ? `${planInfo?.name} Plan` : 'No Active Plan'}
              </h2>
              {currentPlan ? (
                <p className="text-[#71717A]">
                  ${planInfo?.price}/month • {planInfo?.scans.toLocaleString()} scans included
                </p>
              ) : (
                <p className="text-[#71717A]">
                  Select a plan to get started with AI Skin Analysis
                </p>
              )}
            </div>
          </div>
          {currentPlan && (
            <Badge className="bg-[#4A6C58] text-white">Active</Badge>
          )}
        </div>

        {/* Usage Stats */}
        {currentPlan && billingStatus && (
          <div className="mt-6 pt-6 border-t border-[#4A6C58]/10">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-[#71717A]">Scans Used This Month</span>
              <span className="text-sm font-medium text-[#1A1A1A]">
                {billingStatus.scan_count?.toLocaleString() || 0} / {billingStatus.scan_limit?.toLocaleString() || 0}
              </span>
            </div>
            <Progress 
              value={billingStatus.scan_limit > 0 ? (billingStatus.scan_count / billingStatus.scan_limit) * 100 : 0} 
              className="h-2 bg-[#4A6C58]/10"
            />
            {billingStatus.extra_scans_balance > 0 && (
              <p className="mt-2 text-sm text-[#4A6C58]">
                + {billingStatus.extra_scans_balance.toLocaleString()} extra scans available
              </p>
            )}
          </div>
        )}

        {/* Manage Button */}
        <div className="mt-6">
          <Button 
            onClick={handleManageSubscription}
            className="w-full bg-[#4A6C58] hover:bg-[#3d5a4a] text-white gap-2"
            size="lg"
          >
            <ExternalLink className="w-5 h-5" />
            {currentPlan ? 'Manage Subscription' : 'Choose a Plan'}
          </Button>
          <p className="mt-2 text-xs text-center text-[#71717A]">
            You'll be redirected to Shopify to manage your subscription
          </p>
        </div>
      </Card>

      {/* Plan Comparison */}
      <Card className="p-6">
        <h3 className="text-lg font-semibold text-[#1A1A1A] mb-4">Available Plans</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Object.entries(PLAN_INFO).map(([planId, plan]) => {
            const Icon = PLAN_ICONS[planId];
            const isCurrent = currentPlan === planId;
            
            return (
              <div 
                key={planId}
                className={`p-4 rounded-xl border-2 transition-all ${
                  isCurrent 
                    ? 'border-[#4A6C58] bg-[#4A6C58]/5' 
                    : 'border-gray-200 hover:border-[#4A6C58]/50'
                }`}
              >
                <div className="flex items-center gap-2 mb-3">
                  <Icon className="w-5 h-5 text-[#4A6C58]" />
                  <span className="font-semibold text-[#1A1A1A]">{plan.name}</span>
                  {isCurrent && (
                    <Badge className="ml-auto bg-[#4A6C58] text-white text-xs">Current</Badge>
                  )}
                </div>
                <div className="mb-3">
                  <span className="text-2xl font-bold text-[#4A6C58]">${plan.price}</span>
                  <span className="text-[#71717A]">/month</span>
                </div>
                <ul className="space-y-2 text-sm text-[#666]">
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#4A6C58]" />
                    {plan.scans.toLocaleString()} scans/month
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#4A6C58]" />
                    AI skin analysis
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="w-4 h-4 text-[#4A6C58]" />
                    Product recommendations
                  </li>
                </ul>
              </div>
            );
          })}
        </div>
        
        <div className="mt-4 text-center">
          <Button 
            variant="outline" 
            onClick={handleManageSubscription}
            className="gap-2"
          >
            <ExternalLink className="w-4 h-4" />
            View Full Pricing on Shopify
          </Button>
        </div>
      </Card>

      {/* Info */}
      <div className="text-center text-sm text-[#A1A1AA]">
        <p>
          All plans include a 3-day free trial. Billing is handled securely by Shopify.
        </p>
      </div>
    </div>
  );
}
