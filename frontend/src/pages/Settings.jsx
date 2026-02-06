import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, RefreshCw, HelpCircle } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings() {
  const shopDomain = new URLSearchParams(window.location.search).get("shop") || "demo-store.myshopify.com";
  const [settings, setSettings] = useState({
    shop_domain: shopDomain,
    camera_enabled: true,
    auto_recommend: true,
    collection_id: "",
    custom_branding: false,
    brand_color: "#4A6C58",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const res = await axios.get(`${API}/dashboard/settings`, {
          params: { shop_domain: shopDomain },
        });
        setSettings(res.data);
      } catch (err) {
        console.error("Settings fetch error:", err);
      }
    };
    fetchSettings();
  }, [shopDomain]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await axios.post(`${API}/dashboard/settings`, settings);
      toast.success("Settings saved successfully");
    } catch (err) {
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

          <div>
            <Label className="text-xs text-[#52525B]">Product Collection ID</Label>
            <Input
              value={settings.collection_id}
              onChange={(e) => setSettings({ ...settings, collection_id: e.target.value })}
              placeholder="e.g. 12345678"
              className="mt-1.5 text-sm"
              data-testid="collection-id-input"
            />
            <div className="mt-2 p-3 bg-[#F9FAFB] rounded-lg border border-[#E4E4E7]">
              <p className="text-xs text-[#52525B] font-medium mb-1.5">How to find your Collection ID:</p>
              <ol className="text-[11px] text-[#A1A1AA] space-y-1 list-decimal pl-3.5">
                <li>Go to <strong>Shopify Admin &gt; Products &gt; Collections</strong></li>
                <li>Create or open a collection with your skincare products</li>
                <li>Look at the URL — the number at the end is your Collection ID<br/>
                  <code className="text-[10px] bg-[#F2F0EB] px-1.5 py-0.5 rounded mt-0.5 inline-block">admin.shopify.com/store/your-store/collections/<strong>123456789</strong></code>
                </li>
                <li>Paste that number above and save</li>
              </ol>
            </div>
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
        </div>
      </Card>

      {/* Branding */}
      <Card className="p-6 border-[#E4E4E7]" data-testid="branding-card">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">Widget Appearance</h3>
        <p className="text-xs text-[#A1A1AA] mb-5">
          Customize how the skin analysis looks on your store
        </p>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-[#1A1A1A]">Custom Colors</Label>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Match the widget to your store's branding
              </p>
            </div>
            <Switch
              checked={settings.custom_branding}
              onCheckedChange={(v) => setSettings({ ...settings, custom_branding: v })}
              data-testid="custom-branding-toggle"
            />
          </div>

          {settings.custom_branding && (
            <div>
              <Label className="text-xs text-[#52525B]">Brand Color</Label>
              <div className="flex items-center gap-3 mt-1.5">
                <input
                  type="color"
                  value={settings.brand_color}
                  onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                  className="w-10 h-10 rounded-lg border border-[#E4E4E7] cursor-pointer"
                  data-testid="brand-color-picker"
                />
                <Input
                  value={settings.brand_color}
                  onChange={(e) => setSettings({ ...settings, brand_color: e.target.value })}
                  className="w-32 text-sm"
                  data-testid="brand-color-input"
                />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* How It Works */}
      <Card className="p-5 border-[#E4E4E7] bg-[#F9FAFB]" data-testid="help-card">
        <div className="flex items-start gap-3">
          <HelpCircle className="w-5 h-5 text-[#4A6C58] flex-shrink-0 mt-0.5" strokeWidth={1.5} />
          <div>
            <h3 className="text-sm font-semibold text-[#1A1A1A]">How to add to your store</h3>
            <ol className="text-xs text-[#52525B] mt-2 space-y-1.5 list-decimal pl-4">
              <li>Go to <strong>Online Store &gt; Themes &gt; Customize</strong></li>
              <li>Navigate to the page where you want the skin analysis</li>
              <li>Click <strong>Add section</strong> &gt; select <strong>AI Skin Analysis</strong></li>
              <li>Save your theme</li>
            </ol>
          </div>
        </div>
      </Card>
    </div>
  );
}
