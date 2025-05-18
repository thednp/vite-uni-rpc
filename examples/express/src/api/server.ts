import { createServerFunction } from "vite-uni-rpc/server";

export const sayHi = createServerFunction(
  "say-hi",
  async (name) => {
    await new Promise(res => setTimeout(res, 1500));
    return `Hello ${name}!`;
  },
  { ttl: 5000 }
);

export const add = createServerFunction(
  "add-numbers",
  async (formData) => {
    // const formData = args[0] as FormData;
    console.log("add.formData", formData);
    // const 
    // console.log("add.fields", fields);
    // console.log("add.files",  files);
    await new Promise(res => setTimeout(res, 331));
    // const a = Number(formData.get("a"));
    // const b = Number(formData.get("a"));
    // return a + b;
    return 3
  },
  {
    ttl: 1,
  }
);
