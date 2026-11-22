import type { Component } from 'vue'
import type { WidgetSpec } from '@/web/overlay/interfaces'

// Register fork widget components here; upstream widgets remain in their own registry.
export const extensionWidgets: Array<Component & { widget: WidgetSpec }> = []
