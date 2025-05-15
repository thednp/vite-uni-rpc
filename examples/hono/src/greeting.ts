import { sayHi } from "./api";

export const setupGreeting = async (target: HTMLHeadingElement) => {
  const greeting = await sayHi("Jane Doe");
  console.log(`API responded with "${greeting}"`);

  target.innerText = greeting;
}
