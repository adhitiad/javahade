import React from "react";
import { Lock } from "lucide-react";

export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <div className="p-3 bg-blue-500/10 rounded-xl">
            <Lock className="size-8 text-blue-500" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
            <p className="text-muted-foreground mt-1">Last Updated: June 2026</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Information We Collect</h2>
            <p>
              Javahade Inc. ("Javahade") is committed to protecting your privacy. We collect:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li><strong>Account Information:</strong> Email, username, and password hashes.</li>
              <li><strong>Identity Verification (KYC):</strong> Government-issued ID and selfie photos. This data is processed securely via our AI partner (Groq) to verify age and identity and is encrypted at rest.</li>
              <li><strong>Usage Data:</strong> Streaming activity, chat logs, and site interactions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Financial Data and Payment Processing</h2>
            <p>
              <strong>We do not store your full credit card numbers.</strong> All payment processing is handled by our PCI-DSS compliant third-party payment gateways (e.g., Verotel, Segpay, Paxum). Javahade only receives a secure token and the status of the transaction.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. How We Use Your Data</h2>
            <p>
              Your data is used strictly to provide and improve our services, process payments, prevent fraud, and ensure compliance with legal obligations (including age verification laws).
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Data Sharing and Disclosure</h2>
            <p>
              We do not sell your personal data to third parties. We may disclose information:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>To comply with legal obligations, court orders, or subpoenas.</li>
              <li>To our authorized service providers (e.g., payment gateways, KYC vendors).</li>
              <li>To protect the rights, property, or safety of Javahade, our users, or the public.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Data Retention</h2>
            <p>
              We retain your personal data for as long as your account is active or as needed to provide you services. We may retain certain data as necessary to comply with legal obligations (such as 18 U.S.C. 2257), resolve disputes, and enforce our agreements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Contact Information</h2>
            <p>
              For privacy-related inquiries or to request data deletion, please contact our Data Protection Officer at <strong>privacy@javahade.com</strong> or via our support team at <strong>support@javahade.com</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
