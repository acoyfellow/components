<script lang="ts">
  import ChevronLeft from "@lucide/svelte/icons/chevron-left";
  import ChevronRight from "@lucide/svelte/icons/chevron-right";
  import ChevronsLeft from "@lucide/svelte/icons/chevrons-left";
  import ChevronsRight from "@lucide/svelte/icons/chevrons-right";

  interface Props {
    currentPage: number;
    totalPages: number;
    siblingCount?: number;
    showFirstLast?: boolean;
    onPageChange: (page: number) => void;
    class?: string;
  }

  let {
    currentPage,
    totalPages,
    siblingCount = 1,
    showFirstLast = true,
    onPageChange,
    class: className = "",
  }: Props = $props();

  const range = (start: number, end: number) => {
    const length = end - start + 1;
    return Array.from({ length }, (_, i) => start + i);
  };

  let paginationRange = $derived.by(() => {
    const totalPageNumbers = siblingCount * 2 + 3;

    if (totalPageNumbers >= totalPages) {
      return range(1, totalPages);
    }

    const leftSiblingIndex = Math.max(currentPage - siblingCount, 1);
    const rightSiblingIndex = Math.min(currentPage + siblingCount, totalPages);

    const showLeftDots = leftSiblingIndex > 2;
    const showRightDots = rightSiblingIndex < totalPages - 1;

    if (!showLeftDots && showRightDots) {
      const leftItemCount = 3 + 2 * siblingCount;
      const leftRange = range(1, leftItemCount);
      return [...leftRange, "...", totalPages];
    }

    if (showLeftDots && !showRightDots) {
      const rightItemCount = 3 + 2 * siblingCount;
      const rightRange = range(totalPages - rightItemCount + 1, totalPages);
      return [1, "...", ...rightRange];
    }

    const middleRange = range(leftSiblingIndex, rightSiblingIndex);
    return [1, "...", ...middleRange, "...", totalPages];
  });

  function goToPage(page: number) {
    if (page >= 1 && page <= totalPages && page !== currentPage) {
      onPageChange(page);
    }
  }

  const baseButtonClass =
    "flex items-center justify-center w-10 h-10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const activeClass = "bg-blue-500 text-white";
  const inactiveClass = "bg-gray-100 hover:bg-gray-200 text-gray-700";
</script>

<nav
  class="flex items-center gap-1 {className}"
  aria-label="Pagination"
>
  {#if showFirstLast}
    <button
      onclick={() => goToPage(1)}
      disabled={currentPage === 1}
      class="{baseButtonClass} {inactiveClass}"
      aria-label="Go to first page"
    >
      <ChevronsLeft class="w-4 h-4" />
    </button>
  {/if}

  <button
    onclick={() => goToPage(currentPage - 1)}
    disabled={currentPage === 1}
    class="{baseButtonClass} {inactiveClass}"
    aria-label="Go to previous page"
  >
    <ChevronLeft class="w-4 h-4" />
  </button>

  {#each paginationRange as pageNumber}
    {#if pageNumber === "..."}
      <span class="flex items-center justify-center w-10 h-10 text-gray-500">
        ...
      </span>
    {:else}
      <button
        onclick={() => goToPage(pageNumber as number)}
        class="{baseButtonClass} {pageNumber === currentPage ? activeClass : inactiveClass}"
        aria-label="Go to page {pageNumber}"
        aria-current={pageNumber === currentPage ? "page" : undefined}
      >
        {pageNumber}
      </button>
    {/if}
  {/each}

  <button
    onclick={() => goToPage(currentPage + 1)}
    disabled={currentPage === totalPages}
    class="{baseButtonClass} {inactiveClass}"
    aria-label="Go to next page"
  >
    <ChevronRight class="w-4 h-4" />
  </button>

  {#if showFirstLast}
    <button
      onclick={() => goToPage(totalPages)}
      disabled={currentPage === totalPages}
      class="{baseButtonClass} {inactiveClass}"
      aria-label="Go to last page"
    >
      <ChevronsRight class="w-4 h-4" />
    </button>
  {/if}
</nav>
