export const resolutionMapping: {
  [key in Resolution]: { w: number; h: number };
} = {
  "4320p": { w: 7680, h: 4320 }, // 8K
  "2160p": { w: 3840, h: 2160 }, // 4K
  "1440p": { w: 2560, h: 1440 }, // Quad HD
  "1080p": { w: 1920, h: 1080 }, // Full HD
  "720p": { w: 1280, h: 720 }, // HD
  "480p": { w: 854, h: 480 }, // SD (WVGA)
  "360p": { w: 640, h: 360 }, // nHD
  "240p": { w: 426, h: 240 }, // WQVGA
};

export const Resolution = [
  "4320p",
  "2160p",
  "1440p",
  "1080p",
  "720p",
  "480p",
  "360p",
  "240p",
] as const;
export type Resolution = (typeof Resolution)[number];
