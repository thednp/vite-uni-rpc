import './style.css'
import { setupGreeting } from './greeting.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <h1>Hello World!</h1>
    <p class="read-the-docs">
      SPA Example using <code>vite-uni-rpc</code> with <code>node:http</code>
    </p>
    <p>Refresh page after 5s</p>
  </div>
`

setupGreeting(document.querySelector('h1') as HTMLHeadingElement)
