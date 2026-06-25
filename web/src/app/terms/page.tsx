import React from "react";
import { ShieldAlert } from "lucide-react";

export default function TermsOfService() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <div className="p-3 bg-rose-500/10 rounded-xl">
            <ShieldAlert className="size-8 text-rose-500" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Terms of Service</h1>
            <p className="text-muted-foreground mt-1">Last Updated: June 2026</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">1. Acceptance of Terms</h2>
            <p>
              Welcome to Javahade ("we", "our", or "us"). By accessing or using our platform, you agree to comply with and be bound by these Terms of Service. If you do not agree to these terms, please do not use our services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">2. Age Requirement (18+)</h2>
            <p>
              Javahade contains content that is strictly for adults. <strong>You must be at least 18 years of age</strong> (or the age of majority in your jurisdiction, whichever is greater) to access this site, register as a user, or become a creator. By using this platform, you represent and warrant that you meet this age requirement.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">3. User Conduct and Content</h2>
            <p>
              As a user or creator, you are solely responsible for the content you upload, stream, or transmit. We strictly prohibit:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-2">
              <li>Content depicting minors or non-consensual acts.</li>
              <li>Illegal content, including extreme violence, bestiality, or revenge porn.</li>
              <li>Harassment, doxxing, or threats against other users.</li>
              <li>Using the platform for illegal transactions or money laundering.</li>
            </ul>
            <p className="mt-2">Violating these rules will result in immediate termination of your account and reporting to relevant authorities.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">4. Payments, Refunds, and Chargebacks</h2>
            <p>
              All payments for subscriptions, virtual gifts, and bookings are processed securely via our third-party payment gateways (e.g., Verotel, Segpay).
              <strong> All sales are final.</strong> Refunds are only granted in cases of technical failure on our end. 
              Initiating a fraudulent chargeback will result in the immediate and permanent suspension of your account.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">5. Intellectual Property</h2>
            <p>
              Creators retain ownership of the original content they post. However, by posting content, creators grant Javahade a worldwide, non-exclusive license to host, display, and distribute said content solely for the operation of the platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">6. Contact Information</h2>
            <p>
              If you have any questions or concerns regarding these Terms, please contact us at <strong>support@javahade.com</strong>.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
