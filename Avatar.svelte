<script lang="ts">
  type Size = "xs" | "sm" | "md" | "lg" | "xl";
  type Status = "online" | "offline" | "away" | "busy" | "none";

  interface Props {
    src?: string;
    alt?: string;
    name?: string;
    size?: Size;
    status?: Status;
    class?: string;
  }

  let {
    src,
    alt = "Avatar",
    name,
    size = "md",
    status = "none",
    class: className = "",
  }: Props = $props();

  let imageError = $state(false);

  const sizeClasses: Record<Size, string> = {
    xs: "w-6 h-6 text-xs",
    sm: "w-8 h-8 text-sm",
    md: "w-10 h-10 text-base",
    lg: "w-12 h-12 text-lg",
    xl: "w-16 h-16 text-xl",
  };

  const statusSizeClasses: Record<Size, string> = {
    xs: "w-1.5 h-1.5 border",
    sm: "w-2 h-2 border",
    md: "w-2.5 h-2.5 border-2",
    lg: "w-3 h-3 border-2",
    xl: "w-4 h-4 border-2",
  };

  const statusColorClasses: Record<Status, string> = {
    online: "bg-green-500",
    offline: "bg-gray-400",
    away: "bg-yellow-500",
    busy: "bg-red-500",
    none: "",
  };

  let initials = $derived.by(() => {
    if (!name) return "";
    const parts = name.trim().split(/\s+/).filter(part => part.length > 0);
    if (parts.length === 0) return "";
    if (parts.length === 1) {
      return parts[0].substring(0, 2).toUpperCase();
    }
    const firstChar = parts[0][0] || "";
    const lastChar = parts[parts.length - 1][0] || "";
    return (firstChar + lastChar).toUpperCase();
  });

  let backgroundColor = $derived.by(() => {
    if (!name) return "bg-gray-300";
    const colors = [
      "bg-blue-500",
      "bg-green-500",
      "bg-yellow-500",
      "bg-red-500",
      "bg-purple-500",
      "bg-pink-500",
      "bg-indigo-500",
      "bg-cyan-500",
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  });

  function handleError() {
    imageError = true;
  }
</script>

<div class="relative inline-block {className}">
  <div
    class="rounded-full overflow-hidden flex items-center justify-center {sizeClasses[size]} {!src || imageError ? backgroundColor : ''}"
  >
    {#if src && !imageError}
      <img
        {src}
        {alt}
        class="w-full h-full object-cover"
        onerror={handleError}
      />
    {:else if initials}
      <span class="font-medium text-white">
        {initials}
      </span>
    {:else}
      <svg
        class="w-3/4 h-3/4 text-gray-600"
        fill="currentColor"
        viewBox="0 0 24 24"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path
          d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
        />
      </svg>
    {/if}
  </div>

  {#if status !== "none"}
    <span
      class="absolute bottom-0 right-0 rounded-full border-white {statusSizeClasses[size]} {statusColorClasses[status]}"
    ></span>
  {/if}
</div>
