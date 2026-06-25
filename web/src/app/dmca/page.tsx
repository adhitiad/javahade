import React from "react";
import { CopySlash } from "lucide-react";

export default function DMCAPolicy() {
  return (
    <div className="min-h-screen bg-background text-foreground py-16 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="flex items-center gap-4 border-b border-border/50 pb-6">
          <div className="p-3 bg-violet-500/10 rounded-xl">
            <CopySlash className="size-8 text-violet-500" />
          </div>
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">DMCA / Copyright Policy</h1>
            <p className="text-muted-foreground mt-1">Digital Millennium Copyright Act Notice</p>
          </div>
        </div>

        <div className="prose prose-invert max-w-none text-muted-foreground space-y-6">
          <section>
            <p>
              Javahade Inc. ("Javahade") respects the intellectual property rights of others and expects its users to do the same. In accordance with the Digital Millennium Copyright Act of 1998, we will respond expeditiously to claims of copyright infringement committed using our service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Filing a DMCA Notice</h2>
            <p>
              If you are a copyright owner, authorized to act on behalf of one, or authorized to act under any exclusive right under copyright, please report alleged copyright infringements taking place on or through our platform by sending a DMCA Notice to our Designated Copyright Agent containing the following information:
            </p>
            <ul className="list-disc pl-6 space-y-2 mt-4">
              <li>A physical or electronic signature of a person authorized to act on behalf of the owner of the copyright that has been allegedly infringed.</li>
              <li>Identification of the copyrighted work claimed to have been infringed.</li>
              <li>Identification of the material that is claimed to be infringing or to be the subject of infringing activity, along with information reasonably sufficient to permit us to locate the material (e.g., the URL).</li>
              <li>Your contact information, including your address, telephone number, and an email address.</li>
              <li>A statement that you have a good faith belief that use of the material in the manner complained of is not authorized by the copyright owner, its agent, or the law.</li>
              <li>A statement that the information in the notification is accurate, and, under penalty of perjury, that you are authorized to act on behalf of the copyright owner.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mb-3">Designated Copyright Agent</h2>
            <div className="bg-muted/50 p-4 rounded-xl border border-border/50 mt-4">
              <p className="font-semibold text-foreground">Javahade Copyright Agent</p>
              <p>Email: dmca@javahade.com</p>
            </div>
            <p className="mt-4 text-sm text-amber-500">
              *Please note that under Section 512(f) of the DMCA, any person who knowingly materially misrepresents that material or activity is infringing may be subject to liability.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
