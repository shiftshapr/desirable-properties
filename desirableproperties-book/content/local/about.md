<!-- govhub-sync: ml=ML-Draft-031 revision=04 submission=f79b02aa-b0b8-4366-a485-55f430c56f28 hash=85d679c538d7af6b synced=2026-11-14T03:21:14Z -->
# About This Digital Monument

This edition of *The Layered Web: The Desirable Properties of a Meta-Layer*, Version 1.0, released on November 13, 2026, is not a conventional ebook. It is a digital monument – a civic record inscribed on Bitcoin and intended to be read by people who were not in the room when the work began, including generations not yet born.

This book exists to help define the foundational properties of a trustworthy Meta-Layer for the Internet – a global collaboration to build a human-aligned, decentralized, AI-assisted coordination layer that supports trust, agency, accountability, and human flourishing.

![The layered web: Physical Infrastructure, Internet Infrastructure, Websites and Applications, and the Meta-Layer above – Trust, Context, Presence, Governance](/content/0535566bf0363fafebaa4b87ebc2b917bf67eaba5544a7071bec535e3e9610f4i0)

*Figure: From today's web to the Meta-Layer. Physical Infrastructure and Internet Infrastructure carry packets and protocols. Websites & Applications are what most people experience as "the web." The Meta-Layer sits above that surface – a shared coordination layer for Trust · Context · Presence · Governance – where this book's Desirable Properties apply.*

Most of us experience the Internet as pages, platforms, and feeds – a flat surface of sites and apps. The Meta-Layer is the space above that surface: not another website, but a shared digital atmosphere where context, presence, memory, and governance can persist across platforms. *The Layered Web* names the conditions that layer must satisfy if it is to serve people rather than extract from them.

That is how this monument will be used: as the open, inscribed edition of that inquiry – twenty-four Desirable Property chapters, front matter, and community patches – preserved onchain so the definitions, debates, and revisions remain visible long after any single site or sprint ends.

We are here to define the next level of the Internet. The properties refined in this challenge become the requirements and architectural decisions that guide how the Overweb – and the broader Meta-Layer – gets built.

![We are here to define the next level of the Internet: Desirable Properties Challenge → Requirements → Architecture Decision Records → Build Overweb](/content/21a600b6ecb82647dd80c80f2e25f30f681fc2ab79b72701d2c47bb66eb2b54ci0)

*Figure: Desirable Properties Challenge → Requirements → Architecture Decision Records → Build Overweb. This inscribed edition captures Step 1: community-defined qualities a trustworthy Meta-Layer must possess before protocols are locked in.*

Getting the "what" right is the community's first and most important architectural decision. The chapters here supply the vocabulary and criteria that later work will translate into formal requirements, recorded ADRs, and eventually the Overweb itself – a coordination layer where trust, context, presence, and governance can persist across platforms rather than reset with every new app or feed.

## A new information layer on Bitcoin

In late 2022, developers began exploring a practical way to store arbitrary content directly on Bitcoin. The breakthrough built on SegWit, an upgrade that added a witness field to each transaction – space that could carry data beyond simple payment instructions. In January 2023, Casey Rodarmor introduced the Ordinals protocol, which numbers individual satoshis and allows content to be written into that witness data and linked to a specific sat on the chain.

That combination opened an information layer on Bitcoin: a place where text, images, HTML, JSON, and other formats can become part of the ledger itself – not hosted on a server that can be switched off, but recorded in blocks that replicate across a global network.

## What are Ordinals?

An ordinal (also called an inscription) is content embedded in a Bitcoin transaction and tied to a numbered satoshi. Each inscription receives a stable identifier derived from the transaction that created it. Indexers and readers (such as [ordinals.com](https://ordinals.com)) resolve that identifier to the bytes stored onchain.

Ordinals turn Bitcoin from a ledger of value alone into a ledger of value and information. A chapter, a cover image, a configuration file, or an entire interactive application can exist as an inscription – readable for as long as the network is maintained and the data is mirrored by stewards who care about preservation.

Ordinals do not replace Bitcoin's role as money. They add a durable publishing surface – one suited to archives, monuments, and works meant to outlast any single company or domain name.

## The BRC333 Digital Monument protocol

This book is built with the BRC333 protocol – specifically the BRC333-BOOK model for living documents, within the broader digital monument pattern for works intended as enduring public record.

A BRC333 monument is organized as a satplication: a graph of dedicated satoshis, each assigned a role in the work – configuration, sources inventory, layout shell, shared scripts, oracle data, and individual chapter rails. Content on a sat can be reinscribed when the community updates a chapter or policy, preserving history while allowing the monument to evolve in the open.

That structure is what lets this book behave like a living edition rather than a frozen PDF. The Desirable Properties Challenge, workgroups on [interfacehub.net](https://interfacehub.net), and future reinscriptions can refine the text while the chain retains a trace of how the work changed over time.

Press `i` while viewing any chapter to inspect inscription metadata and explore the satplication graph that connects this monument's parts.

## Intended to last

We inscribe these chapters, acknowledgements, and supporting artifacts onchain – and design them to remain readable through forthcoming preservation methods as indexing, mirroring, and cultural stewardship practices mature.

No storage system comes with absolute guarantees. Bitcoin's social layer must continue to honor and replicate the chain; indexers must continue to serve content; future readers may rely on methods we cannot yet name. What we can commit to now is intent: this monument is meant to be an enduring digital artifact, not ephemeral web copy.

We expect future generations to encounter this work – to judge what proved durable, improve what proved incomplete, and continue the inquiry into desirable properties before immutable protocols settle the shape of the Meta-Layer.

## Explore further

- Desirable Properties Challenge: [desirableproperties.org](https://desirableproperties.org)
- Open collaboration: [interfacehub.net](https://interfacehub.net)
- BRC333 protocol: [brc333.xyz](https://brc333.xyz)
