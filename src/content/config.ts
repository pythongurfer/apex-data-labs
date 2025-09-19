import { defineCollection, z } from 'astro:content';

const postCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    publishDate: z.string().transform((str) => new Date(str)),
    excerpt: z.string(),
    image: z.string().optional(), // <-- ¡CAMBIO IMPORTANTE! Vuelve a ser un string.
    category: z.string().optional(),
    tags: z.array(z.string()).optional(),
    draft: z.boolean().optional(),
    layout: z.string().optional(),
    author: z.string().optional(),
    updateDate: z.string().transform((str) => new Date(str)).optional(),
    metadata: z.object({}).optional(),
  }),
});

export const collections = {
  post: postCollection,
};