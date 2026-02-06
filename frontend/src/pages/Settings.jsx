import { useEffect, useState } from "react";
import axios from "axios";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Save, RefreshCw } from "lucide-react";
import { toast } from "sonner";

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function Settings() {
  const shopDomain = "demo-store.myshopify.com";
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
  }, []);

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
          <p className="text-sm text-[#A1A1AA] mt-1">Configure your app preferences</p>
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

      {/* Shopify Configuration */}
      <Card className="p-6 border-[#E4E4E7]" data-testid="shopify-config-card">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">Shopify Configuration</h3>
        <p className="text-xs text-[#A1A1AA] mb-5">
          Configure your Shopify API credentials and app settings
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <Label className="text-xs text-[#52525B]">Shop Domain</Label>
            <Input
              value={settings.shop_domain}
              disabled
              className="mt-1.5 bg-[#F9FAFB] text-sm"
              data-testid="shop-domain-input"
            />
          </div>
          <div>
            <Label className="text-xs text-[#52525B]">Shopify API Key</Label>
            <Input
              value="Configured via environment"
              disabled
              className="mt-1.5 bg-[#F9FAFB] text-sm"
              data-testid="api-key-input"
            />
          </div>
        </div>
      </Card>

      {/* Skin Analysis Settings */}
      <Card className="p-6 border-[#E4E4E7]" data-testid="analysis-settings-card">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">Skin Analysis</h3>
        <p className="text-xs text-[#A1A1AA] mb-5">
          Configure the skin analysis behavior
        </p>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-[#1A1A1A]">Camera Capture</Label>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Enable webcam/mobile camera for skin analysis
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
                Automatically suggest products based on analysis
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
            <p className="text-xs text-[#A1A1AA] mt-1">
              Shopify collection ID for product recommendations
            </p>
          </div>
        </div>
      </Card>

      {/* Branding */}
      <Card className="p-6 border-[#E4E4E7]" data-testid="branding-card">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-1">Branding</h3>
        <p className="text-xs text-[#A1A1AA] mb-5">
          Customize the skin analysis widget appearance
        </p>

        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-sm text-[#1A1A1A]">Custom Branding</Label>
              <p className="text-xs text-[#A1A1AA] mt-0.5">
                Use your brand colors in the analysis widget
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
    </div>
  );
}
