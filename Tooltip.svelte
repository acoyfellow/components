<script lang="ts">
  import { onMount } from "svelte";

  type Position = "top" | "bottom" | "left" | "right";

  interface Props {
    text: string;
    position?: Position;
    delay?: number;
    class?: string;
    children: import("svelte").Snippet;
  }

  let {
    text,
    position = "top",
    delay = 200,
    class: className = "",
    children,
  }: Props = $props();

  let visible = $state(false);
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const positionClasses: Record<Position, string> = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
    left: "right-full top-1/2 -translate-y-1/2 mr-2",
    right: "left-full top-1/2 -translate-y-1/2 ml-2",
  };

  const arrowClasses: Record<Position, string> = {
    top: "top-full left-1/2 -translate-x-1/2 border-t-gray-900 border-x-transparent border-b-transparent",
    bottom: "bottom-full left-1/2 -translate-x-1/2 border-b-gray-900 border-x-transparent border-t-transparent",
    left: "left-full top-1/2 -translate-y-1/2 border-l-gray-900 border-y-transparent border-r-transparent",
    right: "right-full top-1/2 -translate-y-1/2 border-r-gray-900 border-y-transparent border-l-transparent",
  };

  function show() {
    timeoutId = setTimeout(() => {
      visible = true;
    }, delay);
  }

  function hide() {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
    visible = false;
  }

  onMount(() => {
    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  });
</script>

<div
  class="relative inline-block {className}"
  onmouseenter={show}
  onmouseleave={hide}
  onfocus={show}
  onblur={hide}
  role="tooltip"
>
  {@render children()}
  {#if visible && text}
    <div
      class="absolute z-50 px-2 py-1 text-sm text-white bg-gray-900 rounded shadow-lg whitespace-nowrap pointer-events-none {positionClasses[position]}"
    >
      {text}
      <div
        class="absolute w-0 h-0 border-4 {arrowClasses[position]}"
      ></div>
    </div>
  {/if}
</div>
