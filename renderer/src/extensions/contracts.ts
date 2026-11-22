export interface MessageTree {
  [key: string]: string | MessageTree
}

export interface ItemParsedEvent<TItem> {
  item: TItem
  stage: 'copied' | 'identified'
}

export interface ExtensionContext<TItem> {
  addEnglishMessages: (messages: MessageTree) => void
  onItemParsed: (listener: (event: ItemParsedEvent<TItem>) => void | Promise<void>) => () => void
}

export interface RendererExtension<TItem> {
  id: string
  setup: (context: ExtensionContext<TItem>) => void | (() => void)
}
