import { z } from "zod";
export const imageProfiles = {
  clear: {
    label: "清晰",
    dimension: 2048,
    quality: 0.92,
    softBytes: 1536 * 1024,
  },
  data: {
    label: "省流",
    dimension: 1600,
    quality: 0.85,
    softBytes: 512 * 1024,
  },
} as const;
export type ImageQuality = keyof typeof imageProfiles;
export const attachmentLimits = {
  bytes: 3 * 1024 * 1024,
  dimension: 2048,
  roomBytes: 64 * 1024 * 1024,
  ttl: 24 * 60 * 60 * 1000,
} as const;
export function compressionOptions(mime: string, mode: ImageQuality) {
  const profile = imageProfiles[mode];
  return {
    maxSizeMB: profile.softBytes / 1024 / 1024,
    maxWidthOrHeight: profile.dimension,
    initialQuality: mime === "image/png" ? 1 : profile.quality,
    alwaysKeepResolution: true,
    maxIteration: 1,
    fileType: mime === "image/png" ? "image/png" : "image/webp",
  };
}
export const attachmentSchema = z.object({
  id: z.string().regex(/^[a-f0-9]{64}$/u),
  mime: z.enum(["image/jpeg", "image/png", "image/webp"]),
  width: z.number().int().positive().max(attachmentLimits.dimension),
  height: z.number().int().positive().max(attachmentLimits.dimension),
  size: z.number().int().positive().max(attachmentLimits.bytes),
});
export type Attachment = z.infer<typeof attachmentSchema>;
