import { Card } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl" data-testid="terms-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Terms of Service</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Last updated: February 6, 2026</p>
      </div>

      <Card className="p-5 sm:p-6 border-[#E4E4E7] space-y-5 text-sm text-[#52525B] leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">1. Acceptance of Terms</h2>
          <p>By installing and using AI Skin Analysis ("the App"), you agree to these Terms of Service. The App is operated by inovation.app ("we", "our", "us").</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">2. Service Description</h2>
          <p>AI Skin Analysis provides AI-powered skin analysis for Shopify stores. The App allows store customers to use their camera to receive a cosmetic skin assessment including skin type, concerns, and product recommendations.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">3. Medical Disclaimer</h2>
          <p className="font-medium text-[#991B1B]">The App provides cosmetic analysis only and does not constitute medical advice, diagnosis, or treatment. Users should consult a dermatologist for medical skin concerns.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">4. Subscription & Billing</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All plans include a 3-day free trial</li>
            <li>Start: $39/month — 1,000 analysis per month</li>
            <li>Plus: $99/month — 5,000 analysis per month</li>
            <li>Growth: $179/month — 10,000 analysis per month</li>
            <li>Paid plans are billed monthly through Shopify's billing system</li>
            <li>Analysis quotas reset at the beginning of each billing cycle</li>
            <li>You may upgrade, downgrade, or cancel at any time</li>
            <li>Cancellation takes effect at the end of the current billing period</li>
            <li>No refunds for partial months</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">5. Analysis Quotas</h2>
          <p>Each plan includes a monthly analysis limit. Once the limit is reached, customers will be unable to perform new analyses until the quota resets. You may upgrade your plan for additional analyses.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">6. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the App for medical diagnosis or treatment recommendations</li>
            <li>Misrepresent the App's AI analysis as medical advice</li>
            <li>Attempt to reverse engineer or abuse the API</li>
            <li>Exceed your plan's scan limits through automated means</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">7. Availability & Support</h2>
          <p>We strive for high availability but do not guarantee uninterrupted service. Planned maintenance will be communicated in advance when possible. Support is available via email.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">8. Limitation of Liability</h2>
          <p>The App is provided "as is" without warranty. We are not liable for any indirect, incidental, or consequential damages arising from the use of the App. Our total liability is limited to the amount paid for the App in the preceding 12 months.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">9. Termination</h2>
          <p>We reserve the right to suspend or terminate access for violation of these terms. You may uninstall the App at any time through your Shopify admin.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">10. Changes to Terms</h2>
          <p>We may update these terms. Continued use after changes constitutes acceptance. Material changes will be communicated through the App or email.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">11. Contact</h2>
          <p>For questions about these terms: <a href="mailto:support@inovation.app" className="text-[#4A6C58] hover:underline">support@inovation.app</a></p>
        </section>
      </Card>
    </div>
  );
}
