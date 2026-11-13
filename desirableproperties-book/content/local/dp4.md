# DP4 – Data Sovereignty and Privacy

*Your data, your terms: meaningful control over use, sharing, and protection, with visible limits and accountable follow-through.*

![Illustration for Desirable Property DP4: Data Sovereignty and Privacy](/content/local/assets/dp/DP4.webp)

<!-- dp-local-version: 1.0 | standardized: 2026-07-27 -->
<!-- govhub-sync: ml=ML-Draft-011 revision=04 submission=5196ef71-4247-4a82-9a90-a668152c9c5f hash=3fdafd64ebe13c5b synced=2026-11-13T08:20:02Z -->

---

## 1. Purpose of This Draft

This draft articulates Desirable Property 4 (DP4) as the condition under which participants and communities can meaningfully govern data about themselves and their activity in the Meta-Layer.

DP4 does not treat privacy as a settings menu, a compliance ritual, or a legal disclaimer. It defines the conditions under which claims of ownership, consent, confidentiality, deletion, and portability remain meaningful in practice.

The core claim is that sovereignty over data depends on more than access controls. It depends on whether collection, inference, retention, sharing, and reuse are bounded by visible purposes, governed by revocable permissions, and constrained by structures that communities can understand and audit.

If DP4 is weak, predictable failures follow: consent theater, surveillance-by-default, inference without accountability, lock-in through broken portability, deletion promises that stop at the first vendor boundary, and community rules that cannot survive contact with underlying data pipelines.

DP4 therefore functions as a precondition for multiple later properties. Agency cannot be exercised over invisible data flows. Governance cannot constrain systems that communities cannot inspect. Ethical AI cannot be meaningful where the data it sees, stores, or trains on is structurally uncontrolled.

DP4 does not resolve all legal, jurisdictional, or sector-specific privacy questions. It defines the minimum conditions under which sovereignty and privacy remain real at the interface where data is created, combined, interpreted, and acted upon.

---

## 2. Problem Statement

In today's web, privacy is often presented as disclosure without control.

Participants are shown banners, terms updates, and granular-looking toggles, yet the underlying system still optimizes for maximal collection, indefinite retention, behavioral inference, and partner expansion. In many cases, the formal interface of consent exists while the operational reality of choice does not.

This produces recurring failures:

- participants cannot tell what is being collected, for what purpose, for how long, or by whom
- data collected for one function expands into advertising, analytics, resale, or model training
- sensitive inferences are derived from behavior without clear notice, recourse, or deletion pathways
- data exports preserve liability but not usability, making exit technically legal but practically costly
- account deletion rarely maps cleanly to embeddings, downstream processors, backups, or partner copies
- communities cannot enforce stricter data norms inside their spaces because underlying systems remain vendor-shaped

These failures are not edge cases. They are structural consequences of architectures designed to treat data accumulation as default value creation.

DP4 addresses this by defining data sovereignty as an operational condition. Privacy becomes meaningful only when participants and communities can see the active terms of data use, limit those terms in practice, revoke permissions without fiction, and move or leave without losing the structure of their digital lives.

---

## 3. Threats and Failure Modes

### 3.1 Consent theater

Interfaces bundle unrelated processing into a single act of acceptance.

**Example:** A participant accepts a terms update to continue using a service and, in doing so, silently authorizes secondary uses of behavioral data for recommendation tuning, advertising, and model training.

**Why this matters:** The system records consent, but the participant did not experience a meaningful choice. DP4 treats this as a sovereignty failure, not a paperwork issue.

Consent theater occurs when a system records agreement without providing participants with a meaningful opportunity to understand or control the uses of their information. A participant may authorize one function while unknowingly permitting additional uses that are unrelated to the original purpose.

**Example:** A community application requires participants to accept updated terms before continuing to use the service. The agreement permits ordinary participation but also authorizes behavioral data to be used for advertising, recommendation systems, and AI model training. Although the participant accepts the terms to retain access, the system treats that acceptance as authorization for several distinct processing activities.

**Why this matters:** Formal agreement does not establish meaningful consent when unrelated purposes are combined into a single decision. Participants may be unable to distinguish the information required to provide a service from information collected for secondary uses. The resulting consent record creates an appearance of authorization without demonstrating that the participant had a meaningful choice.

DP4 addresses this failure through purpose binding and the consent stack. Distinct uses of participant information must remain separately identifiable and governable. Participants should be able to approve, decline, or revoke permissions for secondary uses without unnecessarily losing access to the underlying service.

Without these distinctions, consent becomes a condition of participation rather than an expression of participant control. Privacy remains formally disclosed but operationally constrained by the system's terms.

### 3.2 Purpose creep and secondary use

Data collected for one function expands into new products, ranking systems, partner programs, or model behaviors without a fresh social contract.

**Example:** Location data collected for safety or delivery is later used for engagement scoring, ad targeting, or brokered partner analytics.

**Why this matters:** The participant's mental model of risk becomes false. Trust erodes even where no obvious breach has occurred.

Purpose creep occurs when information collected for a specific function is later used for additional purposes without giving participants a meaningful opportunity to understand or authorize those changes. An initial permission may be treated as continuing authorization even when the scope of processing expands beyond the purpose originally disclosed.

**Example:** A community delivery application collects a participant's location to coordinate deliveries and support safe service operation. The same information is later used to measure engagement, target advertisements, or provide behavioral insights to third-party processors. Although the participant authorized location access for delivery, that permission did not necessarily extend to these secondary uses.

**Why this matters:** Participants cannot meaningfully govern their information when the purposes governing its use change without their knowledge. A permission granted under one set of expectations may become the basis for activities the participant did not anticipate or approve. This creates a gap between the participant's understanding of how their information is used and the system's actual processing practices.

DP4 addresses this failure through purpose binding. Collection and processing activities must remain connected to their declared purposes, and material changes must require visible reauthorization, reclassification, or zone-level review before the new use begins. Participants should be able to understand what has changed and exercise meaningful control over permissions for additional uses.

Without these safeguards, permission for a limited function can gradually become authorization for unrelated processing. Data sovereignty depends on ensuring that the conditions governing information remain visible, bounded, and enforceable as its uses evolve.

### 3.3 Illusory portability

Export exists formally but fails functionally.

**Example:** A participant downloads an archive that contains files and timestamps but omits social graph edges, permission history, role context, provenance, or schemas needed to restore meaningful continuity elsewhere.

**Why this matters:** Exit is made to look possible while dependency is preserved. DP4 requires portability that preserves usable structure, not only raw payloads.

Illusory portability occurs when participants can formally export their information but cannot meaningfully use it to continue their activities elsewhere. A system may provide access to stored records while omitting the relationships, permissions, roles, and contextual structures that give those records practical value.

**Example:** A participant leaves a community platform and downloads an archive containing files, messages, and timestamps. The export excludes relationship edges, role metadata, permission history, provenance markers, and the schemas needed to reconstruct interactions in another system. Although the participant receives a copy of their information, the structure required to restore meaningful participation is lost.

**Why this matters:** Data portability does not provide meaningful control when leaving a platform requires participants to abandon the relationships, context, and continuity established through their participation. An export that preserves content but not its usable structure may satisfy a formal requirement while maintaining practical dependence on the original system.

DP4 addresses this failure through meaningful portability. Exports must preserve the information and supporting structures necessary for practical migration, including relevant relationships, permissions, provenance, and contextual metadata. Where information or functionality cannot be transferred, systems must disclose those limitations and identify any resulting degradation.

Without these conditions, the ability to leave remains largely procedural. Data sovereignty requires that participants and communities can move between systems without unnecessarily losing the structure and continuity that make their information useful.

### 3.4 Inference without accountability

Systems derive high-stakes conclusions from behavioral traces without clearly governing how those inferences are created, used, challenged, or removed.

**Example:** A wellness application infers stress or depression risk from typing cadence and browsing patterns, then shares a derived score with an advertising or insurance intermediary.

**Why this matters:** The participant never explicitly submitted the sensitive category, yet is still acted upon as if they had.

Inference without accountability occurs when systems derive information about participants from their behavior without providing meaningful visibility into how those conclusions are produced, used, or shared. Such information may reveal sensitive characteristics or influence decisions even when participants never directly disclosed the underlying attributes.

**Example:** A wellness application analyzes typing cadence, search activity, and other behavioral patterns to estimate a participant's stress level. The resulting inference is shared with a third-party processor for purposes beyond the application's original function. Although the participant did not explicitly provide information about their emotional state, the system creates and distributes a derived assessment that may influence how the participant is classified or treated.

**Why this matters:** Information generated through inference can be as consequential as information directly supplied by a participant. When these conclusions remain invisible or cannot be challenged, participants may be subject to decisions based on interpretations they did not authorize, cannot verify, or may have reason to dispute. Inaccurate or misleading inferences can persist across systems, creating consequences that extend beyond the original interaction.

DP4 addresses this failure through sensitive inference governance, purpose binding, and auditability of use. Significant inferences must remain connected to their sources, declared purposes, and applicable permissions. Participants must have meaningful opportunities to understand consequential inferences, challenge inaccurate conclusions, and limit their use or downstream disclosure where applicable.

Without these protections, systems can create new forms of personal information that operate outside the participant's practical control. Data sovereignty requires that derived information remain governable rather than becoming exempt from accountability because it was generated through automated analysis.

### 3.5 Retention without sunset

Data persists because retention is cheap, deletion is operationally inconvenient, and analytics cultures prefer indefinite memory.

**Example:** A participant deletes an account, but vector embeddings, partner datasets, abuse-model features, and backup systems continue to retain traces with no coherent deletion pathway.

**Why this matters:** Sovereignty requires time bounds. Without them, institutions remember indefinitely while participants bear the burden of asymmetrical memory.

Retention without sunset occurs when personal information remains stored or accessible after the purpose for which it was collected has ended. Account deletion or withdrawal of permission may remove information from a participant-facing service while leaving copies, derived artifacts, and associated records in downstream systems without a defined retention limit or verifiable deletion pathway.

**Example:** A participant deletes an account from an online service with the expectation that the associated information will be removed. Although the account is no longer accessible, copies of its contents remain in backup systems, partner databases, and analytics pipelines. Derived artifacts, including behavioral profiles and embeddings, may also persist without clear expiration conditions or a mechanism for confirming their removal.

**Why this matters:** Data sovereignty requires meaningful limits on institutional retention. When information persists indefinitely, participants may remain exposed to future uses, disclosures, or inferences long after their original participation has ended. The ability to delete an account does not provide meaningful control when the underlying information and its derivatives continue to exist beyond the participant's visibility or influence.

DP4 addresses this failure through retention clocks and propagation discipline. Information must remain subject to visible, purpose-bound or time-bound retention conditions. Deletion, correction, and withdrawal requests must propagate to known downstream processors, with auditable records indicating which actions have been completed, which remain pending, and where technical limitations prevent full removal.

These protections do not require guarantees of perfect erasure where information has already been copied, transformed, or incorporated into systems that cannot fully reverse its use. They require transparent accounting of retention limits, propagation outcomes, and unresolved obligations.

Without these conditions, deletion becomes a change in account status rather than a meaningful reduction in retained information. Data sovereignty depends on ensuring that information does not remain indefinitely available simply because a system has the technical capacity to preserve it.

### 3.6 Cross-context correlation

Identifiers, device graphs, and fingerprinting techniques merge activity across settings that participants experienced as distinct.

**Example:** Pseudonymous participation in a civic forum is quietly linked to shopping behavior, social browsing, or location history through shared infrastructure.

**Why this matters:** Plural identity becomes decorative. Communities cannot sustain contextual integrity if correlation silently defeats boundaries.

Cross-context correlation occurs when information from separate areas of a participant's digital life is linked without their knowledge or meaningful authorization. Shared identifiers, device graphs, fingerprinting, and integrated processing systems may allow activities intended to remain distinct to be associated with the same participant.

**Example:** A participant contributes to a community forum using a pseudonymous identity that does not publicly reveal their personal information. The infrastructure supporting the forum also processes shopping activity, browsing behavior, or location history. Through shared identifiers or behavioral signals, these activities become associated with the participant's forum contributions, allowing information from otherwise separate contexts to be combined into a broader profile.

**Why this matters:** Contextual separation allows participants to engage in different communities without exposing unrelated aspects of their lives. When systems silently connect these activities, pseudonymity may no longer provide the expected protection, and information disclosed within one setting may influence how participants are interpreted or treated in another.

DP4 addresses this failure through persona boundaries, purpose binding, and consent propagation. Access permissions must remain scoped to the relevant persona or context, and information derived within one context must retain those boundaries as it moves between systems. Linking separate personas must require an explicit participant decision rather than occur as an unintended consequence of shared infrastructure or integrated services.

These protections do not require participants to maintain completely disconnected digital identities. They require that connections between contexts remain visible, deliberate, and subject to meaningful participant control.

Without these conditions, separate identities may exist only at the interface while the underlying systems continue to assemble a unified profile. Data sovereignty depends on preserving contextual boundaries not only in what participants choose to disclose, but also in what systems are permitted to connect, infer, and reuse.

### 3.7 False anonymity and weak de-identification

Organizations describe datasets as anonymized even where re-identification remains plausible or contractually enabled downstream.

**Example:** A mobility dataset stripped of names still exposes sparse routines in a small town, allowing individuals to be reconstructed through outside knowledge.

**Why this matters:** DP4 requires honesty about residual risk. "De-identified" cannot be treated as a magic word that dissolves responsibility.

False anonymity occurs when information is presented as anonymous or de-identified despite retaining characteristics that may allow individuals to be identified. Removing names and other direct identifiers does not necessarily prevent re-identification when behavioral patterns, contextual details, or external datasets can be used to reconstruct identity.

**Example:** A transportation dataset from a small town removes participant names before being shared for analysis. Although direct identifiers are absent, recurring travel routes, departure times, and frequently visited locations may reveal recognizable patterns. When combined with publicly available information or local knowledge, these patterns may allow individual participants to be identified.

**Why this matters:** Participants and communities may make decisions about information sharing based on the assumption that removing direct identifiers eliminates the possibility of identification. When residual risks are not disclosed, information may be shared, analyzed, or reused under privacy expectations that the underlying data cannot reliably support.

DP4 addresses this failure through data minimization, purpose binding, and transparent assessment of re-identification risk. Systems should evaluate whether remaining attributes, contextual patterns, or combinations with external information could reasonably expose participant identities before data is transferred or reused. The limits of de-identification should remain visible to participants and communities, particularly where datasets involve small populations or sensitive activities.

Zone-scoped privacy profiles can establish additional restrictions on the disclosure, processing, and reuse of information where re-identification could create elevated risks. These protections may include limiting the granularity of shared information, restricting access to sensitive datasets, or requiring privacy-preserving methods appropriate to the context.

Without these safeguards, de-identification may create an appearance of protection while leaving participants exposed to identification through indirect means. Data sovereignty requires honest accounting of residual risk rather than treating the removal of names as sufficient evidence of anonymity.

### 3.8 Partner sprawl without propagation

Deletion, revocation, and correction stop at the first layer of control.

**Example:** A participant deletes messages in one tool, but analytics vendors, cloud backups, and SDK partners continue to retain copies without visibility or participant recourse.

**Why this matters:** Sovereignty that fails at the first subcontractor boundary is not sovereignty.

Partner sprawl without propagation occurs when information is distributed across multiple systems or organizations without reliable mechanisms for communicating and applying subsequent changes to that information. A participant may delete, correct, or revoke access to information in the originating system while copies, derived artifacts, or associated permissions remain unchanged elsewhere.

**Example:** A participant deletes messages from a community application. The messages disappear from the participant-facing interface, but copies remain in cloud backups, analytics services, and partner systems that previously received the information. Because the originating application does not maintain effective downstream propagation records, these systems may continue to retain or process information that the participant believes has been removed.

**Why this matters:** Participant control becomes fragmented when actions taken in one system do not extend to other systems that received the same information. Deletion, correction, and revocation may appear successful while downstream copies remain available for continued use. Without visibility into where information has traveled and whether changes have been honored, participants cannot reliably understand the consequences of their decisions.

DP4 addresses this failure through propagation discipline, purpose binding, and auditable downstream obligations. Systems must maintain sufficient records of information sharing to communicate relevant deletion, correction, and permission changes to known downstream processors. Propagation outcomes must remain visible and accountable, distinguishing completed actions from pending requests, failures, and limitations that prevent full compliance.

These mechanisms do not guarantee that every copy can be located or removed, particularly where information has been transferred outside enforceable relationships or incorporated into systems that cannot fully reverse prior processing. They require systems to preserve traceability, communicate applicable obligations, and disclose unresolved propagation failures rather than presenting local changes as universal completion.

Without these conditions, participants may exercise control over an interface while losing practical influence over the information distributed through its wider network. Data sovereignty requires that downstream processing remain accountable to the permissions, corrections, and retention limits governing the original information.

### 3.9 Youth and vulnerable-context overexposure

Defaults optimized for adult engagement expose minors and vulnerable users to data-intensive patterns they are less equipped to assess or contest.

**Example:** A youth-oriented social tool enables location sharing, behavioral profiling, or AI-mediated emotional inference by default.

**Why this matters:** DP4 requires higher baselines where stakes are higher. Uniform defaults can produce unequal harm.

### 3.10 Persona collapse

Separate contexts a participant deliberately kept apart are merged, either through shared infrastructure, an integration that resolves both to one account, or a vault whose contents are exposed as a single undifferentiated store.

**Example:** A participant maintains distinct personas for professional and health-support contexts. A newly added recommendation service reads across both because it was granted account-level rather than persona-level access.

**Why this matters:** Contextual integrity is the practical form most privacy takes. Collapse is usually irreversible: once two contexts have been linked, the inference cannot be withdrawn, and no subsequent revocation restores the separation.

Persona collapse occurs when information associated with distinct participant personas is combined or made accessible across contexts without meaningful authorization. Although participants may maintain separate identities, roles, or participation settings, shared infrastructure and broadly scoped permissions can undermine the boundaries intended to keep those contexts distinct.

**Example:** A participant maintains one persona for professional networking and another for participation in a health support community. A recommendation service is introduced with broad access to information associated with both personas. The service begins combining professional activity with sensitive community interactions to generate recommendations or participant profiles, despite the participant having maintained these contexts separately.

**Why this matters:** Participants disclose different information in different contexts according to the relationships, expectations, and purposes associated with each setting. When those boundaries are bypassed, information shared within one context may become available for unrelated uses in another. This can expose sensitive associations, undermine trust, and create consequences that cannot be fully reversed once information has been combined or disclosed.

DP4 addresses this failure through persona-scoped permissions, purpose binding, and explicit authorization for cross-context correlation. Access granted within one persona must not automatically extend to another, including when services operate through shared infrastructure or integrated applications. Where participants choose to connect personas, the scope and consequences of that connection must remain understandable and subject to meaningful control.

These protections do not require every persona to function as a completely isolated technical identity. They require systems to preserve the contextual boundaries participants establish and prevent those boundaries from being silently overridden by broad access privileges, service integrations, or downstream processing.

Without these conditions, separate personas may exist only as interface distinctions while the underlying system treats their information as a unified profile. Data sovereignty requires that participants retain meaningful control over when, why, and how information from different parts of their digital lives may be connected.

Failed data sovereignty can also encourage retreat into silos, fabricated accounts, or manufactured activity while extraction continues. That response can damage the social signals on which others rely; privacy protection should not depend on fabricating a digital presence. Pseudonymity itself is not evidence of deception.

---

## 4. Core Principle

**Data must retain meaning, consent, and accountability as it moves across systems. If data loses its binding to purpose, provenance, or permissions under transformation, sovereignty collapses into simulation.**

Data sovereignty and privacy in the Meta-Layer require that personal and community data be collected, inferred, stored, shared, and reused only under visible, bounded, and governable conditions.

Those conditions must include:

- clear purpose binding
- minimization of collection, access, and retention
- meaningful consent and withdrawal
- portability with practical utility
- deletion or attenuation pathways that propagate as far as technically possible
- auditability of significant access, inference, and transfer events
- community capacity to impose stricter norms within governed zones

These conditions are not independent features. Together, they form the operational foundation of data sovereignty. Each mechanism protects a distinct aspect of participant and community control, while depending on complementary protections to remain effective. Consent without meaningful portability can still leave participants locked into a platform. Deletion without downstream propagation can leave copies and derived information beyond the reach of the original request. Transparency without auditability and accountability can reveal stated practices without providing meaningful evidence that those practices were followed.

The Meta-Layer therefore treats privacy as a coordinated system of protections rather than a collection of isolated controls. Data sovereignty depends not only on the presence of individual mechanisms, but also on their ability to operate together across information collection, use, transfer, transformation, and eventual deletion or retention.

In today's web, these conditions rarely hold together. A system may disclose collection without limiting reuse, provide deletion without propagation, or offer export without restoration value. DP4 treats such partial compliance as insufficient.

The Meta-Layer reframes privacy as operational control at the point of interaction.

**Example:** A participant opens a data lens and sees active purposes, relevant processors, current retention clocks, sensitive inferences attached to their account, and downstream systems that have accessed their data. They can revoke training permission, export their activity in an interoperable format, contest a high-risk inference, and receive a propagation receipt for deletion requests.

**What this feels like:** Privacy stops being a maze of legal text and becomes a set of understandable levers tied to real system behavior.

**Without this:** Privacy becomes trust in opacity, and opacity fails precisely where accountability matters most.

Operational control means that participants and communities have meaningful, ongoing authority over how their information is collected, accessed, processed, shared, retained, and removed. This requires more than confidentiality or formal consent. It requires understandable information about data practices, actionable permissions, and mechanisms for verifying whether participant decisions have been honored.

**Example:** A participant accesses a community platform and can inspect the purposes for which their information is collected, the permissions currently in effect, the categories of recipients that have accessed it, and the retention conditions governing its use. The participant can also review consequential inferences associated with their information and identify available mechanisms for challenging them. If the participant withdraws permission for AI training, the system records and applies that change to future processing within its control. If the participant requests deletion, the system provides visibility into downstream notifications, completed actions, pending obligations, and any limitations that prevent full removal.

**Why this matters:** Privacy cannot depend solely on information remaining hidden or on participants trusting that organizations will follow published policies. Meaningful data sovereignty requires participants to understand the practical consequences of information use and to exercise control over those consequences as information moves between systems. Permissions that cannot be inspected, changed, or meaningfully enforced provide only limited operational authority.

DP4 supports operational control through purpose binding, consent management, retention clocks, meaningful portability, sensitive inference governance, and auditable propagation of participant decisions. These mechanisms allow permissions and obligations to remain associated with information throughout its lifecycle, rather than existing only at the point of collection.

Participant-facing controls may bring these capabilities together through a coherent interface that displays active permissions, declared purposes, relevant access and processing history, retention conditions, and available actions. Such an interface should distinguish requested actions from confirmed outcomes and disclose limitations where complete enforcement or verification is not technically possible.

Without operational control, privacy protections may exist in policy or system architecture without becoming meaningful capabilities for participants. Data sovereignty requires that participants and communities can understand the rules governing their information, act within those rules, and assess whether the system has fulfilled its obligations.

---

## 5. Primary Mechanisms and Structural Conditions

### 5.1 Purpose binding

Every collection and processing pathway must declare its purpose in terms legible to both participants and communities. Material changes in purpose require visible reauthorization, reclassification, or zone-level review.

**Example:** A discussion zone permits summarization for moderation assistance but prohibits model training on participant content unless a separate, revocable grant is given.

Without purpose binding, consent collapses into blanket exposure.

Purpose binding requires information to remain associated with the specific, declared purposes for which its collection, processing, and use have been authorized. Permission granted for one purpose must not be treated as general authorization for unrelated or materially different uses. Purpose restrictions must remain applicable as information moves between systems, processors, and participating organizations.

**Example:** A community discussion platform uses AI-assisted tools to help moderators identify potentially harmful content. Participants understand that their contributions may be processed for this moderation purpose. The platform subsequently proposes using those same conversations to train a general-purpose AI model. Because model training represents a materially different purpose, the existing moderation authorization does not automatically extend to the proposed use. Participants and the community are informed of the new purpose, and the applicable authorization must be established before the additional processing begins.

**Why this matters:** Participants and communities make decisions about information sharing within particular contexts and expectations. When systems expand those purposes without meaningful authorization, information supplied for a limited function may become available for uses that participants neither anticipated nor accepted. This undermines the relationship between informed participation, permission, and accountability.

DP4 addresses this failure by binding information and derived artifacts to declared purposes and applicable permissions. Systems must distinguish authorized uses from proposed new uses and provide mechanisms for reviewing and approving material changes. Where a new purpose requires additional participant or community authorization, processing for that purpose must remain restricted until the relevant conditions have been satisfied.

Purpose binding must also extend to downstream processors. Information transferred to another system does not become unrestricted simply because it has changed location, format, or processing environment. Recipients remain subject to the applicable purpose limitations, and any proposed expansion of use must follow the relevant authorization process.

Without these conditions, consent becomes an open-ended permission rather than a meaningful expression of participant and community intent. Data sovereignty requires that the purposes governing information remain explicit, enforceable, and subject to renewed authorization when materially changed.

### 5.2 Data minimization by design

Systems must begin from the least collection, retention, and sharing compatible with the function being offered, and expand only through visible, justified choices.

**Example:** A messaging tool does not upload contacts by default. Contact sync is presented as a distinct choice with plain-language scope and a reversible off switch.

This is not anti-functionality. It is a refusal to make maximal collection the silent baseline.

Data minimization by design requires systems to limit the collection, processing, retention, and disclosure of information to what is necessary for specific, declared purposes. The technical ability to collect information does not establish a legitimate need to do so. Systems should operate with the least information and access privileges required for their intended functions, rather than treating broad collection as the default.

**Example:** A community messaging application allows participants to communicate without requiring access to their device contacts. Contact discovery is available as an optional feature. When a participant chooses to use it, the application explains what information is needed, how it will be processed, and whether it will be retained or shared. The participant can decline the feature without losing access to core messaging functions and can withdraw the associated permission when contact discovery is no longer desired.

**Why this matters:** Unnecessary collection creates additional opportunities for exposure, misuse, unauthorized inference, and downstream disclosure. Once information has entered a system, it may be copied, transformed, or distributed in ways that are difficult to reverse. Reducing collection at the outset limits these risks and reduces the burden placed on participants to manage information that was not necessary to provide the service.

DP4 addresses this failure by making minimization a design constraint rather than an optional privacy setting. Systems should distinguish information required for a declared function from information requested for additional features or purposes. Optional collection must remain subject to appropriate authorization, purpose limitations, and retention conditions. Where feasible, systems should prefer processing methods that avoid unnecessary disclosure or persistent storage.

Minimization must continue throughout the information lifecycle. Data that was necessary for an initial function does not automatically remain necessary indefinitely, and information collected for one feature must not become generally available to unrelated functions. Retention, access, and downstream sharing should remain limited to what the authorized purpose requires.

Without these conditions, participants may be asked to surrender more information than a service needs simply to participate. Data sovereignty requires systems to reduce unnecessary information collection before relying on consent, access controls, or deletion mechanisms to manage the resulting risks.

### 5.3 Consent stack

Permission must be layered, granular, and revocable, with separate scopes for distinct categories of data use.

This draft uses **consent stack** as a mechanism-level abstraction: a structured set of permissions that distinguish service provision, analytics, sharing, automation, and training from one another.

**Example:** A participant permits AI-assisted summarization of their workspace but declines training use and third-party analytics. Revoking training permission does not disable the summarization feature they actually wanted.

The consent stack makes partial participation possible without forcing blanket surrender.

The consent stack provides a structured mechanism for expressing, managing, and enforcing permissions across distinct uses of participant information. Authorization for one purpose must not be treated as blanket permission for unrelated collection, processing, sharing, or reuse. Permissions must remain sufficiently granular to reflect meaningful differences between purposes, features, recipients, and participation contexts.

**Example:** A participant uses a community platform that provides AI-assisted discussion summaries. The participant authorizes the processing necessary to generate summaries but does not authorize the use of their conversations for general-purpose AI model training or disclosure to external analytics providers. The platform maintains these permissions separately, allowing the participant to use the summarization feature without automatically enabling unrelated processing.

**Why this matters:** Participants may value particular services while objecting to secondary uses of the information those services require. When permissions are bundled into a single acceptance decision, participants may be pressured to authorize processing beyond what is necessary for their intended participation. This weakens the relationship between informed consent, purpose limitations, and meaningful control.

DP4 addresses this failure through a consent stack that distinguishes applicable participant permissions, community-level governance conditions, and system-level constraints. Permissions must remain connected to their declared purposes and relevant contexts, with mechanisms for inspecting, granting, declining, and withdrawing authorization where those choices are applicable. A permission granted at one level must not silently override restrictions established at another.

Consent changes must also have operational consequences. When a participant withdraws authorization for a particular use, systems must prevent further processing under that permission within the applicable scope and communicate relevant changes to known downstream processors. Previously completed processing, retained copies, and derived artifacts remain subject to the applicable retention, revocation, and propagation requirements, including disclosure of technical limitations.

The consent stack does not require every function to operate independently of the information technically necessary to provide it. It requires systems to distinguish necessary processing from optional or unrelated uses and to avoid conditioning access to one function on authorization for another without a justified dependency.

Without these conditions, consent becomes a broad contractual acceptance rather than a meaningful expression of participant and community intent. Data sovereignty requires permissions that are understandable, purpose-specific, context-aware, and capable of being exercised throughout the information lifecycle.

### 5.4 Meaningful portability

Portability must preserve enough structure to support continuity, not just compliance.

This includes, where technically honest and appropriate:

- stable identifiers
- schemas
- role metadata
- interaction history
- provenance markers
- permissions history
- relationship edges needed for mainstream migration use cases

**Example:** A participant exports a discussion archive that can be imported into another tool with thread structure, moderation history, authorship context, and trust signals intact.

Without this, "take your data with you" becomes formal rights without real exit.

Meaningful portability requires systems to support the practical migration of participant and community information between compatible environments. Portability must preserve not only the underlying content but also the relationships, permissions, roles, provenance, and contextual structures necessary to continue activities elsewhere. Providing downloadable files without the information required to interpret and reuse them does not, by itself, establish meaningful portability.

**Example:** A community decides to migrate from one discussion platform to another. The originating platform provides an export containing discussion content, thread structure, authorship information, moderation history, role metadata, and relevant relationship and permission records. The receiving platform can interpret the supported structures and reconstruct the community's discussions with sufficient continuity for participants to resume their activities without rebuilding the entire environment.

**Why this matters:** Participants and communities invest time in establishing relationships, organizing information, developing shared practices, and building trust within digital systems. When those structures cannot be transferred, changing platforms may require abandoning significant portions of that accumulated value. Formal access to exported information offers limited practical freedom when migration results in the loss of essential context or functionality.

DP4 addresses this failure by requiring portability to preserve usable structure rather than raw payloads alone. Where technically honest and appropriate, exports should include stable identifiers, schemas, role metadata, interaction history, provenance markers, permissions history, and relationship edges necessary for practical migration. These elements allow receiving systems to interpret the information and reconstruct supported aspects of the originating environment.

Meaningful portability must also respect applicable permissions, privacy boundaries, and the rights of other participants. Exporting a participant's information does not automatically authorize the disclosure of another participant's private information or guarantee that trust relationships, moderation decisions, or access privileges will carry identical authority in a different system. Receiving environments may require validation, adaptation, or renewed authorization before particular structures can be restored.

Systems must disclose material omissions, unsupported structures, and expected degradation where full continuity cannot be achieved. Portability does not require perfect replication of every feature or relationship, but it does require an honest and usable pathway for migration rather than an export that preserves content while making practical continuation impossible.

Without these conditions, participants and communities may remain dependent on an originating platform despite possessing formal rights to retrieve their information. Data sovereignty requires that the ability to leave a system be supported by the practical ability to carry forward the information and context necessary for meaningful participation elsewhere.

### 5.5 Retention clocks and propagation discipline

Retention must be bounded by event-driven or purpose-bound clocks, not indefinite convenience. Deletion, correction, and revocation requests must propagate to known downstream systems with auditable outcomes.

This draft uses **retention clocks** as a mechanism-level abstraction: visible timers tied to categories of data and stated purposes.

**Example:** A participant can see that support logs expire in 30 days, abuse-review evidence in 180 days, and AI training exclusion tags apply immediately going forward. When deletion is requested, the system generates a receipt chain showing which processors complied, which are pending, and which limits remain technically unresolved.

DP4 does not require dishonest promises of perfect erasure. It requires propagation discipline and truthful accounting.

Retention clocks and propagation discipline establish time-bound limits on information use and accountable mechanisms for communicating deletion, correction, and permission changes across systems. Information must remain subject to defined retention conditions, while participant decisions affecting that information must be communicated to known downstream processors and tracked through auditable outcomes.

**Example:** A community platform provides participants with visibility into the retention conditions governing different categories of information. Support requests may have a retention period of 30 days, while moderation records may be retained for 180 days under a separately declared purpose. A participant who withdraws permission for AI model training can inspect the resulting change in authorization. When the participant requests deletion, the platform records the request and reports which downstream processors have completed the applicable action, which remain pending, and where technical or other limitations prevent full removal.

**Why this matters:** Participants and communities cannot exercise meaningful control over information when retention periods are indefinite, undisclosed, or disconnected from the purposes for which information was collected. Similarly, deletion and correction requests provide limited protection when they affect only the originating system while copies or derived artifacts remain unchanged elsewhere. Without visibility into retention obligations and propagation outcomes, participants must rely on institutional assurances rather than verifiable evidence of follow-through.

DP4 addresses these failures through explicit retention clocks associated with information categories, declared purposes, and applicable governance conditions. Retention limits must remain understandable and enforceable, with information subject to deletion, expiration, or other authorized disposition when the relevant conditions are met. Continued retention must remain justified by an applicable purpose or obligation rather than by the technical ability to preserve information indefinitely.

Propagation discipline requires systems to maintain sufficient records of downstream information sharing to communicate applicable deletion, correction, and revocation requests to known recipients. These requests must produce auditable outcomes that distinguish completed actions from pending obligations, unsuccessful attempts, and disclosed limitations. A locally completed request must not be represented as universally fulfilled when downstream processing remains unresolved.

Retention and propagation mechanisms must also account for derived information, backups, and processing environments where immediate removal or reversal may not be technically possible. Withdrawal of permission can restrict future authorized use without necessarily reversing previously completed processing. Systems must disclose relevant limitations and preserve accountability for outstanding obligations rather than promising forms of erasure or reversal they cannot reliably perform.

Without these conditions, retention policies become statements of intent and participant requests become interface actions without dependable operational consequences. Data sovereignty requires that information have accountable retention boundaries and that changes to its permitted use remain traceable as it moves through participating systems.

### 5.6 Sensitive inference governance

Derived data can be more consequential than submitted data. High-risk inferences therefore require stronger conditions than ordinary processing.

This includes inferences relating to health, finances, minors, politics, biometric patterns, relational vulnerability, and similar domains of elevated risk.

**Example:** A system that predicts self-harm risk from behavioral cues must disclose that such inference exists, limit its downstream use, provide human escalation where appropriate, and prohibit repurposing for advertising or engagement optimization.

Inference must be governable as first-class data, not treated as exempt because it was machine-generated.

Sensitive inference governance establishes additional protections for information derived from participant data when that information may reveal sensitive characteristics, create significant risks, or influence consequential decisions. Derived information must not be treated as unrestricted simply because it was generated through analysis rather than directly supplied by a participant. The sensitivity and potential consequences of an inference may exceed those of the individual observations from which it was produced.

**Example:** A participant uses a community wellness application to record daily activities and routines. Through behavioral analysis, the system generates an assessment suggesting that the participant may be experiencing depression or financial stress. Although the participant did not directly disclose either condition, the resulting inference may reveal sensitive information or influence how the participant is classified, treated, or offered services. The system must therefore govern the inference according to its potential consequences, rather than assuming that permissions associated with the original activity records authorize every subsequent use.

**Why this matters:** Inferences can transform ordinary behavioral information into sensitive assessments that participants may not anticipate, understand, or consider accurate. When these conclusions remain invisible or are shared without appropriate restrictions, participants may experience consequences based on information they did not knowingly provide and cannot meaningfully challenge. The risks may be amplified when uncertain or incorrect inferences are treated as established facts.

DP4 addresses this failure through heightened governance of sensitive and consequential inferences. Systems must maintain appropriate visibility into significant inferred attributes, their declared purposes, and the permissions governing their use. Where applicable, participants must have meaningful opportunities to understand consequential inferences, challenge inaccurate conclusions, and seek correction or restriction of their use.

Inference governance must also preserve lineage and applicable permission boundaries. Derived information should remain associated with the sources, purposes, and authorization conditions that govern its creation and use. A sensitive inference must not become available for unrelated processing or downstream disclosure merely because it has been transformed into a new data artifact.

These protections must account for uncertainty and technical limitations. An inference is not necessarily a verified fact about a participant, and systems should not present probabilistic assessments as definitive conclusions. Where full explanation, correction, or removal is not technically possible, relevant limitations must be disclosed and appropriate restrictions maintained.

Without these conditions, systems can create consequential personal information outside the participant's practical awareness or control. Data sovereignty requires that sensitive inferences remain subject to meaningful governance throughout their creation, use, sharing, and retention.

### 5.7 Zone-scoped privacy profiles

Communities must be able to define stricter privacy norms within their zones while remaining interoperable with broader infrastructure.

This draft uses **privacy profile** as a mechanism-level abstraction: a machine-readable expression of the data rules that apply inside a zone.

A privacy profile may specify, for example:

- no third-party behavioral advertising
- no model training on participant contributions
- local-only processing for sensitive content
- elevated rules for youth participation
- stronger consent requirements for biometric or emotional inference

**Example:** A health-support community publishes a privacy profile that restricts cloud-based inference, blocks third-party SDKs, and requires explicit opt-in before any content can enter training pipelines.

Without zone-scoped privacy profiles, communities may have values but not operational control.

Zone-scoped privacy profiles allow communities to establish and enforce privacy requirements appropriate to the contexts they govern. These profiles define applicable constraints on information collection, processing, sharing, retention, and secondary use within a community zone. Participation in a larger digital ecosystem must not require communities to abandon privacy protections that are necessary for their members or purposes.

**Example:** An online health support community establishes a privacy profile prohibiting the use of member conversations for general-purpose AI model training, restricting third-party tracking, and requiring sensitive information to be processed only through approved services. These conditions apply to information processing within the community zone, including processing performed by integrated applications and authorized downstream services. A service that cannot satisfy the applicable restrictions must not be treated as automatically authorized to process the community's information.

**Why this matters:** Communities operate in different contexts and face different privacy risks. A health support community may require stronger protections for sensitive discussions, while a youth organization or neighborhood association may establish different restrictions appropriate to its participants and activities. Uniform platform defaults may not adequately reflect these differences. Without community-level governance, participants may be exposed to information practices that conflict with the expectations and purposes of the spaces in which they participate.

DP4 addresses this need through zone-scoped privacy profiles that express community-level constraints in a form that participating systems can interpret and enforce. Profiles may establish restrictions on permitted processing purposes, external disclosures, tracking, retention, and the use of privacy-preserving methods. Applicable restrictions must remain effective across services operating within the zone and must not be silently weakened by platform defaults or third-party integrations.

Zone-level governance must operate alongside participant permissions and broader system constraints. Community authorization does not automatically override individual privacy protections, and individual permission does not automatically authorize processing prohibited by the community's applicable profile. Where requirements conflict, systems must identify the incompatibility and avoid processing that cannot satisfy the relevant conditions.

Privacy profiles should also support interoperability without assuming that every external service can satisfy every community requirement. Systems must make relevant limitations visible and restrict incompatible processing rather than presenting unsupported protections as enforceable guarantees.

Without these conditions, community privacy policies may remain statements of preference while the underlying infrastructure continues to apply uniform or weaker rules. Data sovereignty requires communities to exercise meaningful governance over information practices within the spaces they establish and maintain.

### 5.8 Auditability and provenance of use

Significant data access, transfer, and inference events must be inspectable in participant-legible and community-legible forms.

This does not require exposing every security detail publicly. It requires enough visibility to support contestation, trust, and oversight.

**Example:** A participant can see that an automated moderation agent accessed a document under a specific policy version, for a named purpose, with a recorded outcome and timestamp.

Privacy claims that cannot be audited remain aspirational.

Auditability and provenance of use require systems to maintain accountable records of significant information access, processing, transfer, and automated decisions. These records must provide sufficient context to establish what information was involved, which system or authorized actor performed the action, when it occurred, the declared purpose under which it was performed, and the resulting outcome where applicable.

**Example:** An AI-assisted moderation service reviews a participant's community post to assess whether it may violate an applicable community rule. The system records that the post was accessed for moderation, identifies the processing service and relevant purpose, records the time of review, and preserves the resulting moderation outcome. The participant and authorized community reviewers can inspect appropriate information about the action, allowing them to understand what occurred and determine whether the review followed the community's governance conditions.

**Why this matters:** Participants and communities cannot meaningfully assess compliance when consequential information use occurs without accessible evidence. Undocumented access, transfers, and automated decisions make it difficult to identify errors, investigate disputes, or determine whether processing remained within its authorized purpose. Transparency without reliable records may describe intended behavior without demonstrating what actually occurred.

DP4 addresses this failure through auditable records that connect significant processing events to their purposes, permissions, responsible systems, and relevant information lineage. These records support the examination of whether information was accessed or used within applicable constraints, including participant permissions, community privacy profiles, and downstream processing obligations.

Auditability must also respect privacy and security boundaries. Access to records should be appropriate to the reviewing participant or authorized governance role, and audit mechanisms should avoid unnecessarily exposing other participants' information, sensitive operational details, or additional personal data. Records should provide meaningful evidence without becoming a new source of unrestricted surveillance or indefinite retention.

Provenance of use must remain distinguishable from provenance of information. Knowing where information originated does not, by itself, establish how it was subsequently accessed, transformed, or disclosed. Systems must preserve sufficient evidence of significant uses and relevant transformations to support accountability across the information lifecycle.

Without these conditions, participants and communities may be asked to trust that systems have complied with their obligations without a meaningful way to examine that claim. Data sovereignty requires that consequential information use remain sufficiently traceable, understandable, and reviewable to support oversight, contestability, and correction where applicable.

### 5.9 Training and model-use boundaries

Where participant or community content could enter model training, fine-tuning, embedding pipelines, or retrieval systems, those pathways must be separately governed.

**Example:** A public discussion zone allows search indexing but defaults to no training use. Participants can grant corpus-level permission for research or model improvement on a renewable basis, and declined content carries an exclusion marker through the training pipeline.

This is a direct dependency between DP4 and later AI properties. Ethical AI claims are weak if model access to human data is structurally obscure.

Training and model-use boundaries require systems to distinguish information processing necessary for community participation and authorized services from processing intended to train, fine-tune, evaluate, or otherwise improve AI models. Permission to publish, search, summarize, or moderate information must not be treated as blanket authorization for its use in model development. AI-related processing must remain subject to declared purposes, applicable participant permissions, and community governance constraints.

**Example:** A participant contributes posts to a community discussion forum. Other authorized members can read and search those contributions as part of the forum's normal operation. The platform does not automatically treat this availability as permission to use the posts for general-purpose AI model training. Where the community permits optional contributions to AI research or model improvement, the participant can authorize the applicable use separately. Declining that authorization does not, by itself, prevent the participant from continuing to use the forum's ordinary discussion features.

**Why this matters:** Community contributions are often created for communication, collaboration, mutual support, or shared knowledge development. Using those contributions to develop AI models may introduce materially different purposes, recipients, retention conditions, and downstream consequences. Participants and communities may reasonably authorize access to information within a particular setting while declining its incorporation into model-development processes.

DP4 addresses this distinction through purpose binding, granular authorization, and explicit governance of training and model-use permissions. Systems must distinguish the purposes for which information is available from the purposes for which it may be used in AI development. Training-related permissions must remain subject to applicable participant and community constraints, and those restrictions must be preserved when information is transferred to authorized processors.

Changes to training permissions must have operational consequences. Withdrawal of authorization must restrict subsequent processing within the applicable scope and trigger relevant downstream obligations. Systems must distinguish future training use from previously completed processing and disclose limitations where trained models or derived artifacts cannot be fully reversed, corrected, or removed.

These boundaries must also account for different forms of AI processing. Using a model to provide an authorized feature does not necessarily constitute permission to train or improve that model using the participant's information. Systems should make material distinctions between inference, temporary processing, evaluation, fine-tuning, and persistent incorporation into training datasets or model artifacts understandable wherever they affect participant or community authorization.

Without these conditions, information shared for community participation may become an unrestricted resource for AI development. Data sovereignty requires that training and model-improvement uses remain separately governable rather than being treated as automatic consequences of making information accessible within a digital system.

### 5.10 Jurisdictional and transfer honesty

Cross-border transfers and legal regime changes must be visible as part of the participant's risk surface.

**Example:** A participant is shown that a given processor operates under a different legal regime, that redress pathways are limited, and that a community zone therefore blocks that transfer category by default.

Global systems do not excuse vague disclosure. They heighten the need for explicitness.

Jurisdictional and transfer honesty requires systems to provide meaningful visibility into the jurisdictions in which participant information is stored, processed, accessed, or transferred. Where information crosses legal or organizational boundaries, systems must disclose material differences in applicable protections, access conditions, and accountability mechanisms rather than treating the transfer as an inconsequential technical operation.

**Example:** A community platform stores participant information within a locally governed environment but proposes using an external processing service operating in another country. Before transferring information, the platform identifies the relevant processing jurisdiction, explains material differences in applicable legal protections, and determines whether the proposed transfer complies with participant permissions and the community's privacy profile. Where the community has established restrictions on particular cross-border transfers, those restrictions remain applicable to the external service.

**Why this matters:** The jurisdiction in which information is processed can affect the legal obligations of service providers, the circumstances under which information may be accessed or disclosed, and the remedies available when disputes arise. Participants and communities may authorize information use within one legal or governance context without intending to accept materially different conditions elsewhere. When transfers occur without adequate visibility, those expectations may be undermined without a corresponding opportunity for informed governance.

DP4 addresses this failure through transparent transfer conditions, purpose binding, and zone-scoped privacy requirements. Systems must identify material jurisdictional dependencies and preserve applicable restrictions when information is transferred to external processors. Proposed transfers must remain subject to the permissions, community rules, and legal obligations governing the information, rather than being justified solely by technical convenience or service integration.

Jurisdictional transparency must also distinguish physical data location from legal exposure. Information stored within one country may remain accessible to organizations or authorities operating under another jurisdiction, depending on the relevant legal and organizational relationships. Systems should therefore avoid presenting local storage or regional hosting as an unconditional guarantee of jurisdictional isolation.

Where a transfer cannot satisfy applicable restrictions, systems must disclose the incompatibility and prevent unauthorized processing. Where legal protections, enforcement conditions, or transfer consequences cannot be stated with certainty, systems must communicate those limitations rather than offering misleading assurances.

Without these conditions, participants and communities may lose meaningful oversight of the legal and institutional environments governing their information. Data sovereignty requires that cross-jurisdictional processing remain visible, appropriately authorized, and accountable to the protections under which information was originally entrusted to a system.

### 5.11 Data System Layer: Lineage, Transformation Integrity, and Consent Propagation

Beyond individual mechanisms, DP4 requires a coherent data system layer that preserves **lineage, semantics, and permissions** across pipelines, services, and time. This layer ensures that data remains trustworthy under transformation, scale, and adversarial use.

The data system layer requires information to retain sufficient provenance, contextual meaning, purpose limitations, and applicable permissions as it moves between systems or undergoes transformation. Copying, summarizing, aggregating, or deriving new information must not automatically remove the governance conditions associated with its sources. Information must remain understandable and accountable throughout its lifecycle, including when processed by automated systems.

**Example:** A participant shares information with a community service for a specific, authorized purpose. The service generates a summary, transfers selected information to an approved processing tool, and subsequently incorporates part of the resulting material into an automated workflow. Throughout these operations, the systems preserve sufficient records to identify the information's origin, the purposes governing its use, significant transformations, relevant recipients, and the permissions that continue to apply. The creation of a summary or derived artifact does not automatically authorize processing beyond the scope of the original permissions.

**Why this matters:** Participant and community control depends on the ability to understand not only what information exists, but also where it originated, how it has changed, and which restrictions govern its use. When information becomes detached from its context or permissions, downstream systems may treat it as unrestricted, even though its collection and processing were originally subject to specific conditions. This can undermine purpose binding, consent, auditability, and accountability across the wider ecosystem.

DP4 addresses this failure through information lineage, permission inheritance, and preservation of governance metadata across processing boundaries. Systems must maintain sufficient associations between source information, derived artifacts, declared purposes, applicable permissions, and significant transformations to support appropriate downstream enforcement and review.

These associations must remain meaningful when information is copied, summarized, combined, or transformed. Where derived information incorporates multiple sources, applicable restrictions must be evaluated together rather than discarded because the resulting artifact has a different form. A transformation must not be used to bypass restrictions that would otherwise govern the information's use.

Preserving governance conditions does not require every processing system to retain an identical copy of all source records or metadata. Systems may use references, structured metadata, or other interoperable mechanisms, provided that the relevant provenance and obligations remain available and enforceable within the applicable processing context. Where lineage or permissions cannot be reliably preserved, the limitation must be disclosed and incompatible processing restricted.

Without these conditions, information may retain its content while losing the context and rules that make its use accountable. Data sovereignty requires that information remain connected to its origins, purposes, permissions, and significant transformations throughout the systems that process it.

#### 5.11.1 Lineage continuity

- Data MUST carry provenance linking it to source, purpose, and processing context
- Derived artifacts (features, embeddings, summaries) MUST reference upstream lineage

Failure mode: **lineage loss**, enabling untraceable reuse and accountability gaps.

#### 5.11.2 Transformation integrity

- Transformations MUST be attributable to an actor (human/AI) and a declared purpose
- Material transformations SHOULD be reversible or auditable where feasible

Failure mode: **data laundering**, where meaning or risk is altered without trace.

#### 5.11.3 Consent propagation

- Permissions MUST travel with data across internal and external systems
- Downstream processors MUST honor upstream constraints or declare degradation explicitly

Failure mode: **consent bypass chains**, where integrations ignore or reinterpret permissions.

#### 5.11.4 Anti-replay and non-duplication

- Identity- or consent-bound artifacts MUST NOT be reused to gain additional value without attribution
- Systems SHOULD detect duplicate extraction across pipelines

Failure mode: **replay extraction**, where the same data yields multiple unaccounted benefits.

#### 5.11.5 Inference binding and governance

- Inferences MUST be treated as first-class data with lineage, purpose, and revocation pathways
- High-risk inferences require stricter constraints and auditability

Failure mode: **inference drift**, where derived signals are reused outside their declared context.

#### 5.11.6 Cross-system semantics

- Systems MUST signal when data meaning or guarantees change across contexts
- Mappings between schemas MUST preserve or explicitly degrade semantics

Failure mode: **semantic drift**, where data is misinterpreted after transfer.

This layer does not require centralization. It requires **coherence under movement**.

### 5.12 Private community coordination

Communities should be able to coordinate through encrypted group communication and participant- or community-controlled hosting, reducing dependence on a single platform for their data and continuity. For high-stakes disclosure, including whistleblowing, tools should support deliberate control of identity exposure, storage, and disclosure timing.

Deletion or anonymization requests should be available within the systems' actual control, with explicit limits once information has been shared or copied. Encrypted transport and decentralized storage are useful mechanisms, not guarantees that every adversary or downstream recipient loses access. DP15 addresses the threat model and DP18 closes the reporting feedback loop.

### 5.13 Reference implementation example: PDP-Connect (PDPP)

This subsection is non-normative. It names a concrete standards-track effort that demonstrates how DP4's consent, purpose, minimization, and durable-record mechanisms can be realized in practice. Adoption of PDPP for any given Meta-Layer system is an Overweb ADR decision, not a DP4 requirement.

PDPP (Personal Data Portability Protocol) is an open specification for moving personal data with the consent of the person it belongs to. It is developed by PDP-Connect, a lab at Linux Foundation Decentralized Trust. Source: [pdpp.dev](https://pdpp.dev).

**Mechanism mapping:**

- OAuth 2.0 plus RFC 9396 (Rich Authorization Requests) in PDPP is one realization of the consent stack and scope binding described in DP4, Section 5.3.
- Source, Accessor, and Operator roles with declared purpose and expiration correspond to DP4's purpose binding under Section 5.1.
- Agreed terms visible to both parties satisfy the durable record requirement in DP4, Section 5.8.
- Range-limited selection requests (specific fields, specific date windows) correspond to DP4's minimization by design under Section 5.2.

**Conformance posture:**

PDPP exposes two verification rungs. A Conformant mark is produced by an automated check. A Verified mark requires human review by a technical committee, with identity anchored in a recognized trust registry. Source: [pdpp.dev](https://pdpp.dev).

**Cross-references:** DP1, Section 9; DP7, Section 10; DP14, Section 9.

---

## 6. Data Vaults and Personas

The mechanisms above define the conditions data must satisfy. This section defines the two structures through which participants actually hold and partition it: the **vault**, which is where data rests under participant control, and the **persona**, which is the boundary across which data is permitted to be seen.

Together, participant-controlled vaults and personas make data sovereignty practical. Vaults provide participants with meaningful control over their information, while personas preserve the contextual boundaries between different parts of their lives. Just as people share different information with healthcare providers, employers, neighborhood associations, and support groups, digital systems should respect these distinctions rather than merging information from separate contexts into a single profile.

Both structures are necessary because they address different dimensions of data sovereignty. A vault without personas may provide a well-governed information store while still allowing information from distinct contexts to be combined into a unified, legible profile. Personas without a participant-controlled vault may provide contextual separation at the interface level while leaving the underlying information accessible to integrated processors capable of correlating those contexts.

Working together, vaults and personas enable participants to govern their information while controlling how it is disclosed and represented across different contexts. This combination establishes a practical foundation for data sovereignty by preserving participant control, supporting community governance, and maintaining contextual integrity as information moves throughout the Meta-Layer.

### 6.1 The personal data vault

A vault is a participant-controlled store in which data, credentials, and derived artifacts reside with their purpose bindings, retention clocks, and permission history attached. It is the operational answer to the question of where sovereignty physically lives.

A vault SHOULD provide:

- **Custody with meaningful control.** Vaults may be self-hosted, community-hosted, or provider-hosted. What DP4 requires is not a specific topology but that custody arrangements be disclosed and that provider-hosted vaults remain exportable and revocable, per the mechanisms in Sections 5.3 and 5.4.
- **Permission-bearing storage.** Data in a vault carries its consent state, not merely its content. A record retrieved from a vault arrives with the purposes for which it may be used, so that downstream processors receive constraints rather than payloads.
- **Retention clocks at rest.** Expiry is a property of the stored object. Data that has passed its clock is attenuated or removed by the vault itself rather than depending on each consuming system to remember.
- **Query-time minimization.** Where a request can be satisfied by an attestation rather than the underlying data (that a participant is over an age threshold, holds a credential, or belongs to a zone), the vault SHOULD answer with the attestation. Disclosure is the fallback, not the default.
- **Access logging as participant-facing history.** Every significant read, transfer, or inference against vault contents is recorded in terms the participant can review, supporting the mechanism in Section 5.8 at the point where access actually occurs.
- **Sensitive partitions.** Categories of elevated risk (health, financial, biometric, youth-context, relational) SHOULD be separable within the vault, so that a grant covering ordinary activity does not silently extend to them.

The characteristic failure mode is **vault theater**, where a store is described as participant-controlled while the operator retains parallel copies, unlogged access, or the practical ability to deny export. A vault that cannot be audited or exited is a storage location, not a sovereignty mechanism.

### 6.2 Personas as context boundaries

A persona is a bounded presentation of a participant within a context: what is visible, what is linkable, and what may be inferred. Personas are how cross-context correlation (Section 3.6) is resisted structurally rather than by policy promise.

DP4 requires that:

- **Personas be first-class in permission grants.** Access is granted to a persona, not to a participant. A processor authorized within one persona has no standing to read, correlate, or infer across others.
- **Correlation be an explicit act.** Linking personas is a participant decision with visible consequences, not a side effect of shared identifiers, device graphs, or an integration that resolves both to a common account.
- **Persona boundaries survive movement.** When data crosses a system boundary, its persona scope travels with it or the degradation is signaled, consistent with the requirement in Section 5.11.6.
- **Inference respect persona scope.** A derived signal produced within one persona inherits that persona's boundary. Inference is a common route by which separation is defeated, because the derived artifact is often treated as new data rather than as a descendant of its source.
- **Personas be enumerable and reviewable.** Participants must be able to see which personas exist, what each exposes, which processors hold grants against each, and what has been inferred within each.

The characteristic failure mode is **persona collapse**, described above under threats. It deserves particular design caution because it is effectively irreversible: revocation stops future access but cannot unlink an inference already drawn.

Personas should support anonymous, pseudonymous, or authenticated interactions where the relevant zone permits them. Authentication should not automatically disclose a public identity or link other personas. Connected-device identities also need contextual boundaries, since a device can otherwise become the bridge that silently reconnects separated activity.

### 6.3 Zone interaction

Personas and zone-scoped privacy profiles compose. A persona determines what a participant exposes; a zone profile determines what the environment permits to be collected, inferred, or transferred from whatever is exposed. A participant entering a health-support zone under a dedicated persona is protected twice: by the boundary they set and by the rules the community enforces.

Where the two conflict, the stricter constraint applies. A zone may impose limits beyond what a persona's grants allow, but a zone profile must not be usable to widen access beyond the persona's scope. Communities set floors, not ceilings, on participant protection.

### 6.4 Relationship to identity and naming

Vaults and personas depend on DP1 and DP5. DP1 supplies the accountability binding that makes plural presentation safe rather than evasive: personas are distinct without being unattributable, because action-bound accountability persists beneath them. DP5 supplies identifiers that can remain uncorrelated at the naming layer, without which persona separation is defeated before any data mechanism engages.

This is the practical shape of sovereignty in DP4: data held where the participant can see and move it, partitioned along boundaries the participant chose, carrying permissions that constrain whoever receives it, under rules the community can strengthen.

---

## 7. Governance, Accountability, and Agency Surfaces

DP4 is not satisfied by backend architecture alone. Participants and communities need interfaces through which data conditions become governable.

Participants must be able to:

- see active purposes, processors, retention clocks, and major inference categories
- revoke permissions without unfairly losing unrelated core functionality where technical separation is possible
- export their data in forms that preserve practical continuity
- correct or contest significant false inferences
- understand what deletion means in each category of storage and reuse

Communities must be able to:

- publish stricter privacy profiles for their zones
- reject tools that cannot meet those profiles
- audit aggregate compliance without turning privacy governance into a new surveillance regime
- preserve governance memory around why a privacy rule exists and when it changed
- distinguish individual confidentiality from community-level observability of system behavior

**Example:** A civic deliberation zone prohibits third-party trackers and emotional classification systems. Any overlay or agent entering the zone must declare compatibility with the zone's privacy profile or operate in a visibly constrained mode.

Without these surfaces, privacy remains vendor-defined even when communities appear to have rules.

---

## 8. Incentives and Power Analysis

Commercial systems tend to treat data surplus as strategic advantage.

Retention expands because future uses may be profitable. Inference expands because prediction creates leverage. Consent becomes cosmetic where friction threatens growth. SDK ecosystems and downstream processors thrive precisely when participants cannot trace the full chain of use.

DP4 does not assume these incentives disappear. It requires that their effects become visible and contestable.

**Example:** A platform discloses that feed ranking depends partly on behavioral surplus gathered across sessions. A community operating inside the Meta-Layer disables that ranking signal within its zone because it conflicts with the zone's purpose.

This matters because many privacy harms are not caused by one malicious actor. They emerge from ordinary growth logic operating without adequate brakes.

DP4 therefore treats incentive visibility as part of sovereignty. Participants should be able to know when they are not merely receiving a service, but being rendered into a data asset.

---

## 9. Community Signals Informing DP4

Across contexts, similar signals recur:

- fatigue with unreadable policies and false choice architectures
- demand for portability that supports real migration
- frustration with invisible partner ecosystems and silent SDK extraction
- concern about sensitive inferences that participants never explicitly supplied
- desire to ask, in operational terms, "what does the system think it knows about me?"
- expectation that youth and vulnerable contexts should receive safer defaults, not merely more warnings

These signals are not abstract. They arise when people sense that the surface language of privacy no longer matches the structure underneath.

DP4 responds to that gap by making data conditions inspectable, debatable, and governable.

---

## 10. Foresight and Failure Design

DP4 assumes that data sovereignty degrades by accumulation rather than by breach. The characteristic failure is not an incident but a slow divergence between what a system's privacy surface describes and what its pipelines actually do, produced by ordinary engineering: a new processor added, a schema migrated, a model retrained, an integration shipped.

Predictable degradation paths include:

- **Purpose accretion**, where each individual expansion is defensible and the aggregate no longer resembles what was consented to
- **Lineage decay across migrations**, where provenance survives within a pipeline but is dropped at the boundary between one system's schema and the next
- **Inference laundering**, where a derived signal is treated as new primary data rather than as a descendant carrying its source's constraints, resetting its permission state
- **Propagation rot**, where a deletion pathway that once reached every processor silently stops reaching a partner added after the pathway was built
- **Retention drift**, where clocks are defined but exceptions (legal hold, abuse review, backup, model memory) accumulate until the effective retention is indefinite
- **Profile erosion**, where a zone's privacy profile remains published while newly integrated tools are exempted for compatibility

These paths compound in a specific and dangerous way. Lineage decay makes inference laundering undetectable; undetected inference expands the effective purpose surface; an expanded purpose surface makes propagation incomplete by definition, because no one knows the full set of places the data went.

Two properties make DP4 failures harder to remediate than most:

**Irreversibility.** An inference drawn cannot be un-drawn, and a correlation established cannot be unestablished. Revocation stops future use but does not restore the prior state. This asymmetry means DP4 must weight prevention far more heavily than response.

**Latency of harm.** The consequences of over-collection may appear years later, under a different operator, a different legal regime, or a different threat model. Data retained today is evaluated against tomorrow's adversary, including capabilities that do not yet exist. Quantum-vulnerable encryption of long-retained data is the clearest current instance of this pattern.

DP4 therefore requires safeguards designed in advance:

- **Purpose diffing**, so that expansion of declared purpose is a visible change with a record, comparable to governance diffs under DP3
- **Lineage conformance testing** at every boundary crossing, treating provenance loss as a defect rather than an acceptable cost of integration
- **Propagation audits** that verify deletion reach against the current processor set, not the set that existed when the pathway was designed
- **Retention exception review**, with exceptions themselves carrying clocks
- **Inference registries**, so that the set of high-risk inferences a system produces is enumerable rather than emergent
- **Forward-secrecy posture** for long-retained data, treating future decryption capability as an expected condition rather than a remote scenario
- **Postmortems for privacy incidents** that link the harm to the specific mechanism gap (the unbound pipeline, the dropped lineage, the unreached processor) and to the change that introduced it

Failure is expected. Undetectable failure is not. A DP4-aligned system is one where the divergence between stated and actual data conditions is observable while consent can still be meaningfully revisited, and where the data most likely to cause future harm was never collected in the first place.

---

## 11. Relationship to Other Desirable Properties

DP4 is foundational and interdependent.

- **DP1** anchors accountability for who accessed, inferred, retained, or transferred what
- **DP2** ensures participants have meaningful agency over data flows and delegation scopes
- **DP5** supports identifiers and namespaces that allow identity and reputation to remain portable without forcing correlation
- **DP6** depends on commerce patterns that do not require surveillance as the default price of participation
- **DP7–DP10** shape whether sovereignty is actually usable through interface quality, comprehension, and incentives
- **DP11** depends on bounded visibility into what AI systems may see, remember, infer, and influence
- **DP12** provides the community processes through which stricter privacy norms can be defined and revised
- **DP13** enforces containment over automated access, training pathways, and runtime data exposure
- **DP14–DP15** reinforce provenance, auditability, and transparency of data use and policy change
- later governance and ownership properties depend on collective data practices that do not silently strip participants of control

A failure in DP4 propagates upward. If data conditions are opaque, later governance becomes symbolic, ethical AI becomes ungrounded, and participant agency becomes procedural rather than real.

---

## 12. Non-Goals and Explicit Boundaries

DP4 defines a minimum condition. It does not solve every problem associated with data, secrecy, or identity.

DP4 does not:

- guarantee perfect anonymity in all settings
- prohibit all inference or all data sharing categorically
- replace law, regulation, or sector-specific obligations in health, finance, education, or public safety
- mandate one universal privacy culture across all communities
- promise technically impossible forms of deletion while downstream copies or model memorization remain unresolved
- remove the need for accountability-linked identity in contexts where stronger attribution is legitimately required

These boundaries matter because absolutist privacy claims often collapse under real-world complexity.

For example, some communities may require stronger identity assurance to support trust and accountability. DP4 does not forbid that. It requires that data burdens attached to such assurance remain bounded, visible, and contestable.

Likewise, some inference may be necessary for accessibility, fraud prevention, or urgent safety intervention. DP4 does not deny that. It requires those pathways to be governed explicitly rather than smuggled in under vague necessity claims.

DP4 further does not:

- mandate a specific vault topology; self-hosted, community-hosted, and provider-hosted custody are all permissible where custody is disclosed and exit is real
- require that every participant maintain multiple personas, only that persona separation be available and enforceable for those who need it
- treat data localization as equivalent to sovereignty; jurisdiction is one factor in a risk surface, not a substitute for purpose binding and propagation discipline
- guarantee that privacy interfaces will be simple; it requires that they be legible, which sometimes means more surface rather than less

Failure mode: **privacy absolutism**, where DP4 is invoked to block accountability, safety intervention, or community oversight that the property explicitly contemplates as governable rather than prohibited.

---

## 13. Minimum DP4 Alignment

Minimum alignment is not a policy checklist. It is the threshold at which data sovereignty is **enforceable, portable, and resistant to laundering, drift, and silent reuse**.

A system that does not meet these conditions may disclose practices, but it does not provide sovereignty.

At minimum, a system claiming DP4 alignment MUST satisfy the following **irreducible conditions**:

### 13.1 Purpose binding and enforcement

- All collection and processing MUST declare purpose and enforce it in execution
- Material purpose changes MUST require reauthorization or zone review

Failure mode: **purpose creep**.

### 13.2 Consent propagation

- Permissions MUST travel with data across pipelines and partners
- Downstream systems MUST honor or explicitly degrade constraints

Failure mode: **consent bypass chains**.

### 13.3 Lineage and provenance

- Data and derivatives MUST carry reconstructable lineage
- Significant transformations MUST be attributable

Failure mode: **lineage loss / data laundering**.

### 13.4 Meaningful portability

- Exports MUST preserve structure needed for practical migration (schemas, relationships, permissions)
- Systems MUST disclose omissions and degradation

Failure mode: **illusory portability**.

### 13.5 Retention and propagation discipline

- Retention MUST be time- or purpose-bound with visible clocks
- Deletion/revocation MUST propagate with auditable receipts

Failure mode: **retention without sunset / partner sprawl**.

### 13.6 Inference governance

- High-risk inferences MUST be disclosed, bounded, and contestable
- Inferences MUST support correction or attenuation where applicable

Failure mode: **inference without accountability**.

### 13.7 Auditability of use

- Participants MUST be able to inspect significant access, transfer, and inference events
- Systems MUST provide logs or summaries sufficient for contestation

Failure mode: **opaque processing**.

### 13.8 Interoperability honesty

- Systems MUST state what is preserved, degraded, or non-transferable across boundaries

Failure mode: **interop deception**.

### 13.9 Context separation

- Permission grants MUST be scoped to a persona or context rather than to a participant in the aggregate
- Correlation across contexts MUST require an explicit participant act, not arise as a side effect of shared infrastructure
- Derived signals MUST inherit the context boundary of their source

Failure mode: **persona collapse**.

These conditions define the **minimum viable data sovereignty layer** of the Meta-Layer.

Partial implementations that omit purpose enforcement, consent propagation, lineage, or propagation discipline MUST NOT be considered aligned with DP4.

---

## 14. Open Questions and Future Work

DP4 surfaces unresolved design challenges that require further work:

- how to standardize interoperable privacy profiles across tools and zones
- how to represent retention, revocation, and transfer states in ways ordinary participants can understand
- how to govern model memorization and partial deletion in training-intensive systems
- how to balance privacy-enhancing technologies with the need for accountability and community oversight
- how to manage joint controllership and downstream processor responsibility in federated ecosystems
- how to handle collective consent for shared datasets or community archives
- how to distinguish emergency access from routine surveillance creep
- how to make privacy interfaces usable for low-literacy, multilingual, and neurodiverse participants
- how to audit third-party SDK ecosystems without reproducing surveillance in the name of governance
- how to preserve interoperability while allowing communities to adopt materially stricter norms

The vault and persona structures raise a further set of unresolved questions:

- how vaults should interoperate, so that a participant can move custody without re-establishing every grant, lineage record, and retention clock from scratch
- how to make persona separation usable rather than merely available, given that maintaining boundaries is cognitively expensive and mistakes are irreversible
- how to express long-horizon retention risk to participants, including risks from decryption capabilities that do not yet exist
- how to enumerate the inferences a system produces when many are emergent properties of models rather than declared features
- how to verify propagation claims independently, since deletion receipts are currently self-reported by the parties with the least incentive to report failure

These are not reasons to delay better defaults. They mark the frontier where DP4 must mature through practice, governance, and implementation evidence.

---

## 15. Path Toward ML-RFC

Progression from draft to RFC-grade maturity would require:

- stable invariants around purpose binding, minimization, meaningful portability, and propagation honesty
- a clearer grammar for privacy profiles, retention clocks, consent stacks, and audit events
- implementation evidence from zones with different stakes and governance norms
- demonstrable ways for communities to adopt stricter data rules without breaking interoperability
- better treatment of partial deletion, inference correction, and training exclusions
- alignment with privacy law and privacy-enhancing technologies without waiting for legal perfection before improving defaults

Graduation criteria SHOULD additionally include:

- reference schemas for vault records, persona scopes, consent stacks, retention clocks, and propagation receipts
- conformance tests for lineage preservation across at least one system boundary
- evidence that an export is usable in an independent system without loss of permission state
- evidence that persona separation resists correlation under realistic integration conditions

A decentralized privacy-routing mesh is one possible implementation approach for reducing the exposure of interaction, contribution, and identity-resolution traffic. Multiparty relays and onion routing are candidate mechanisms for limiting the visibility of communication patterns and reducing reliance on individual intermediaries. These approaches should remain optional and be evaluated against their actual privacy benefits, operator dependencies, accessibility, reliability, and performance before broader adoption. DP7 addresses compatibility with participant-chosen privacy infrastructure, while DP17 addresses potential models for supporting relay operations and funding.

Local, multi-sector civic sandboxes, including the proposed UMi Insecurity Initiatives and Sandbox environments, provide potential settings for evaluating whether privacy mechanisms are understandable, equitable, and effective under real-world conditions. Such trials should examine not only technical performance but also participant comprehension, accessibility, governance, operational dependencies, and unintended consequences. A pilot's institutional setting or participation by trusted organizations is evidence to examine, not proof that the mechanisms being tested provide meaningful privacy protections.

The goal is not to freeze one final model of privacy. It is to establish durable conditions under which sovereignty claims can be tested, challenged, and improved.

---

## 16. Closing Orientation

DP4 is where the Meta-Layer rejects the old bargain of convenience in exchange for invisibility.

Sovereignty is not achieved when a participant is merely informed that data extraction may occur. It is achieved when the participant and the communities they inhabit can see the operative terms of data use, shape those terms where appropriate, withdraw from them in meaningful ways, and leave without losing the structure of their digital life.

When DP4 is strong, trust in governance, AI, commerce, and collaboration becomes plausible.

When DP4 is weak, every higher-order property is forced to fight against a substrate that quietly converts participation into extraction.

---
