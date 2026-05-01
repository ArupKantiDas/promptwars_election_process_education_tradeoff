import { BoothLookupForm } from "@/components/BoothLookupForm";
import { JourneySection } from "@/components/JourneySection";

export default function JourneyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Voter journey</h1>
        <p className="mt-2 text-sm text-slate-700">
          The five things you actually need to know between deciding to vote and walking out of the booth. The Election Commission already does most of this work well; we index where they do, and link out.
        </p>
      </header>
      <div className="mt-6 space-y-4">
        <JourneySection
          step={1}
          title="Am I eligible?"
          summary="You can vote if you are an Indian citizen, are 18 or older on the qualifying date for the relevant election, and are ordinarily resident in the constituency where you are registered. Disqualifications apply only in narrow circumstances. The ECI's eligibility page is the authoritative reference."
          deepLink={{
            href: "https://www.eci.gov.in/voter/voter",
            label: "ECI: Voter eligibility"
          }}
        />
        <JourneySection
          step={2}
          title="Am I registered?"
          summary="If you have never voted, file Form 6 to get on the rolls. If you have moved, file Form 8 to update your address. If a deceased relative is still on the rolls, file Form 7. The National Voter's Service Portal (NVSP) handles all three online; deadlines vary by election notification."
          deepLink={{
            href: "https://voters.eci.gov.in/",
            label: "Voters portal: Forms 6, 7, 8"
          }}
        />
        <JourneySection
          step={3}
          title="When do I vote?"
          summary="Every election follows the same procedural arc — notification, scrutiny of nominations, withdrawal, campaign period, the 48-hour silence period under Section 126 of the Representation of the People Act, polling day, and counting. Specific dates are published in the election notification; this page does not hardcode them."
        />
        <JourneySection
          step={4}
          title="Where do I vote?"
          summary="Enter your six-digit pincode below. The Phase 8 booth-lookup integration calls Maps Platform plus the ECI booth locator and returns your nearest polling booth address with directions. The Maps API key stays server-side; the frontend never calls Maps directly."
        >
          <BoothLookupForm />
        </JourneySection>
        <JourneySection
          step={5}
          title="What happens at the booth?"
          summary="On arrival you queue, present your EPIC (voter ID) for verification, get an indelible-ink mark, cast your vote on the EVM, watch your VVPAT slip for 7 seconds, and leave. NOTA is on the ballot. Section 49-O of the Conduct of Elections Rules covers refusing to vote after identification — it is no longer a privacy risk because Form 17A markings are made irrespective of whether you cast a vote."
          deepLink={{
            href: "https://www.eci.gov.in/voter/voter-awareness",
            label: "ECI: Voter awareness materials"
          }}
        />
      </div>
    </main>
  );
}
