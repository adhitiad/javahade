import React from "react";
import { FileWarning } from "lucide-react";

export default function Compliance2257() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <div className="p-3 bg-amber-500/10 rounded-xl">
            <FileWarning className="size-8 text-amber-500" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">18 U.S.C. § 2257 Record-Keeping Requirements Compliance Statement</h1>
            <p className="text-muted-foreground mt-1">Exemption Statement and Record-Keeping</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <p>
              All visual depictions of actual sexually explicit conduct, if any, appearing on this website were produced in compliance with the requirements of 18 U.S.C. § 2257 and 28 C.F.R. Part 75. 
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Custodians of Records</h2>
            <p>
              Records required by 18 U.S.C. § 2257 and 28 C.F.R. Part 75 concerning the performers appearing in such visual depictions are kept by the respective content producers. Javahade Inc. acts primarily as a hosting platform and service provider. However, for content produced directly by or under the control of Javahade Inc., the Custodian of Records is:
            </p>
            <div className="bg-muted/50 p-4 rounded-xl border border-border/50 mt-4">
              <p className="font-semibold text-foreground">Custodian of Records</p>
              <p>Javahade Inc. Compliance Department</p>
              <p>Email: compliance@javahade.com</p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Exemption Statement</h2>
            <p>
              To the extent that any visual depictions on this website do not constitute "actual sexually explicit conduct" or were produced prior to July 3, 1995, Javahade Inc. asserts that such depictions are exempt from the requirements of 18 U.S.C. § 2257 and 28 C.F.R. Part 75.
            </p>
            <p className="mt-2">
              Javahade strictly prohibits the upload or broadcast of content featuring individuals under the age of 18. All creators undergo a rigorous identity and age verification process prior to being permitted to stream or upload content.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
}
