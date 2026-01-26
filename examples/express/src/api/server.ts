import { createServerFunction } from "vite-uni-rpc/server";
import { normalizeValue } from "../util/helpers";
import * as v from "valibot";

export const sayHi = createServerFunction(
  "say-hi",
  async (name) => {
    await new Promise(res => setTimeout(res, 1500));
    return `Hello ${name}!`;
  },
  { ttl: 5000 }
);

const AddSchema = v.object({
  a: v.number(),
  b: v.number(),
});

export const add = createServerFunction(
  "add-numbers",
  async (formData) => {
    await new Promise(res => setTimeout(res, 331));
    const json = JSON.parse(formData as string);
    const preparsed = Object.fromEntries(Object.entries(json).map(([key, val]) => 
      [key, normalizeValue(val)]
    ))
    const valid = v.safeParse(AddSchema, preparsed);
    if ((valid.issues)) {
      const { nested } = v.flatten(valid.issues);
      return { error: nested }
    }
    return valid.output.a + valid.output.b;
  }
);
