import { useEffect, useState } from "react";
import api from "@/utils/api";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, RefreshCw, HelpCircle } from "lucide-react";
import { toast } from "sonner";
import { useShopDomain } from "@/hooks/useShopDomain";

export default function Settings() {
  const { shopDomain } = useShopDomain();
  const [settings, setSettings] = useState({
    shop_domain: shopDomain || "demo-store.myshopify.com",
    camera_enabled: true,
    auto_recommend: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!shopDomain) return;
    
    const fetchSettings = async () => {
      try {
        console.log('Fetching settings for shop:', shopDomain);
        const res = await api.get('/dashboard/settings', {
          params: { shop_domain: shopDomain },
        });
        console.log('Settings received:', res.data);
        // Ensure shop_domain is set
        setSettings({
          ...res.data,
          shop_domain: shopDomain
        });
      } catch (err) {
        console.error("Settings fetch error:", err);
      }
    };
    fetchSettings();
  }, [shopDomain]);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Make sure shop_domain is included
      const settingsToSave = {
        ...settings,
        shop_domain: shopDomain || settings.shop_domain
      };
      console.log('Saving settings:', settingsToSave);
      await api.post('/dashboard/settings', settingsToSave);
      toast.success("Settings saved successfully");
    } catch (err) {
      console.error('Save error:', err);
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in" data-testid="settings-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Settings</h1>
          <p className="text-sm text-[#A1A1AA] mt-1">Configure how the skin analysis works on your store</p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[#4A6C58] hover:bg-[#3D5A49] text-white"
          data-testid="save-settings-btn"
        >
          {saving ? (
            <RefreshCw className="w-3.5 h-3.5 mr-1.5 animate-spin" strokeWidth={1.5} />
          ) : (
            <Save className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
          )}
          Save Changes
        </Button>
      </div>

      {/* Skin Analysis Settings */}
      <Card className="p-6 border-[#E4E4E7]" data-testid="analysis-settings-card">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">Skin Analysis</h3>
        <p className="text-xs text-[#A1A1AA] mb-5">
          Control how customers interact with the skin analysis on your store
        </p>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-[#1A1A1A]">Camera Capture</Label>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Allow customers to use their camera for skin analysis
              </p>
            </div>
            <Switch
              checked={settings.camera_enabled}
              onCheckedChange={(v) => setSettings({ ...settings, camera_enabled: v })}
              data-testid="camera-toggle"
            />
          </div>

          <Separator className="bg-[#E4E4E7]" />

          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-[#1A1A1A]">Auto-Recommend Products</Label>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Show product recommendations based on analysis results
              </p>
            </div>
            <Switch
              checked={settings.auto_recommend}
              onCheckedChange={(v) => setSettings({ ...settings, auto_recommend: v })}
              data-testid="auto-recommend-toggle"
            />
          </div>

          <Separator className="bg-[#E4E4E7]" />

          <div className="p-4 bg-[#F0FDF4] rounded-lg border border-[#BBF7D0]">
            <p className="text-xs text-[#166534] font-medium mb-1">Product Collection & Appearance</p>
            <p className="text-[11px] text-[#15803D]">
              Configure your product collection and brand colors directly in <strong>Theme Customize</strong>. 
              Go to <strong>Online Store → Themes → Customize</strong> and click on the Skin Analysis section.
            </p>
          </div>
        </div>
      </Card>

      {/* Product Matching Guide */}
      <Card className="p-6 border-[#E4E4E7]" data-testid="product-matching-card">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">Product Matching</h3>
        <p className="text-xs text-[#A1A1AA] mb-5">
          How the app recommends products based on skin analysis results
        </p>

        <div className="p-4 bg-[#F9FAFB] rounded-lg border border-[#E4E4E7] space-y-4">
          <div>
            <p className="text-xs text-[#52525B] font-medium mb-2">How it works:</p>
            <p className="text-[11px] text-[#A1A1AA] leading-relaxed">
              After AI analysis, customers receive their skin type (Oily, Dry, Normal, Combination, Sensitive) and a list of recommended ingredients. The app matches your products using <strong>tags</strong> you add to your products in Shopify.
            </p>
          </div>

          <div>
            <p className="text-xs text-[#52525B] font-medium mb-2">Step 1: Tag your products by skin type</p>
            <p className="text-[11px] text-[#A1A1AA] mb-2">Go to each product in Shopify Admin and add these tags:</p>
            <div className="flex flex-wrap gap-1.5">
              {["skin-oily", "skin-dry", "skin-normal", "skin-combination", "skin-sensitive"].map((tag) => (
                <span key={tag} className="text-[10px] bg-[#F2F0EB] text-[#4A6C58] px-2 py-1 rounded font-mono">{tag}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-[#52525B] font-medium mb-2">Step 2: Tag by ingredients (optional)</p>
            <p className="text-[11px] text-[#A1A1AA] mb-2">Add ingredient tags for more precise matching:</p>
            <div className="flex flex-wrap gap-1.5">
              {["hyaluronic-acid", "niacinamide", "retinol", "vitamin-c", "salicylic-acid", "ceramides", "spf"].map((tag) => (
                <span key={tag} className="text-[10px] bg-[#F2F0EB] text-[#4A6C58] px-2 py-1 rounded font-mono">{tag}</span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs text-[#52525B] font-medium mb-2">Step 3: Tag by product type (optional)</p>
            <p className="text-[11px] text-[#A1A1AA] mb-2">Match products to AM/PM routine steps:</p>
            <div className="flex flex-wrap gap-1.5">
              {["cleanser", "toner", "serum", "moisturizer", "sunscreen", "treatment", "eye-cream", "mask"].map((tag) => (
                <span key={tag} className="text-[10px] bg-[#F2F0EB] text-[#4A6C58] px-2 py-1 rounded font-mono">{tag}</span>
              ))}
            </div>
          </div>

          <div className="pt-2 border-t border-[#E4E4E7]">
            <p className="text-xs text-[#52525B] font-medium mb-1">Example:</p>
            <p className="text-[11px] text-[#A1A1AA]">
              A moisturizer for oily skin with niacinamide would have tags:<br/>
              <span className="font-mono text-[10px] bg-[#F2F0EB] text-[#4A6C58] px-1.5 py-0.5 rounded inline-block mt-1">skin-oily, moisturizer, niacinamide</span>
            </p>
            <p className="text-[11px] text-[#A1A1AA] mt-2">
              When a customer is detected as "Oily skin" with "Niacinamide" recommended, this product will appear in their results.
            </p>
          </div>
        </div>
      </Card>

      {/* How It Works */}
      <Card className="p-5 border-[#E4E4E7] bg-[#F9FAFB]" data-testid="help-card">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-[#4A6C58] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A]">How to add to your store</h3>
            <ol className="text-xs text-[#52525B] mt-2 space-y-1.5 list-decimal pl-4">
              <li>Go to <strong>Online Store → Themes → Customize</strong></li>
              <li>Navigate to the page where you want the skin analysis</li>
              <li>Click <strong>Add section</strong> → select <strong>AI Skin Analysis</strong></li>
              <li>Choose your <strong>Product Collection</strong> and <strong>Brand Color</strong></li>
              <li>Save your theme</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
