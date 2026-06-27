import { LegalLayout, LegalSection } from "./LegalLayout";

const UPDATED = "June 27, 2026";

/** Community Guidelines — the human rules of the space. */
export default function GuidelinesPage() {
	return (
		<LegalLayout title="Community Guidelines" updated={UPDATED}>
			<p>
				The CycleVault Social is a calm, women-first space to talk about your cycle, your body, and your life —
				from periods and symptoms to food, movement, and everything in between. These guidelines keep it safe and
				kind. Breaking them can lead to content removal, strikes, suspension, or a ban.
			</p>

			<LegalSection heading="1. Be kind and supportive">
				<p>
					Assume good faith. Disagree gently. No harassment, bullying, hate speech, slurs, dogpiling, or
					demeaning language about anyone’s body, choices, or identity. This is a place to feel safe, not judged.
				</p>
			</LegalSection>

			<LegalSection heading="2. Share experiences, not diagnoses">
				<p>
					You can share what worked for you — but don’t present yourself as a medical authority unless you’re a
					Verified Clinician, and never tell someone to stop prescribed treatment or follow a dangerous “cure.”
					Medical misinformation and unsafe advice will be removed. When in doubt, encourage seeing a clinician.
				</p>
			</LegalSection>

			<LegalSection heading="3. Respect privacy — yours and others’">
				<p>
					Don’t post anyone’s private information, including your own real-world identifiers you may later regret
					sharing. No doxxing, no screenshots that identify private individuals, no sharing others’ content
					without consent.
				</p>
			</LegalSection>

			<LegalSection heading="4. No spam, ads, or solicitation">
				<p>
					No promotional posts, affiliate links, “DM me to buy,” crypto/investment pitches, or repetitive
					self-promotion. Genuine product recommendations in context are fine; turning the community into a
					storefront is not.
				</p>
			</LegalSection>

			<LegalSection heading="5. Keep it legal and safe">
				<p>
					No illegal content, no content sexualizing minors, no threats or incitement of violence, and nothing
					that promotes self-harm. Crisis content is handled with care, not punishment (see below).
				</p>
			</LegalSection>

			<LegalSection heading="6. If you’re struggling">
				<p>
					You’re not alone, and you’re welcome here. If you post something that suggests you may be in crisis, a
					person — not just a machine — will review it with care. If you’re in immediate danger, please contact
					your local emergency number or a crisis helpline right away. In the U.S. you can call or text{" "}
					<strong>988</strong> (Suicide &amp; Crisis Lifeline). Outside the U.S., search for your local helpline.
				</p>
			</LegalSection>

			<LegalSection heading="7. How moderation works">
				<p>
					New posts and comments pass through automated safety screening. Most appear instantly. Anything flagged
					is checked by an AI reviewer and, if needed, a human moderator before it goes live. You’ll be notified
					if your content is held, approved, or not approved.
				</p>
			</LegalSection>

			<LegalSection heading="8. Strikes & consequences">
				<p>
					Removing content that breaks these guidelines adds a strike to your account. Repeated violations lead to
					escalating consequences — a warning, then a temporary suspension, then longer suspensions or a permanent
					ban for serious or persistent abuse. Strikes ease over time for people who get back on track.
				</p>
			</LegalSection>

			<LegalSection heading="9. Reporting & appeals">
				<p>
					See something that slipped through? Use the report option on any post or comment — reports are
					confidential. If you believe a moderation decision was a mistake, email{" "}
					<a className="text-coral hover:underline" href="mailto:support@thecyclevault.com">
						support@thecyclevault.com
					</a>{" "}
					and a human will take another look.
				</p>
			</LegalSection>
		</LegalLayout>
	);
}
