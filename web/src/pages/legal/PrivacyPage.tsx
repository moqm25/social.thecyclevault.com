import { LegalLayout, LegalSection } from "./LegalLayout";

const UPDATED = "June 27, 2026";

/** Forum Privacy Policy — distinct from the iOS app's local-only policy. */
export default function PrivacyPage() {
	return (
		<LegalLayout title="Privacy Policy" updated={UPDATED}>
			<p>
				The CycleVault Social (“the community,” “we,” “us”) is a privacy-first, pseudonymous community operated by
				The CycleVault. This policy explains what we collect, what we deliberately don’t, and the choices you have.
				It covers <strong>social.thecyclevault.com</strong> only; the iOS app keeps your cycle data on your device
				and has its own policy.
			</p>

			<LegalSection heading="1. Our privacy promise">
				<p>
					We built this community so there’s as little about you to expose as possible. We do not run behavioral
					advertising, we do not sell or share your data, and we do not embed third-party tracking or ad SDKs.
					You participate under a <strong>pseudonymous username</strong> — no real name is required.
				</p>
			</LegalSection>

			<LegalSection heading="2. What we collect">
				<ul className="list-disc space-y-1 pl-5">
					<li>
						<strong>Account email</strong> — used only to sign in, verify your account, and reset your password.
						It is <strong>never shown publicly</strong> and is stored by our authentication provider, not in our
						community database.
					</li>
					<li>
						<strong>Profile</strong> — your chosen username, and optionally a display name, bio, and avatar.
					</li>
					<li>
						<strong>Content you create</strong> — posts, comments, votes, and reports you submit.
					</li>
					<li>
						<strong>Minimal operational records</strong> — moderation outcomes and audit entries needed to keep
						the community safe.
					</li>
				</ul>
			</LegalSection>

			<LegalSection heading="3. What we don’t collect">
				<ul className="list-disc space-y-1 pl-5">
					<li>No real name or government ID.</li>
					<li>No cycle, symptom, or health data from the iOS app — the two systems are separate.</li>
					<li>No precise location.</li>
					<li>
						No IP address stored in our database, and no advertising or cross-site tracking identifiers.
					</li>
					<li>No third-party ad networks, analytics SDKs, or social “like”/tracking pixels.</li>
				</ul>
			</LegalSection>

			<LegalSection heading="4. How we use your information">
				<p>
					To operate the community: show your content, run pseudonymous profiles, deliver notifications, run
					automated and human safety moderation, and prevent abuse. That’s it.
				</p>
			</LegalSection>

			<LegalSection heading="5. Service providers (processors)">
				<p>
					We use <strong>Google Firebase</strong> (Authentication, Cloud Firestore, Cloud Functions) to run the
					backend and <strong>GitHub Pages</strong> to serve the website. These providers process data on our
					behalf under their own security and privacy terms. We do not use advertising or analytics processors.
				</p>
			</LegalSection>

			<LegalSection heading="6. Cookies & local storage">
				<p>
					We use only the <strong>essential</strong> browser storage our sign-in provider needs to keep you
					logged in, plus your theme preference. We do not use tracking or advertising cookies, so there’s no
					cookie banner to click through.
				</p>
			</LegalSection>

			<LegalSection heading="7. Your rights & choices">
				<ul className="list-disc space-y-1 pl-5">
					<li>
						<strong>Export</strong> — download your posts, comments, and votes anytime from Settings.
					</li>
					<li>
						<strong>Delete</strong> — delete your account from Settings; your profile is removed and your
						content is anonymized.
					</li>
					<li>
						<strong>Access & correction</strong> — edit your profile in Settings, or email us.
					</li>
					<li>
						Depending on where you live (e.g. the EU/UK under GDPR, or California under CCPA/CPRA), you may have
						additional rights to access, correct, or erase your data; contact us to exercise them.
					</li>
				</ul>
			</LegalSection>

			<LegalSection heading="8. Security">
				<p>
					All traffic is encrypted in transit (HTTPS). Passwords are hashed by our authentication provider — we
					never see or store them. Access to data is governed by strict, default-deny security rules, and
					sensitive changes happen only through our server.
				</p>
			</LegalSection>

			<LegalSection heading="9. Children">
				<p>
					The community is not intended for anyone under 13 (or the minimum age required in your country). We do
					not knowingly collect information from children.
				</p>
			</LegalSection>

			<LegalSection heading="10. Changes & contact">
				<p>
					We’ll update this policy as the community grows and revise the date above. For privacy questions or
					requests, email <a className="text-coral hover:underline" href="mailto:privacy@thecyclevault.com">privacy@thecyclevault.com</a>.
				</p>
			</LegalSection>
		</LegalLayout>
	);
}
