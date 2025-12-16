<script lang="ts">
  type Variant = "default" | "success" | "warning" | "error" | "info";
  type Size = "sm" | "md" | "lg";

  interface Props {
    variant?: Variant;
    size?: Size;
    pill?: boolean;
    dot?: boolean;
    removable?: boolean;
    onRemove?: () => void;
    class?: string;
    children: import("svelte").Snippet;
  }

  let {
    variant = "default",
    size = "md",
    pill = false,
    dot = false,
    removable = false,
    onRemove,
    class: className = "",
    children,
  }: Props = $props();

  const variantClasses: Record<Variant, string> = {
    default: "bg-gray-100 text-gray-800",
    success: "bg-green-100 text-green-800",
    warning: "bg-yellow-100 text-yellow-800",
    error: "bg-red-100 text-red-800",
    info: "bg-blue-100 text-blue-800",
  };

  const dotVariantClasses: Record<Variant, string> = {
    default: "bg-gray-500",
    success: "bg-green-500",
    warning: "bg-yellow-500",
    error: "bg-red-500",
    info: "bg-blue-500",
  };

  const sizeClasses: Record<Size, string> = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  const dotSizeClasses: Record<Size, string> = {
    sm: "w-1.5 h-1.5",
    md: "w-2 h-2",
    lg: "w-2.5 h-2.5",
  };
</script>

<span
  class="inline-flex items-center gap-1.5 font-medium {variantClasses[variant]} {sizeClasses[size]} {pill ? 'rounded-full' : 'rounded'} {className}"
>
  {#if dot}
    <span class="rounded-full {dotVariantClasses[variant]} {dotSizeClasses[size]}"></span>
  {/if}
  {@render children()}
  {#if removable}
    <button
      type="button"
      onclick={onRemove}
      class="ml-0.5 -mr-1 inline-flex items-center justify-center w-4 h-4 rounded-full hover:bg-black/10 transition-colors"
      aria-label="Remove"
    >
      <svg
        class="w-3 h-3"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  {/if}
</span>
