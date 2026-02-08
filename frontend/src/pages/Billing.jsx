import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Check, Zap, ArrowRight, Crown, Rocket, Plus, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useShopDomain } from "@/hooks/useShopDomain";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PLAN_ICONS = { start: Zap, plus: Crown, growth: Rocket };
const PLAN_ORDER = ["start", "plus", "growth"];

export default function Billing() {
  const [plans, setPlans] = useState({});
  const [scanPackages, setScanPackages] = useState({});
  const [billingStatus, setBillingStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const { shopDomain, loading: shopLoading, error: shopError } = useShopDomain();

  useEffect(() => {
    if (shopLoading || !shopDomain) return;
    
    const fetchData = async () => {
      try {
        const [plansRes, statusRes] = await Promise.all([
          axios.get(`${API}/billing/plans`),
          axios.get(`${API}/billing/status/${shopDomain}`).catch(() => null),
        ]);
        setPlans(plansRes.data.plans || {});
        if (statusRes) setBillingStatus(statusRes.data);
        
        // Fetch scan packages only after we know billing status
        if (statusRes?.data?.plan === "growth") {
          const packagesRes = await axios.get(`${API}/billing/scan-packages`, {
            params: { shop_domain: shopDomain }
          });
          if (packagesRes.data.eligible) {
            setScanPackages(packagesRes.data.packages || {});
          }
        }
      } catch (err) {
        console.error("Billing fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [shopDomain, shopLoading]);

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

  const handleBuyScans = async (packageId) => {
    try {
      const res = await axios.post(`${API}/billing/buy-scans`, {
        shop_domain: shopDomain,
        package_id: packageId,
      });
      if (res.data.confirmation_url) {
        window.open(res.data.confirmation_url, "_blank");
      } else {
        toast.success("Purchase created. Confirm in Shopify admin.");
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create purchase");
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

      {/* Warning: Near Limit */}
      {isNearLimit && !isAtLimit && billingStatus?.plan && (
        <Card className="p-4 border-[#F59E0B]/30 bg-[#FFFBEB]" data-testid="near-limit-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#D97706] flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-[#92400E]">Running low on analysis credits</p>
              <p className="text-xs text-[#B45309] mt-0.5">
                You've used {scanUsage}% of your monthly limit. Consider upgrading your plan or buying extra scans.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Warning: At Limit */}
      {isAtLimit && billingStatus?.plan && (
        <Card className="p-4 border-[#EF4444]/30 bg-[#FEF2F2]" data-testid="at-limit-warning">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0" strokeWidth={1.5} />
            <div>
              <p className="text-sm font-medium text-[#991B1B]">Analysis limit reached!</p>
              <p className="text-xs text-[#B91C1C] mt-0.5">
                Your customers can't use skin analysis until you upgrade or buy extra scans.
              </p>
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
                {plan.features.map((feature, i) => {
                  const isHighlight = id === "growth" && feature === "Buy extra scans anytime";
                  return (
                    <li key={i} className={`flex items-start gap-2 text-sm ${isHighlight ? "text-[#4A6C58] font-medium" : "text-[#52525B]"}`}>
                      {isHighlight ? (
                        <Plus className="w-4 h-4 text-[#4A6C58] flex-shrink-0 mt-0.5" strokeWidth={2} />
                      ) : (
                        <Check className="w-4 h-4 text-[#4A6C58] flex-shrink-0 mt-0.5" strokeWidth={2} />
                      )}
                      <span>{feature}</span>
                      {isHighlight && (
                        <Badge className="bg-[#D4A373] text-white border-0 text-[9px] px-1.5 py-0 ml-1">
                          EXCLUSIVE
                        </Badge>
                      )}
                    </li>
                  );
                })}
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

      {/* Buy Extra Scans Section - Only for Growth Plan */}
      {billingStatus?.plan === "growth" && Object.keys(scanPackages).length > 0 && (
        <div className="space-y-4" data-testid="extra-scans-section">
          <div className="flex items-center gap-2">
            <Package className="w-5 h-5 text-[#4A6C58]" strokeWidth={1.5} />
            <h2 className="text-lg font-semibold text-[#1A1A1A]">Need More Scans?</h2>
            <Badge className="bg-[#4A6C58]/10 text-[#4A6C58] border-0 text-[10px]">
              Growth Plan Exclusive
            </Badge>
          </div>
          <p className="text-sm text-[#A1A1AA]">
            Buy extra analysis credits anytime. These are added to your current limit and don't expire.
            Larger packages offer better value per scan.
          </p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(scanPackages).map(([id, pkg]) => (
              <Card
                key={id}
                className="p-5 border-[#E4E4E7] hover:border-[#4A6C58] hover:shadow-lg transition-all"
                data-testid={`scan-package-${id}`}
              >
                <div className="text-center">
                  {pkg.savings && (
                    <Badge className="bg-[#D4A373] text-white border-0 text-[10px] mb-2">
                      SAVE {pkg.savings}
                    </Badge>
                  )}
                  <p className="text-3xl font-bold text-[#1A1A1A] font-[Manrope]">
                    {pkg.scans >= 1000000 
                      ? `${(pkg.scans / 1000000).toFixed(0)}M` 
                      : pkg.scans >= 1000 
                        ? `${(pkg.scans / 1000).toFixed(0)}K`
                        : pkg.scans.toLocaleString()
                    }
                  </p>
                  <p className="text-xs text-[#A1A1AA] mb-4">extra scans</p>
                  
                  <p className="text-2xl font-bold text-[#4A6C58] mb-1">
                    ${pkg.price.toLocaleString()}
                  </p>
                  <p className="text-[11px] text-[#A1A1AA] mb-4">
                    ${pkg.price_per_scan.toFixed(3)} per scan
                  </p>
                  
                  <Button
                    onClick={() => handleBuyScans(id)}
                    className="w-full bg-[#4A6C58] hover:bg-[#3D5A49] text-white h-9"
                  >
                    <Plus className="w-4 h-4 mr-1.5" strokeWidth={2} />
                    Purchase
                  </Button>
                </div>
              </Card>
            ))}
          </div>
          
          <p className="text-[11px] text-[#A1A1AA] text-center mt-2">
            All purchases are one-time charges processed through Shopify. Scans are added immediately after purchase confirmation.
          </p>
        </div>
      )}

      {/* Upgrade to Growth for Extra Scans */}
      {billingStatus?.plan && billingStatus.plan !== "growth" && isNearLimit && (
        <Card className="p-5 border-[#4A6C58]/20 bg-gradient-to-r from-[#4A6C58]/5 to-transparent" data-testid="upgrade-for-scans">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Rocket className="w-5 h-5 text-[#4A6C58]" strokeWidth={1.5} />
                <h3 className="text-sm font-semibold text-[#1A1A1A]">Need more scans?</h3>
              </div>
              <p className="text-xs text-[#52525B]">
                Upgrade to the <strong>Growth plan</strong> to unlock extra scan packages and scale your business without limits.
              </p>
            </div>
            <Button
              onClick={() => handleSubscribe("growth")}
              className="bg-[#4A6C58] hover:bg-[#3D5A49] text-white whitespace-nowrap"
            >
              Upgrade to Growth
              <ArrowRight className="w-3.5 h-3.5 ml-1.5" strokeWidth={1.5} />
            </Button>
          </div>
        </Card>
      )}

      {/* Info */}
      <Card className="p-3 sm:p-4 border-[#E4E4E7] bg-[#F9FAFB]" data-testid="billing-info">
        <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
          All plans include a 3-day free trial. Billing is managed through Shopify's recurring
          subscription system. Charges appear on your Shopify invoice.
          Quotas reset monthly. Extra scan purchases don't expire and are added to your limit.
          Upgrade, downgrade, or cancel at any time.
          Need help? Contact us at support@inovation.app
        </p>
      </Card>
    </div>
  );
}
