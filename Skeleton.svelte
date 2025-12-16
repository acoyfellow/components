<script lang="ts">
  type Variant = "text" | "circular" | "rectangular" | "rounded";

  interface Props {
    variant?: Variant;
    width?: string;
    height?: string;
    lines?: number;
    class?: string;
  }

  let {
    variant = "text",
    width = "100%",
    height,
    lines = 1,
    class: className = "",
  }: Props = $props();

  const variantClasses: Record<Variant, string> = {
    text: "rounded",
    circular: "rounded-full",
    rectangular: "",
    rounded: "rounded-lg",
  };

  let computedHeight = $derived(
    height || (variant === "text" ? "1rem" : variant === "circular" ? width : "100px")
  );

  let lineHeights = $derived.by(() => {
    if (variant !== "text" || lines <= 1) return [];
    return Array.from({ length: lines - 1 }, (_, i) => ({
      width: i === lines - 2 ? "75%" : "100%",
    }));
  });
</script>

{#if variant === "text" && lines > 1}
  <div class="space-y-2 {className}" style="width: {width}">
    {#each Array.from({ length: lines }) as _, i}
      <div
        class="animate-pulse bg-gray-200 {variantClasses[variant]}"
        style="width: {i === lines - 1 ? '75%' : '100%'}; height: {computedHeight}"
      ></div>
    {/each}
  </div>
{:else}
  <div
    class="animate-pulse bg-gray-200 {variantClasses[variant]} {className}"
    style="width: {width}; height: {computedHeight}; {variant === 'circular' ? `aspect-ratio: 1` : ''}"
  ></div>
{/if}
