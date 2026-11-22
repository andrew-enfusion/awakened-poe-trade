<template>
  <ForkAbout />
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import ForkAbout from '@/extensions/components/ForkAbout.vue'

export default defineComponent({
  name: 'settings.about',
  inheritAttrs: false,
  components: { ForkAbout }
})
</script>
