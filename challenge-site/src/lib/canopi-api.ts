/** Canopi API base (embed + auth). */
export function getCanopiApiBase() {
  return String(process.env.CANOPI_API_BASE || 'https://api.canopi.live').replace(/\/$/, '');
}
