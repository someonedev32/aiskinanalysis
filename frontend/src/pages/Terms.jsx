import { Card } from "@/components/ui/card";

export default function Terms() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl" data-testid="terms-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Terms of Service</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Last updated: February 8, 2026</p>
      </div>

      <Card className="p-5 sm:p-6 border-[#E4E4E7] space-y-5 text-sm text-[#52525B] leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">1. Acceptance of Terms</h2>
          <p>By installing and using AI Skin Analysis ("the App"), you agree to these Terms of Service. The App is operated by inovation.app ("we", "our", "us").</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">2. Service Description</h2>
          <p>AI Skin Analysis provides AI-powered cosmetic skin analysis for Shopify stores. The App allows store customers to use their device camera to receive a cosmetic skin assessment including skin type, concerns, and personalized skincare recommendations.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">3. Face Data & Image Processing</h2>
          <p className="mb-2">By using the skin analysis feature, you acknowledge and agree that:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Face photos are captured via your device camera for cosmetic skin analysis purposes only</li>
            <li>Photos are processed in real-time and <strong>immediately discarded</strong> after analysis — they are NOT stored</li>
            <li>Photos are sent to OpenAI's Vision API solely for skin condition analysis</li>
            <li>No biometric identifiers or face templates are created</li>
            <li>Photos are not used for identification, facial recognition, advertising, or tracking</li>
            <li>Only text-based analysis results (skin type, score, recommendations) are stored</li>
          </ul>
        </section>

        <section className="bg-[#FEF2F2] border border-[#FECACA] rounded-lg p-4">
          <h2 className="text-base font-semibold text-[#991B1B] mb-2">4. Medical Disclaimer</h2>
          <p className="text-[#991B1B]">
            <strong>IMPORTANT:</strong> The App provides cosmetic analysis only and does NOT constitute medical advice, diagnosis, or treatment. AI Skin Analysis is intended for general skincare guidance and product recommendations. Users should consult a licensed dermatologist or healthcare professional for medical skin concerns, conditions, or treatments.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">5. Subscription & Billing</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All plans include a <strong>3-day free trial</strong></li>
            <li><strong>Start:</strong> $39/month — 1,000 analyses per month</li>
            <li><strong>Plus:</strong> $99/month — 5,000 analyses per month</li>
            <li><strong>Growth:</strong> $179/month — 10,000 analyses per month</li>
            <li>Paid plans are billed monthly through Shopify's billing system</li>
            <li>Charges appear on your Shopify invoice</li>
            <li>Analysis quotas reset at the beginning of each billing cycle</li>
            <li>You may upgrade, downgrade, or cancel at any time</li>
            <li>Cancellation takes effect at the end of the current billing period</li>
            <li>No refunds for partial months or unused analyses</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">6. Analysis Quotas</h2>
          <p>Each plan includes a monthly analysis limit. Once the limit is reached, customers will be unable to perform new analyses until the quota resets at the start of the next billing cycle. You may upgrade your plan at any time for additional analyses.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">7. Camera Permission</h2>
          <p>The App requires camera access to perform skin analysis. Camera access is requested only when initiating the analysis feature. If camera access is denied, the analysis feature will not work. Users can manage camera permissions through their browser or device settings at any time.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">8. Product Recommendations</h2>
          <p>AI Skin Analysis may display product recommendations from your Shopify store based on analysis results. Product matching is based on product tags configured by the merchant. We do not receive commissions or affiliate payments for product recommendations shown within the app.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">9. Acceptable Use</h2>
          <p>You agree not to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Use the App for medical diagnosis or treatment recommendations</li>
            <li>Misrepresent the App's AI analysis as medical advice to your customers</li>
            <li>Attempt to reverse engineer, decompile, or abuse the API</li>
            <li>Exceed your plan's analysis limits through automated or abusive means</li>
            <li>Use the App for any illegal or unauthorized purpose</li>
            <li>Violate Shopify's Terms of Service or Acceptable Use Policy</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">10. Merchant Responsibilities</h2>
          <p>As a merchant using AI Skin Analysis, you are responsible for:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Ensuring your customers understand the cosmetic (non-medical) nature of the analysis</li>
            <li>Displaying appropriate disclaimers on your store if required by your jurisdiction</li>
            <li>Complying with applicable privacy laws regarding your customers</li>
            <li>Properly tagging products for accurate recommendations</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">11. Availability & Support</h2>
          <p>We strive for high availability but do not guarantee uninterrupted service. The App depends on third-party services (Shopify, OpenAI) which may have their own availability limitations. Planned maintenance will be communicated in advance when possible. Support is available via email at support@inovation.app.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">12. Limitation of Liability</h2>
          <p>THE APP IS PROVIDED "AS IS" WITHOUT WARRANTY OF ANY KIND. We are not liable for any indirect, incidental, special, consequential, or punitive damages arising from the use of the App. This includes, but is not limited to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Loss of profits, revenue, or business opportunities</li>
            <li>Inaccurate skin analysis results</li>
            <li>Customer decisions based on analysis recommendations</li>
            <li>Service interruptions or data loss</li>
          </ul>
          <p className="mt-2">Our total liability is limited to the amount paid for the App in the preceding 12 months.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">13. Indemnification</h2>
          <p>You agree to indemnify and hold harmless inovation.app from any claims, damages, or expenses arising from your use of the App, your violation of these Terms, or your violation of any rights of a third party.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">14. Termination</h2>
          <p>We reserve the right to suspend or terminate access for violation of these terms. You may uninstall the App at any time through your Shopify admin. Upon termination or uninstallation, your data will be deleted in accordance with our Privacy Policy.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">15. Changes to Terms</h2>
          <p>We may update these Terms of Service from time to time. Continued use after changes constitutes acceptance. Material changes will be communicated through the App or email. The "Last updated" date at the top indicates when these terms were last revised.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">16. Governing Law</h2>
          <p>These Terms shall be governed by and construed in accordance with applicable laws, without regard to conflict of law principles.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">17. Contact</h2>
          <p>For questions about these Terms of Service, contact us at: <a href="mailto:support@inovation.app" className="text-[#4A6C58] hover:underline">support@inovation.app</a></p>
        </section>
      </Card>
    </div>
  );
}
