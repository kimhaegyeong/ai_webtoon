import type { EpisodeStyle } from '@/types';

export const STYLE_PREFIXES: Record<EpisodeStyle, string> = {
  webtoon: 'Korean webtoon style, clean line art, vibrant colors, vertical comic panel,',
  four_cut: '4-cut manga style, simple expressive characters, black and white with tones,',
  shoujo: 'Shoujo manga style, delicate lines, floral accents, sparkles, emotional expression,',
  action: 'Action manga style, dynamic poses, speed lines, bold inking, high contrast,',
  chibi: 'Chibi style, super deformed cute characters, big heads, small bodies, pastel colors,',
  noir: 'Noir manga style, heavy shadows, monochrome, dramatic lighting, film noir atmosphere,',
};

export function buildImagePrompt(
  style: EpisodeStyle,
  characterPrompt: string,
  sceneDescription: string,
  dialogue: string | null,
  soundEffect: string | null,
  bubblePosition: 'left' | 'right' | 'center',
): string {
  const parts: string[] = [
    STYLE_PREFIXES[style],
    `Character: ${characterPrompt}.`,
    `Scene: ${sceneDescription}.`,
  ];

  if (dialogue) {
    parts.push(`Speech bubble (${bubblePosition}): "${dialogue}"`);
  }
  if (soundEffect) {
    parts.push(`Sound effect: ${soundEffect}`);
  }

  parts.push('Vertical aspect ratio 3:4. Single comic panel. No panel borders visible in final image.');

  return parts.join(' ');
}
