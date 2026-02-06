import { Card } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl" data-testid="privacy-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Privacy Policy</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Last updated: February 6, 2026</p>
      </div>

      <Card className="p-5 sm:p-6 border-[#E4E4E7] space-y-5 text-sm text-[#52525B] leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">1. Introduction</h2>
          <p>AI Skin Analysis ("we", "our", "us") is a Shopify application operated by inovation.app. This Privacy Policy explains how we collect, use, and protect information when you use our app.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">2. Information We Collect</h2>
          <p className="mb-2"><strong>From Merchants (App Users):</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Shopify store domain and basic store information</li>
            <li>Billing and subscription data</li>
            <li>App usage analytics (scan counts, feature usage)</li>
          </ul>
          <p className="mt-3 mb-2"><strong>From Customers (Store Visitors):</strong></p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Camera images are processed in real-time for skin analysis</li>
            <li>No images are stored, saved, or transmitted to third parties</li>
            <li>Analysis results (skin type, score) are stored anonymously without any personally identifiable information</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">3. How We Use Information</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide AI-powered skin analysis services</li>
            <li>To manage billing and subscriptions</li>
            <li>To improve our services through aggregated, anonymous analytics</li>
            <li>To comply with Shopify and legal requirements</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">4. Image Processing</h2>
          <p>Camera images captured during skin analysis are:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Processed in real-time using OpenAI Vision API</li>
            <li>Never stored on our servers</li>
            <li>Never shared with third parties beyond the analysis provider</li>
            <li>Immediately discarded after analysis is complete</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">5. Data Sharing</h2>
          <p>We do not sell personal data. We share data only with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>OpenAI</strong> — for AI skin analysis processing (images only, not stored)</li>
            <li><strong>Shopify</strong> — for billing and app functionality</li>
            <li><strong>MongoDB Atlas</strong> — for secure data storage</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">6. Data Retention</h2>
          <p>Merchant data is retained while the app is installed. Upon uninstallation, all data is deleted within 48 hours in compliance with Shopify's GDPR requirements.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">7. GDPR Compliance</h2>
          <p>We comply with GDPR and Shopify's mandatory data protection requirements:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Customer data request — we report that no customer PII is stored</li>
            <li>Customer data erasure — handled automatically</li>
            <li>Shop data erasure — all data deleted upon request</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">8. Security</h2>
          <p>We use industry-standard security measures including HMAC verification for all Shopify communications, encrypted data transmission (HTTPS), and secure cloud infrastructure.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">9. Contact</h2>
          <p>For privacy-related questions, contact us at: <a href="mailto:support@inovation.app" className="text-[#4A6C58] hover:underline">support@inovation.app</a></p>
        </section>
      </Card>
    </div>
  );
}
