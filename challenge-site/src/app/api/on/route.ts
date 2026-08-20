import { NextResponse } from 'next/server';
import { getAllianceDirectory, listAllianceOrgs } from '@/lib/hermes-onboard/directory';

export async function GET() {
  const directory = getAllianceDirectory();
  return NextResponse.json({
    cohort: directory.cohort,
    cohortLabel: directory.cohortLabel,
    directoryNote: directory.directoryNote,
    orgs: listAllianceOrgs().map((org) => ({
      slug: org.slug,
      name: org.name,
      shortName: org.shortName,
      mission: org.mission,
      website: org.website,
    })),
  });
}
