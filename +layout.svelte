<script lang="ts">
  import "../app.css";
  import { authStore } from "$lib/auth-store.svelte";
  import PreloadingIndicator from "$lib/components/PreloadingIndicator.svelte";
  import Alert from "$lib/components/Alert.svelte";
  import { navigating } from "$app/state";

  let { data, children } = $props();

  authStore.initialize(data.user, data.session);
</script>

{#if navigating.to}
  <PreloadingIndicator />
{/if}

{@render children()}

<Alert />
