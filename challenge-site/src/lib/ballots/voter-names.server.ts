import 'server-only';

/**
 * Real names of voting accounts, for the public participation list (src/lib/ballots/participation.server.ts).
 * Server-only. Keyed by Gov Hub account id (the site session's userId, the user_id in dp_ballot_vote), as in
 * src/lib/screening/council-members.server.ts. Looked up read-only on 24 Nov 2026 for the 24 accounts that voted on
 * the 16 Nov ballot: Gov Hub display names, checked against the names on the 20 Nov ballot broadcast list.
 *
 * Real names only, never an email or a handle. null (or no entry) means no real name is on record: the account is
 * counted on the public list as one of the "others" until a name is added here. Phahsa is shown as "Phahsa"; the
 * account shown as "Laura" is Laura Del Campo; the "Daveed" account is Daveed Benjamin (his only account that voted).
 *
 * Production ids. Staging signs in against a different Gov Hub; ids that match there show the same names.
 */
export const VOTER_NAMES: Readonly<Record<string, string | null>> = {
  '97af342e-4b52-48c8-8a31-2c9a07ca245d': 'Aldo Velázquez',
  '8900821e-357e-437e-90cd-d0953134b0bc': 'Alexander Payton',
  '0625761b-c3df-44ef-8018-740912a60c8f': 'Amir Banifatemi',
  '9b5e0edf-0578-4704-adc6-1c4df0c3d056': 'Benn Konsynski',
  '57e7c23e-29ec-423a-baee-51ddf34a8174': 'Daveed Benjamin',
  '01d6df07-1048-4027-9693-15228bcd6d49': 'Eric Schneider',
  'fcd355e4-817e-4654-95b2-ec29a0ef4261': 'Gael Van Weyenbergh',
  '1877686f-1594-401e-844c-c5c0f488ce8f': 'Javier Gaxiola',
  'ce953b7f-d859-4bf4-89e8-a4f81bdaa026': 'Jesse Asiedu-Akrofi',
  '8ee58637-a9be-4b76-acf2-9f1a27ee144d': null, // display name is an email; the broadcast list's "Jingyi Shirley" looks derived from it
  '59d48064-b89d-47d2-9a24-0745613e28fb': 'Joel Okomoli',
  '0d767796-e997-40ee-b7c2-4af35976c9e8': 'Kamran Rafique',
  'b653b562-615b-4fa3-b5f0-f066d721dc6b': 'Laura Del Campo',
  '372e5bbb-794d-4612-bed6-d6cf8bb75535': 'Leandra Preston',
  '68055bc1-73e8-4886-9332-53a80abe72cc': 'Lord M.E.G.A Zion',
  '721bf1b0-2060-48ac-8c4c-9303f95f3ff2': 'Micah Nyatindo',
  'a85df179-ad87-4aa7-af83-34e336e2e045': 'Michelle Thuo',
  'b7c628cd-9036-4990-963f-8da4ff9fb1b5': 'Mike McGuire',
  '58e28cc4-89b6-48cf-b8d7-c94581258604': 'Nada El Mais',
  'b83c86b5-8a10-490e-92cf-d3f0a19af5e3': 'Phahsa',
  '4aac6b8c-03d5-4c0f-9a3f-6d3313050150': 'Sara Pascual',
  'd6b40cf0-17ea-42d2-9137-ab0a19fb31b1': 'Suzanne Dumouchel',
  '606115f2-9bc7-4dcd-a572-67680e4febfe': 'Tianqun Pan',
  'b227c567-55a0-4287-a6e4-cc4eaf753c0c': null, // display name is an email; no name on record
  // Staging (dev.interfacehub.net) id for Daveed Benjamin.
  '1920eb85-4e36-4d61-af5a-b42e83183ec8': 'Daveed Benjamin',
};

/**
 * Second accounts of one person, merged into the first for counting (one person, one voter). Empty: only one of
 * Daveed Benjamin's accounts voted on the 16 Nov ballot.
 */
export const VOTER_MERGE: Readonly<Record<string, string>> = {};

export function voterName(userId: string): string | null {
  return VOTER_NAMES[userId] ?? null;
}
