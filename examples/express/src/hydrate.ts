import { sayHi, add } from "./api";

export const setupGreeting = async (target: HTMLHeadingElement) => {
  const greeting = await sayHi("Jane Doe");
  console.log(`API responded with "${greeting}"`);

  target.innerText = greeting;
}

export const setupForm = async (target: HTMLFormElement) => {
  target.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(target);
    console.log("setupForm.formData", formData);
    const result = await add(formData);
    console.log("setupForm.result", result)
  })

  // const greeting = await sayHi("Jane Doe");
  // console.log(`API responded with "${greeting}"`);

  // target.innerText = greeting;
}
