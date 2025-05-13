import './style.css'
import { App } from './App'
import { setupGreeting } from './greeting';

const Main = () => {
    const markup = App();
    const div = document.createElement("div");
    div.innerHTML = markup;
    return [...div.childNodes];
}

document.getElementById("app")!.replaceChildren(...Main());
setupGreeting(document.querySelector('h1') as HTMLHeadingElement)
