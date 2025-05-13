import { sayHi } from "./api";

export const setupGreeting = async (target?: HTMLHeadingElement) => {
    const isServer = typeof window === "undefined";
    const greeting = await sayHi("John Doe");

    if (!isServer && target) {
        console.log(`API responded with "${greeting}"`);
        target.innerText = greeting;
        target.parentElement?.append("Hydrated");
        return;
    }
    console.log(`SSR greeting "${greeting}"`);    
}
