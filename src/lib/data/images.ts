import type { ComfyWorkflow, ImageJob, PromptTemplate } from "@/lib/types";
import { daysAgo } from "./common";

export const seedImageJobs: ImageJob[] = [
  {
    id: "img_1",
    prompt:
      "a warm editorial photograph of a university library at golden hour, shallow depth of field, dust in the light, film grain",
    negativePrompt: "text, watermark, extra fingers, lowres, blurry",
    model: "flux-1.1-pro",
    style: "Photographic",
    aspect: "16:9",
    seed: 841203,
    steps: 28,
    cfg: 6.5,
    status: "done",
    favorite: true,
    tags: ["education", "editorial", "hero"],
    createdAt: daysAgo(1),
  },
  {
    id: "img_2",
    prompt:
      "minimal 3d render of a pipeline with glowing nodes connected by light, indigo and teal, soft studio lighting, matte finish",
    negativePrompt: "clutter, text, low contrast",
    model: "sdxl-turbo",
    style: "3D render",
    aspect: "1:1",
    seed: 20914,
    steps: 6,
    cfg: 4.0,
    status: "done",
    favorite: false,
    tags: ["crm", "abstract", "social"],
    createdAt: daysAgo(2),
  },
  {
    id: "img_3",
    prompt:
      "isometric illustration of a student portal dashboard, clean vector shapes, indigo accent, cream background, no text",
    negativePrompt: "text, letters, gibberish words, watermark",
    model: "ideogram-2",
    style: "Vector",
    aspect: "4:3",
    seed: 553311,
    steps: 24,
    cfg: 7.5,
    status: "done",
    favorite: false,
    tags: ["product", "illustration"],
    createdAt: daysAgo(3),
  },
  {
    id: "img_4",
    prompt:
      "portrait of a confident student holding a folder of university offers, natural window light, muted teal and amber palette, cinematic",
    negativePrompt: "smiling too wide, teeth, distorted hands",
    model: "gpt-image-1",
    style: "Photographic",
    aspect: "9:16",
    seed: 771102,
    steps: 30,
    cfg: 6.0,
    status: "done",
    favorite: true,
    tags: ["education", "campaign", "reel"],
    createdAt: daysAgo(4),
  },
  {
    id: "img_5",
    prompt:
      "abstract flowing gradient ribbons, aurora indigo teal amber, dark background, smooth 3d glass, high contrast",
    negativePrompt: "flat, dull, banding",
    model: "stable-diffusion-3.5",
    style: "Abstract",
    aspect: "16:9",
    seed: 998231,
    steps: 36,
    cfg: 7.0,
    status: "done",
    favorite: false,
    tags: ["brand", "background"],
    createdAt: daysAgo(6),
  },
  {
    id: "img_6",
    prompt:
      "flat vector illustration of a calendar with deadlines and checkmarks, friendly geometric shapes, warm cream palette, thick strokes",
    negativePrompt: "photorealistic, gradient, text",
    model: "dalle-3",
    style: "Vector",
    aspect: "1:1",
    seed: 441007,
    steps: 20,
    cfg: 5.5,
    status: "done",
    favorite: false,
    tags: ["education", "illustration", "social"],
    createdAt: daysAgo(8),
  },
];

export const seedPromptTemplates: PromptTemplate[] = [
  {
    id: "pt_1",
    name: "Editorial hero — study abroad",
    prompt:
      "cinematic photograph of a diverse group of students walking across a modern university courtyard at golden hour, natural light, 35mm, shallow depth of field, warm highlights, no text",
    negative: "text, logos, distorted faces, extra limbs, oversaturated",
    category: "Photography",
    tags: ["hero", "education", "campaign"],
    uses: 412,
  },
  {
    id: "pt_2",
    name: "Abstract 3D — product backdrop",
    prompt:
      "single glossy 3d shape floating on a dark indigo background, soft rim lighting, teal and amber gradient reflections, subsurface scattering, studio photography, 8k",
    negative: "busy background, text, harsh shadow, noise",
    category: "3D",
    tags: ["abstract", "brand", "social"],
    uses: 308,
  },
  {
    id: "pt_3",
    name: "Vector illustration — how it works",
    prompt:
      "clean flat vector illustration, four sequential panels showing a funnel, geometric characters, limited palette of indigo teal amber on cream, no text, generous negative space",
    negative: "text, letters, gradient, photo, watermark",
    category: "Illustration",
    tags: ["explainer", "illustration"],
    uses: 276,
  },
  {
    id: "pt_4",
    name: "UGC vertical — student story",
    prompt:
      "vertical handheld photo of a student reviewing university paperwork at a kitchen table, morning window light, candid, imperfect framing, natural colour, 9:16",
    negative: "studio lighting, posed, over retouched, text",
    category: "Photography",
    tags: ["ugc", "reel", "education"],
    uses: 198,
  },
  {
    id: "pt_5",
    name: "Aurora gradient — section background",
    prompt:
      "flowing aurora gradient ribbons in indigo teal and amber on near-black, smooth volumetric light, subtle grain, wide banner composition, no focal subject",
    negative: "objects, text, logo, busy detail",
    category: "Abstract",
    tags: ["background", "brand"],
    uses: 521,
  },
  {
    id: "pt_6",
    name: "Product screenshot mockup",
    prompt:
      "clean SaaS dashboard interface mockup on a soft cream background, floating browser window, indigo accent colour, minimal charts, generous whitespace, no readable text",
    negative: "readable text, gibberish letters, cluttered UI, dark",
    category: "UI",
    tags: ["mockup", "product"],
    uses: 244,
  },
  {
    id: "pt_7",
    name: "Icon set — workflow nodes",
    prompt:
      "set of 12 minimal line icons representing workflow nodes and connectors, 2px stroke, single indigo colour, on transparent, evenly spaced grid",
    negative: "colour, shading, text, 3d",
    category: "Illustration",
    tags: ["icons", "ui"],
    uses: 389,
  },
  {
    id: "pt_8",
    name: "Retro risograph — event poster",
    prompt:
      "two colour risograph print poster, indigo and amber inks with visible misregistration, grainy paper texture, bold geometric composition, editorial festival layout",
    negative: "smooth gradients, photorealistic, text",
    category: "Print",
    tags: ["poster", "event", "print"],
    uses: 142,
  },
];

export const seedComfyWorkflows: ComfyWorkflow[] = [
  {
    id: "wf_txt2img",
    name: "Text to image (basic)",
    description:
      "The smallest useful graph: a checkpoint, a prompt, a sampler, a latent and an output.",
    nodes: [
      { id: "n1", label: "Checkpoint loader", kind: "model", x: 40, y: 40 },
      { id: "n2", label: "CLIP text encode", kind: "prompt", x: 40, y: 160 },
      { id: "n3", label: "Empty latent", kind: "latent", x: 40, y: 280 },
      { id: "n4", label: "KSampler", kind: "sampler", x: 300, y: 140 },
      { id: "n5", label: "Save image", kind: "save", x: 560, y: 140 },
    ],
    edges: [
      { from: "n1", to: "n4" },
      { from: "n2", to: "n4" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5" },
    ],
  },
  {
    id: "wf_img2img",
    name: "Image to image + upscale",
    description:
      "Load an existing frame, add detail with a denoise pass, then upscale twice.",
    nodes: [
      { id: "n1", label: "Load image", kind: "load", x: 40, y: 40 },
      { id: "n2", label: "VAE encode", kind: "model", x: 40, y: 160 },
      { id: "n3", label: "CLIP text encode", kind: "prompt", x: 40, y: 280 },
      { id: "n4", label: "KSampler (denoise .35)", kind: "sampler", x: 300, y: 160 },
      { id: "n5", label: "Latent upscale", kind: "latent", x: 300, y: 320 },
      { id: "n6", label: "Save image", kind: "save", x: 560, y: 200 },
    ],
    edges: [
      { from: "n1", to: "n2" },
      { from: "n2", to: "n4" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5" },
      { from: "n5", to: "n6" },
    ],
  },
  {
    id: "wf_controlnet",
    name: "ControlNet depth guidance",
    description:
      "Hold the composition with a depth map while the model handles style and light.",
    nodes: [
      { id: "n1", label: "Checkpoint loader", kind: "model", x: 40, y: 40 },
      { id: "n2", label: "CLIP text encode", kind: "prompt", x: 40, y: 160 },
      { id: "n3", label: "Depth preprocessor", kind: "load", x: 40, y: 280 },
      { id: "n4", label: "ControlNet apply", kind: "sampler", x: 300, y: 160 },
      { id: "n5", label: "KSampler", kind: "sampler", x: 520, y: 160 },
      { id: "n6", label: "Save image", kind: "save", x: 740, y: 160 },
    ],
    edges: [
      { from: "n1", to: "n4" },
      { from: "n2", to: "n4" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5" },
      { from: "n5", to: "n6" },
    ],
  },
  {
    id: "wf_ipadapter",
    name: "IP-Adapter style transfer",
    description:
      "Borrow the palette of a reference image while keeping the new composition.",
    nodes: [
      { id: "n1", label: "Checkpoint loader", kind: "model", x: 40, y: 40 },
      { id: "n2", label: "CLIP text encode", kind: "prompt", x: 40, y: 160 },
      { id: "n3", label: "Load reference", kind: "load", x: 40, y: 280 },
      { id: "n4", label: "IP-Adapter apply", kind: "sampler", x: 300, y: 200 },
      { id: "n5", label: "KSampler", kind: "sampler", x: 540, y: 200 },
      { id: "n6", label: "Save image", kind: "save", x: 760, y: 200 },
    ],
    edges: [
      { from: "n1", to: "n4" },
      { from: "n2", to: "n4" },
      { from: "n3", to: "n4" },
      { from: "n4", to: "n5" },
      { from: "n5", to: "n6" },
    ],
  },
];

export const IMAGE_MODELS = [
  { id: "flux-1.1-pro", label: "FLUX 1.1 Pro", speed: 62, quality: 94, cost: 0.04, best: "Photoreal" },
  { id: "gpt-image-1", label: "GPT Image 1", speed: 74, quality: 91, cost: 0.08, best: "Prompt adherence" },
  { id: "dalle-3", label: "DALL·E 3", speed: 58, quality: 88, cost: 0.06, best: "Long prompts" },
  { id: "stable-diffusion-3.5", label: "SD 3.5 Large", speed: 88, quality: 84, cost: 0.02, best: "Control & cost" },
  { id: "sdxl-turbo", label: "SDXL Turbo", speed: 97, quality: 76, cost: 0.01, best: "Speed" },
  { id: "ideogram-2", label: "Ideogram 2", speed: 66, quality: 89, cost: 0.05, best: "Typography" },
] as const;

export const IMAGE_STYLES = [
  "Photographic",
  "Cinematic",
  "3D render",
  "Vector",
  "Illustration",
  "Abstract",
  "Watercolour",
  "Risograph",
  "Isometric",
  "Line art",
];

export const ASPECT_RATIOS = [
  { id: "1:1", label: "Square", w: 1, h: 1 },
  { id: "16:9", label: "Landscape", w: 16, h: 9 },
  { id: "9:16", label: "Portrait", w: 9, h: 16 },
  { id: "4:3", label: "Photo", w: 4, h: 3 },
  { id: "3:4", label: "Tall", w: 3, h: 4 },
] as const;
