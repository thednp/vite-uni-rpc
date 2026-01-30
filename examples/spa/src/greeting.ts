import { sayHi } from "./api";

export const setupGreeting = async (target: HTMLHeadingElement) => {
  const { data, cancel } = sayHi("Jane Doe");
  target.onmouseenter = () => {
    cancel("Click away");
    console.log(data);
  };
  const greeting = await data;
  console.log(`API responded with "${greeting}"`, greeting);

  target.innerText = greeting as string;
};
