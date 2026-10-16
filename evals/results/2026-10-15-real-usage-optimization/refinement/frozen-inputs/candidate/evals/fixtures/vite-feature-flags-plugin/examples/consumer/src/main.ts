import { flags } from './flags'

const root = document.querySelector<HTMLElement>('#app')

if (root) {
  root.textContent = `${String(flags.checkoutV2)}:${String(flags.theme)}`
}
