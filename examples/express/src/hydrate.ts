import { sayHi, add } from "./api";
import { getError, isValiError } from "./util/helpers";

export const setupGreeting = async (target: HTMLHeadingElement) => {
  const { data, cancel } = sayHi("Jane Doe");
  target.onmouseenter = () => cancel("Aborted");
  const greeting = await data;
  console.log(`API responded with "${greeting}"`);

  target.innerText = greeting;
};

export const setupForm = async (target: HTMLFormElement) => {
  target.addEventListener("submit", async (e) => {
    e.preventDefault();
    const formData = new FormData(target);
    const output = target.querySelector("output") as HTMLOutputElement;
    const errorDivA = document.getElementById("error-a") as HTMLDivElement;
    const errorDivB = document.getElementById("error-b") as HTMLDivElement;
    const payload = JSON.stringify(Object.fromEntries(formData.entries()));
    console.log("setupForm.formData", formData);
    // console.log(result)
    const { data } = add(payload);
    const result = await data;
    if (
      typeof result === "object" &&
      "error" in result &&
      isValiError(result.error)
    ) {
      output.textContent = "Result: Error";
      errorDivA.textContent = getError(result.error, "a");
      errorDivB.textContent = getError(result.error, "b");
    } else {
      output.textContent = "Result: " + String(result);
      errorDivA.innerHTML = "";
      errorDivB.innerHTML = "";
    }
  });
};
