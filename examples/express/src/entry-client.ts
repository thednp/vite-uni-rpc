import './style.css'
import { setupGreeting, setupForm } from './hydrate'

setupGreeting(document.querySelector('h1') as HTMLHeadingElement)
setupForm(document.querySelector('form') as HTMLFormElement)
