import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Copy,
  CheckCircle2,
  ExternalLink,
  FileCode2,
  FolderTree,
  Terminal,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

const EXTENSION_STRUCTURE = `theme-extension/
  blocks/
    skin-analysis.liquid      # Main section block
  assets/
    skin-analysis.js          # Camera + analysis logic
    skin-analysis.css         # Widget styles
  snippets/
    skin-analysis-app.liquid  # Embeddable snippet
  locales/
    en.default.json           # Translations`;

const LIQUID_SNIPPET = `{% comment %}
  AI Skin Analysis - Theme App Extension
  Place this block on /pages/skin-analysis
{% endcomment %}

{% schema %}
{
  "name": "Skin Analysis",
  "target": "section",
  "settings": [
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "AI Skin Analysis"
    },
    {
      "type": "color",
      "id": "brand_color",
      "label": "Brand Color",
      "default": "#4A6C58"
    }
  ]
}
{% endschema %}

<div id="lumina-skin-analysis"
     data-app-proxy-url="{{ shop.url }}/apps/skin-analysis"
     data-shop="{{ shop.permanent_domain }}"
     style="--brand-color: {{ block.settings.brand_color }}">
  <h2>{{ block.settings.heading }}</h2>
  <div id="lumina-camera-container"></div>
  <div id="lumina-results-container"></div>
</div>

{{ 'skin-analysis.css' | asset_url | stylesheet_tag }}
{{ 'skin-analysis.js' | asset_url | script_tag }}`;

const PROXY_CONFIG = `# App Proxy Configuration (in Shopify Partner Dashboard)
# =============================================
# Sub path prefix:    apps
# Sub path:           skin-analysis
# Proxy URL:          https://YOUR_APP_URL/api/proxy
#
# This routes:
#   https://store.myshopify.com/apps/skin-analysis/*
#   → https://YOUR_APP_URL/api/proxy/*
#
# All requests include HMAC signature verification`;

const SETUP_STEPS = [
  {
    title: "Create Theme App Extension",
    description: "Copy the extension files to your Shopify app repository",
    status: "ready",
  },
  {
    title: "Configure App Proxy",
    description: "Set up the proxy URL in your Shopify Partner Dashboard",
    status: "ready",
  },
  {
    title: "Create skin-analysis page",
    description: "In the merchant's Shopify admin, create a page at /pages/skin-analysis",
    status: "manual",
  },
  {
    title: "Add extension block to page",
    description: "Use the theme editor to add the Skin Analysis block to the page",
    status: "manual",
  },
  {
    title: "Test the integration",
    description: "Visit /pages/skin-analysis on the storefront to verify",
    status: "manual",
  },
];

export default function ThemeSetup() {
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, id) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in" data-testid="theme-setup-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">
          Theme Setup
        </h1>
        <p className="text-sm text-[#A1A1AA] mt-1">
          Install and configure the Theme App Extension
        </p>
      </div>

      {/* Setup Steps */}
      <Card className="p-6 border-[#E4E4E7]" data-testid="setup-steps-card">
        <h3 className="text-sm font-semibold text-[#1A1A1A] mb-4">Installation Steps</h3>
        <div className="space-y-4">
          {SETUP_STEPS.map((step, i) => (
            <div key={i} className="flex items-start gap-3" data-testid={`setup-step-${i}`}>
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 text-xs font-medium ${
                  step.status === "ready"
                    ? "bg-[#4A6C58] text-white"
                    : "bg-[#F2F0EB] text-[#52525B]"
                }`}
              >
                {step.status === "ready" ? (
                  <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={2} />
                ) : (
                  i + 1
                )}
              </div>
              <div>
                <p className="text-sm font-medium text-[#1A1A1A]">{step.title}</p>
                <p className="text-xs text-[#A1A1AA] mt-0.5">{step.description}</p>
              </div>
              {step.status === "ready" && (
                <Badge className="ml-auto bg-[#3F6212]/10 text-[#3F6212] border-0 text-[10px]">
                  Ready
                </Badge>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* Code Tabs */}
      <Tabs defaultValue="structure" className="w-full" data-testid="code-tabs">
        <TabsList className="bg-[#F2F0EB] border-0">
          <TabsTrigger value="structure" className="text-xs data-[state=active]:bg-white">
            <FolderTree className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
            Structure
          </TabsTrigger>
          <TabsTrigger value="liquid" className="text-xs data-[state=active]:bg-white">
            <FileCode2 className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
            Liquid Block
          </TabsTrigger>
          <TabsTrigger value="proxy" className="text-xs data-[state=active]:bg-white">
            <Terminal className="w-3.5 h-3.5 mr-1.5" strokeWidth={1.5} />
            App Proxy
          </TabsTrigger>
        </TabsList>

        <TabsContent value="structure" className="mt-4">
          <Card className="border-[#E4E4E7] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E4E4E7]">
              <span className="text-xs font-medium text-[#52525B]">File Structure</span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(EXTENSION_STRUCTURE, "structure")}
                className="h-7 text-xs"
                data-testid="copy-structure-btn"
              >
                {copied === "structure" ? (
                  <CheckCircle2 className="w-3 h-3 mr-1 text-[#3F6212]" />
                ) : (
                  <Copy className="w-3 h-3 mr-1" />
                )}
                Copy
              </Button>
            </div>
            <pre className="code-block text-xs whitespace-pre overflow-x-auto">
              {EXTENSION_STRUCTURE}
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="liquid" className="mt-4">
          <Card className="border-[#E4E4E7] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E4E4E7]">
              <span className="text-xs font-medium text-[#52525B]">
                skin-analysis.liquid
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(LIQUID_SNIPPET, "liquid")}
                className="h-7 text-xs"
                data-testid="copy-liquid-btn"
              >
                {copied === "liquid" ? (
                  <CheckCircle2 className="w-3 h-3 mr-1 text-[#3F6212]" />
                ) : (
                  <Copy className="w-3 h-3 mr-1" />
                )}
                Copy
              </Button>
            </div>
            <pre className="code-block text-xs whitespace-pre overflow-x-auto">
              {LIQUID_SNIPPET}
            </pre>
          </Card>
        </TabsContent>

        <TabsContent value="proxy" className="mt-4">
          <Card className="border-[#E4E4E7] overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E4E4E7]">
              <span className="text-xs font-medium text-[#52525B]">
                App Proxy Configuration
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => copyToClipboard(PROXY_CONFIG, "proxy")}
                className="h-7 text-xs"
                data-testid="copy-proxy-btn"
              >
                {copied === "proxy" ? (
                  <CheckCircle2 className="w-3 h-3 mr-1 text-[#3F6212]" />
                ) : (
                  <Copy className="w-3 h-3 mr-1" />
                )}
                Copy
              </Button>
            </div>
            <pre className="code-block text-xs whitespace-pre overflow-x-auto">
              {PROXY_CONFIG}
            </pre>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Shopify Docs Link */}
      <Card className="p-4 border-[#E4E4E7] bg-[#F9FAFB]" data-testid="docs-link">
        <div className="flex items-center gap-2">
          <ExternalLink className="w-4 h-4 text-[#4A6C58]" strokeWidth={1.5} />
          <a
            href="https://shopify.dev/docs/apps/online-store/theme-app-extensions"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-[#4A6C58] hover:underline"
          >
            Shopify Theme App Extension Documentation
          </a>
        </div>
      </Card>
    </div>
  );
}
