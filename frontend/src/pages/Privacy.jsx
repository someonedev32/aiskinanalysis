import { Card } from "@/components/ui/card";

export default function Privacy() {
  return (
    <div className="space-y-6 animate-fade-in max-w-3xl" data-testid="privacy-page">
      <div>
        <h1 className="text-2xl sm:text-3xl font-semibold text-[#1A1A1A]">Privacy Policy</h1>
        <p className="text-sm text-[#A1A1AA] mt-1">Last updated: February 8, 2026</p>
      </div>

      {/* Summary Box */}
      <Card className="p-4 bg-[#F0FDF4] border-[#BBF7D0]">
        <p className="text-sm text-[#166534] font-medium mb-1">Summary</p>
        <p className="text-sm text-[#15803D]">
          AI Skin Analysis is designed to minimize data collection. Face photos used for cosmetic skin analysis are processed only to generate your analysis results and are <strong>not retained or stored</strong> by the app. Images are processed in real-time and immediately discarded after analysis.
        </p>
      </Card>

      <Card className="p-5 sm:p-6 border-[#E4E4E7] space-y-6 text-sm text-[#52525B] leading-relaxed">
        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">1. Introduction</h2>
          <p>This Privacy Policy explains how AI Skin Analysis ("we", "our", or "the app") handles information when you use our Shopify application. The app is operated by inovation.app.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-3">2. Face Data (Face Photos) — Collection, Use, Sharing, Storage, Retention</h2>
          
          <div className="space-y-4">
            <div>
              <h3 className="font-semibold text-[#1A1A1A] mb-1">2.1 What face data is processed</h3>
              <p>AI Skin Analysis processes face photos captured by the user's device camera for the purpose of providing a cosmetic skin analysis (e.g., skin type, dryness, oiliness, texture, concerns).</p>
            </div>

            <div>
              <h3 className="font-semibold text-[#1A1A1A] mb-1">2.2 How face data is used</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Face photos are used <strong>only</strong> to generate cosmetic analysis results shown to the user</li>
                <li>Face photos are <strong>not</strong> used for identification, authentication, or facial recognition</li>
                <li>AI Skin Analysis does <strong>not</strong> create or store biometric identifiers or face templates</li>
                <li>No face data is used for advertising, tracking, or profiling purposes</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#1A1A1A] mb-1">2.3 Sharing with third parties</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Face photos are sent to OpenAI's Vision API solely for skin condition analysis</li>
                <li>OpenAI processes the image in real-time and does not retain it</li>
                <li>Face photos are <strong>not</strong> shared with third parties for advertising, tracking, or any other purpose</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold text-[#1A1A1A] mb-1">2.4 Where face data is stored</h3>
              <p>Face photos used for cosmetic analysis are <strong>not stored</strong> by AI Skin Analysis. No images are saved to any server, database, or cloud storage.</p>
            </div>

            <div>
              <h3 className="font-semibold text-[#1A1A1A] mb-1">2.5 Retention (how long face data is kept)</h3>
              <ul className="list-disc pl-5 space-y-1">
                <li>Face photos are processed in real-time and are <strong>not retained</strong> by the app</li>
                <li>The photo is <strong>immediately discarded</strong> after the analysis is completed</li>
                <li>Only the analysis results (text data such as skin type and score) are stored — never the original image</li>
              </ul>
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">3. Camera Permission</h2>
          <p>AI Skin Analysis requests camera access only when you initiate the skin analysis feature. If you deny camera access, the analysis feature will not work. You can change camera permissions at any time in your browser or device settings.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">4. Information We Collect from Merchants</h2>
          <p className="mb-2">For Shopify store owners who install the app, we collect:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Shopify store domain and basic store information</li>
            <li>Billing and subscription data (managed through Shopify)</li>
            <li>App usage analytics (scan counts, feature usage)</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">5. Analysis Results Storage</h2>
          <p>We store the following <strong>non-image</strong> data from analyses:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Skin type classification (e.g., "Oily", "Dry", "Normal")</li>
            <li>Numeric skin health score</li>
            <li>Identified concerns (text only)</li>
            <li>Timestamp of analysis</li>
            <li>Shop domain (for billing/quota purposes)</li>
          </ul>
          <p className="mt-2 text-[#166534] font-medium">No personally identifiable information (PII) is stored with analysis results.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">6. Information We Do NOT Collect</h2>
          <p>AI Skin Analysis does not collect or store:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Face photos or images of any kind</li>
            <li>Biometric identifiers or face templates</li>
            <li>Personal contact information (name, email, phone, address) from end customers</li>
            <li>Health or medical records</li>
            <li>Precise or coarse location data</li>
            <li>Contacts or address book data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">7. Product Recommendations & Affiliate Disclosure</h2>
          <p>AI Skin Analysis may show skincare product recommendations from the merchant's store. Product recommendations are based on the skin analysis results and products tagged by the merchant. No affiliate tracking or external advertising is used.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">8. Data Sharing</h2>
          <p>We do not sell personal data. We share data only with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>OpenAI</strong> — for AI skin analysis processing (images processed in real-time, not stored)</li>
            <li><strong>Shopify</strong> — for billing, authentication, and app functionality</li>
            <li><strong>MongoDB Atlas</strong> — for secure storage of non-image data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">9. Data Retention</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Face photos:</strong> Not retained — immediately discarded after analysis</li>
            <li><strong>Analysis results:</strong> Retained while the app is installed for analytics purposes</li>
            <li><strong>Merchant data:</strong> Retained while the app is installed; deleted within 48 hours of uninstallation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">10. GDPR Compliance</h2>
          <p>We comply with GDPR and Shopify's mandatory data protection requirements:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Customer data request:</strong> We report that no customer PII or images are stored</li>
            <li><strong>Customer data erasure:</strong> Handled automatically (no customer data to erase)</li>
            <li><strong>Shop data erasure:</strong> All merchant data deleted within 48 hours upon request or uninstallation</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">11. Security</h2>
          <p>We implement industry-standard security measures:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>HMAC verification for all Shopify communications</li>
            <li>Encrypted data transmission (HTTPS/TLS)</li>
            <li>Secure cloud infrastructure with access controls</li>
            <li>No storage of sensitive face data</li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">12. Children's Privacy</h2>
          <p>AI Skin Analysis is not intended for use by children under 13. If you believe a child has used our service, please contact us.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">13. Changes to This Policy</h2>
          <p>We may update this Privacy Policy from time to time to reflect changes in app features or data practices. Updates will be posted on this page with a revised "Last updated" date.</p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-[#1A1A1A] mb-2">14. Contact</h2>
          <p>For privacy-related questions, contact us at: <a href="mailto:support@inovation.app" className="text-[#4A6C58] hover:underline">support@inovation.app</a></p>
        </section>
      </Card>
    </div>
  );
}
