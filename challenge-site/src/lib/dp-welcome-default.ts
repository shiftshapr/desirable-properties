import {
  PROFILE_WELCOME_COORDINATOR,
  PROFILE_WELCOME_MEMBER,
  type DpWelcomeVariant,
} from '@/lib/dp-welcome-content';

export type ProfileWelcomeLink = {
  id: string;
  title: string;
  body?: string;
  link_url: string;
  variant: DpWelcomeVariant;
  is_default?: boolean;
};

function welcomePath(variant: DpWelcomeVariant) {
  return variant === 'member' ? '/welcome/member' : '/welcome/coordinator';
}

/** Fallback welcome for signed-in users without a Gov Hub workgroup notification. */
export function buildDefaultProfileWelcome(
  variant: DpWelcomeVariant = 'member',
): ProfileWelcomeLink {
  const copy = variant === 'member' ? PROFILE_WELCOME_MEMBER : PROFILE_WELCOME_COORDINATOR;
  return {
    id: `default-${variant}-welcome`,
    title: copy.linkLabel,
    link_url: welcomePath(variant),
    variant,
    is_default: true,
  };
}

export function resolveDefaultWelcomeVariant(
  welcomes: Array<{ variant: DpWelcomeVariant }>,
): DpWelcomeVariant {
  return welcomes.some((welcome) => welcome.variant === 'coordinator') ? 'coordinator' : 'member';
}
