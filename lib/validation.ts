import { z } from 'zod';
import { GEM_PERSONA_IDS } from '@/types';

export const personaSchema = z.enum(GEM_PERSONA_IDS);

const designRef = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('image'),
    url: z.string().regex(/^data:image\/(png|jpe?g|webp);base64,/).max(1_500_000),
    name: z.string().max(120).optional(),
  }),
  z.object({
    type: z.literal('url'),
    url: z.string().url().max(500).refine((u) => /^https?:\/\//i.test(u), 'harus http(s)'),
    name: z.string().max(120).optional(),
  }),
]);

export const designRefs = z.array(designRef).max(6);

const projectFields = {
  title: z.string().trim().min(1).max(120),
  raw_prompt: z.string().trim().min(3).max(8000),
  gem_persona: personaSchema,
  design_ref_url: designRefs,
  skills: z.array(z.string().max(60)).max(20),
};

export const createProjectSchema = z.object({
  title: projectFields.title.optional(),
  raw_prompt: projectFields.raw_prompt,
  gem_persona: projectFields.gem_persona.default('mvp-speedrunner'),
  design_ref_url: projectFields.design_ref_url.default([]),
  skills: projectFields.skills.default([]),
});

export const updateProjectSchema = z.object(projectFields).partial();

export const visualEditSchema = z.object({
  projectId: z.string().min(1),
  instruction: z.string().trim().min(2).max(1000),
  selection: z
    .object({
      selector: z.string().max(500).optional(),
      tag: z.string().max(40).optional(),
      text: z.string().max(500).optional(),
      html: z.string().max(4000).optional(),
    })
    .optional(),
});
