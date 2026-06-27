import { Link } from "react-router-dom";
import { LegalLayout, LegalSection } from "./LegalLayout";

const UPDATED = "June 27, 2026";

/** Forum Terms of Service. */
export default function TermsPage() {
	return (
		<LegalLayout title="Terms of Service" updated={UPDATED}>
			<p>
				These Terms govern your use of The CycleVault Social at <strong>social.thecyclevault.com</strong>. By
				creating an account or using the community, you agree to these Terms, our{" "}
				<Link to="/privacy" className="text-coral hover:underline">
					Privacy Policy
				</Link>
				, and our{" "}
				<Link to="/guidelines" className="text-coral hover:underline">
					Community Guidelines
				</Link>
				.
			</p>

			<LegalSection heading="1. Who can use the community">
				<p>
					You must be at least 13 years old (or the minimum age in your country) to create an account. By signing
					up, you confirm you meet this requirement.
				</p>
			</LegalSection>

			<LegalSection heading="2. Your account">
				<p>
					You’re responsible for activity on your account and for keeping your password secure. Don’t impersonate
					others, don’t create accounts to evade suspensions or bans, and don’t share your account. Usernames are
					pseudonymous; please don’t use a name that impersonates a real person or organization.
				</p>
			</LegalSection>

			<LegalSection heading="3. Acceptable use">
				<p>
					You agree to follow our{" "}
					<Link to="/guidelines" className="text-coral hover:underline">
						Community Guidelines
					</Link>
					. In short: be kind, don’t harass, don’t post medical misinformation or dangerous advice, don’t spam or
					advertise, and respect others’ privacy. We may remove content and restrict accounts that break these
					rules.
				</p>
			</LegalSection>

			<LegalSection heading="4. Your content">
				<p>
					You own the content you post. By posting, you grant us a non-exclusive, worldwide, royalty-free license
					to host, display, and distribute it within the community so the service can function. You’re responsible
					for what you post and confirm you have the right to share it. You can delete your own content at any
					time; deleting your account anonymizes your contributions.
				</p>
			</LegalSection>

			<LegalSection heading="5. Moderation & enforcement">
				<p>
					To keep the community safe, content may be reviewed by automated systems and human moderators before or
					after it appears. We may remove content, hold it for review, issue warnings or strikes, and temporarily
					or permanently suspend accounts that repeatedly or seriously violate these Terms or the Guidelines.
					Enforcement actions are recorded for accountability.
				</p>
			</LegalSection>

			<LegalSection heading="6. Not medical advice">
				<p>
					The CycleVault Social is a peer community, not a medical service. Content here is not medical advice and
					is not a substitute for a qualified healthcare professional. “Verified Clinician” badges indicate a
					credential check, not an endorsement of any specific advice. Always consult a clinician for health
					concerns, and seek emergency help in a crisis.
				</p>
			</LegalSection>

			<LegalSection heading="7. Supporter & payments">
				<p>
					The core community is free. An optional paid Supporter membership removes sponsored placements and adds
					cosmetic perks. Pricing and terms for paid features will be presented at the point of purchase. We do
					not store your card details — payments are handled by a PCI-compliant payment processor.
				</p>
			</LegalSection>

			<LegalSection heading="8. Sponsored products">
				<p>
					Some areas may show clearly-labeled “Sponsored” products or tools. These are paid placements, not
					behavioral ads — we don’t track you to target them. A sponsored label is not an endorsement; evaluate
					products yourself and consult a professional where appropriate.
				</p>
			</LegalSection>

			<LegalSection heading="9. Disclaimers & limitation of liability">
				<p>
					The community is provided “as is,” without warranties of any kind. To the maximum extent permitted by
					law, The CycleVault is not liable for indirect, incidental, or consequential damages arising from your
					use of the community or reliance on content posted by others.
				</p>
			</LegalSection>

			<LegalSection heading="10. Termination">
				<p>
					You can stop using the community and delete your account anytime. We may suspend or terminate access for
					violations of these Terms or the Guidelines, or where required by law.
				</p>
			</LegalSection>

			<LegalSection heading="11. Changes & contact">
				<p>
					We may update these Terms as the community evolves and will revise the date above. Continued use after
					changes means you accept them. Questions? Email{" "}
					<a className="text-coral hover:underline" href="mailto:support@thecyclevault.com">
						support@thecyclevault.com
					</a>
					.
				</p>
			</LegalSection>
		</LegalLayout>
	);
}
