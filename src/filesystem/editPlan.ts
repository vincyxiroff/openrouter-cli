import { z } from "zod";
import type { EditPlan } from "../core/types.js";

const changeSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("create"),
    path: z.string().min(1),
    content: z.string()
  }),
  z.object({
    type: z.literal("update"),
    path: z.string().min(1),
    content: z.string()
  }),
  z.object({
    type: z.literal("delete"),
    path: z.string().min(1)
  })
]);

const editPlanSchema = z.object({
  summary: z.string().min(1),
  reasoning: z.string().min(1),
  changes: z.array(changeSchema),
  commands: z.array(z.string()).default([])
});

export function parseEditPlan(value: unknown): EditPlan {
  return editPlanSchema.parse(value);
}
