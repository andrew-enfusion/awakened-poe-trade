import application from '../../../../config/application.json'
import messages from './identity-messages.json'
import type { RendererExtension } from '../contracts.ts'

export function identityExtension<TItem> (): RendererExtension<TItem> {
  return {
    id: 'fork-identity',
    setup (context) {
      document.title = application.productName
      context.addEnglishMessages(messages)
    }
  }
}
