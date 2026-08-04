import { redirect } from 'next/navigation';

type Props = {
  searchParams: Promise<{ next?: string }>;
};

/** Legacy URL — admin pages now open Web3Auth on-page. */
export default async function OnchainAdminLoginPage({ searchParams }: Props) {
  const params = await searchParams;
  const next = params.next || '/onchain/admin';
  redirect(next);
}
