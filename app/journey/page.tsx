import { BoothLookupForm } from "@/components/BoothLookupForm";
import { ElectionTimeline } from "@/components/ElectionTimeline";
import { JourneySection } from "@/components/JourneySection";
import { JourneyWarmup } from "@/components/JourneyWarmup";

export default function JourneyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-12">
      <JourneyWarmup />
      <header className="max-w-2xl">
        <p className="inline-flex items-center gap-2 rounded-full bg-slate-900/5 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-slate-700 ring-1 ring-slate-900/10">
          ECI · Voter Journey · Index
        </p>
        <h1 className="mt-4 text-[2rem] font-bold leading-tight tracking-tightest text-slate-900 sm:text-[2.4rem]">
          Voter journey
        </h1>
        <p className="mt-3 text-base leading-relaxed text-slate-600">
          The five things you actually need to know between deciding to vote and walking out of the booth. The Election Commission already does most of this work well; we index where they do, and link out. This page is an index, not an encyclopedia.
        </p>
      </header>
      <div className="mt-10 space-y-5">
        <JourneySection
          step={1}
          title="Am I eligible?"
          summary="You can vote if you are an Indian citizen, are 18 or older on the qualifying date (1 January of the year for which the electoral roll is prepared), and are ordinarily resident in the constituency where you are registered. &ldquo;Ordinarily resident&rdquo; means you actually live there — a temporary absence does not break it, but a permanent move does. Narrow disqualifications apply (unsound mind declared by a competent court; conviction for certain offences). The ECI's voter page is the authoritative reference."
          deepLink={{
            href: "https://www.eci.gov.in/voter/voter",
            label: "ECI: Voter eligibility"
          }}
        />
        <JourneySection
          step={2}
          title="Am I registered?"
          summary="Three forms cover the entire registration lifecycle. File Form 6 to add yourself to the rolls (first-time voter, or shifted to a new constituency). File Form 7 to object to or delete an entry — typically used for a deceased relative or a duplicate listing. File Form 8 to correct details (name spelling, address within the same constituency, photograph, EPIC details, marking as a person with disability). All three are filed online via the National Voters' Service Portal. Deadlines vary per election: typically the rolls are frozen 10 days after the notification is issued. File well before."
          deepLink={{
            href: "https://voters.eci.gov.in/",
            label: "NVSP: Forms 6, 7, 8"
          }}
        />
        <JourneySection
          step={3}
          title="When do I vote?"
          summary="Every Indian election follows the same procedural arc. Hover or focus a phase on the timeline to see the rule that applies in that window. Specific dates are published in the election notification for each election; this page deliberately does not hardcode them."
        >
          <ElectionTimeline />
        </JourneySection>
        <JourneySection
          step={4}
          title="Where do I vote?"
          summary="Enter your six-digit pincode below. The backend calls Maps Platform Geocoding to resolve the pincode centroid, then Maps Places Nearby Search for polling stations within 5 km. For your assigned booth (which the ECI determines by EPIC number, not by pincode), cross-check on the official ECI portal — link below the form. The Maps API key stays server-side; the frontend never calls Maps directly."
        >
          <BoothLookupForm />
        </JourneySection>
        <JourneySection
          step={5}
          title="What happens at the booth?"
          summary="On arrival you queue. The presiding officer's first polling officer verifies your EPIC (Electors Photo Identity Card) or one of the alternative documents the ECI accepts (passport, driving licence, PAN card, Aadhaar, MGNREGA job card, etc.) against the electoral roll. The second polling officer applies the indelible-ink mark on your left index finger and records the entry in Form 17A. The third polling officer activates the EVM (Electronic Voting Machine) for your ballot. You enter the voting compartment, press the candidate's button, and a green light plus a beep confirm the vote. The VVPAT (Voter-Verified Paper Audit Trail) machine prints your choice on a paper slip visible behind glass for exactly 7 seconds before dropping it into a sealed bin. NOTA — None Of The Above — appears as the last button on the EVM and is a recorded vote. Section 49-O of the Conduct of Elections Rules originally allowed refusing to vote after identification but compromised secrecy; it has effectively been replaced by Form 17A marking the elector regardless of whether a vote was cast, plus NOTA as a recorded refusal."
          deepLink={{
            href: "https://www.eci.gov.in/voter/voter-awareness",
            label: "ECI: Voter awareness materials"
          }}
        />
      </div>
    </main>
  );
}
