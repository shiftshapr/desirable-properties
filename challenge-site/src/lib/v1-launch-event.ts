/** Version 1.0 launch event (Zoom, Friday 13 November 2026): recording, transcript and links. */
export const V1_LAUNCH_EVENT_PATH = '/events/v1-launch';
export const V1_LAUNCH_YOUTUBE_ID = '07CxwGT49Rk';
export const V1_LAUNCH_VIDEO_TITLE = 'The Layered Web, Version 1.0 Launch';
export const V1_LAUNCH_POSTER = '/events/v1-launch/thumbnail.jpg';
export const V1_LAUNCH_TRANSCRIPT_VTT = '/events/v1-launch/transcript.vtt';

/** "1:12:08" style clock for transcript and chapter timestamps. */
export function videoClock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
