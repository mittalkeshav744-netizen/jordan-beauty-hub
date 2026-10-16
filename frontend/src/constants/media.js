/**
 * Videos live in frontend/public/videos/ (MP4, ideally under 5 MB and 5–15 seconds long).
 * All of them play muted and on a loop.
 */

/**
 * The clips end on a logo card from about 7.5 s. Looping before it keeps the logo from
 * sitting behind the banner headline on phones and from repeating across the video strip.
 */
const LOOP_BEFORE_LOGO = 7

/**
 * Home page banner video (portrait). On phones it fills the banner behind the text; on wider
 * screens it sits beside the text in a tall card. Set src to null to show animated colour and
 * bestseller photos instead.
 */
export const HERO_VIDEO = {
  src: '/videos/brand-intro.mp4',
  poster: null,
  loopEnd: LOOP_BEFORE_LOGO,
}

/**
 * "Watch & shop" strip on the home page. `start` is the second each clip opens on
 * (some begin with a black frame).
 */
export const VIDEO_REELS = [
  { src: '/videos/serum.mp4', start: 4, title: 'The glow serum drop', to: '/shop?category=skincare' },
  { src: '/videos/blush.mp4', start: 1, loopEnd: 5, title: 'Soft blush glow', to: '/shop?category=face' },
  { src: '/videos/eyeshadow.mp4', start: 3, title: 'Shimmer eyeshadow edit', to: '/shop?category=eyes' },
  { src: '/videos/cream.mp4', start: 4, title: 'Deep hydration', to: '/shop?concern=dryness' },
  { src: '/videos/palette.mp4', start: 3, title: 'Festive palettes', to: '/looks' },
  { src: '/videos/collection.mp4', start: 4, title: 'The full collection', to: '/shop' },
].map((reel) => ({ loopEnd: LOOP_BEFORE_LOGO, ...reel }))
