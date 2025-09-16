<script lang="ts">
  import { toasts, dismiss, type Toast } from '$lib/toast';
  import { fade, fly } from 'svelte/transition';
  import { Check, Info, AlertTriangle, X } from 'lucide-svelte';
  let items: Toast[] = $state([]);
  $effect(() => {
    const unsub = toasts.subscribe((v) => (items = v));
    return unsub;
  });

  function containerClasses(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'from-emerald-600/60 to-emerald-700/60 border-emerald-300/20 ring-emerald-300/10';
      case 'error':
        return 'from-rose-600/60 to-rose-700/60 border-rose-300/20 ring-rose-300/10';
      case 'warning':
        return 'from-amber-600/60 to-amber-700/60 border-amber-300/20 ring-amber-300/10';
      case 'info':
        return 'from-sky-600/60 to-sky-700/60 border-sky-300/20 ring-sky-300/10';
      default:
        return 'from-slate-800/70 to-slate-900/70 border-slate-300/15 ring-white/5';
    }
  }

  function accentBarClasses(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'from-emerald-400 to-emerald-600';
      case 'error':
        return 'from-rose-400 to-rose-600';
      case 'warning':
        return 'from-amber-400 to-amber-600';
      case 'info':
        return 'from-sky-400 to-sky-600';
      default:
        return 'from-slate-300 to-slate-500';
    }
  }

  function iconWrapClasses(type: Toast['type']): string {
    switch (type) {
      case 'success':
        return 'bg-emerald-500/10 text-emerald-200/90 ring-emerald-300/10';
      case 'error':
        return 'bg-rose-500/10 text-rose-200/90 ring-rose-300/10';
      case 'warning':
        return 'bg-amber-500/10 text-amber-100/90 ring-amber-300/10';
      case 'info':
        return 'bg-sky-500/10 text-sky-200/90 ring-sky-300/10';
      default:
        return 'bg-white/5 text-white/80 ring-white/5';
    }
  }
</script>

<!-- Toast viewport -->
<div class="fixed z-50 top-4 right-4 w-[calc(100vw-2rem)] max-w-sm space-y-3 pointer-events-none">
  {#each items as t (t.id)}
    <div
      class="pointer-events-auto border rounded-2xl shadow-lg overflow-hidden text-white/90 bg-gradient-to-br {containerClasses(t.type)} ring-1"
      in:fly={{ x: 24, duration: 180 }}
      out:fade={{ duration: 120 }}
      role="status"
      aria-live="polite"
    >
      <div class="relative">
        <div class="absolute inset-y-0 left-0 w-px bg-gradient-to-b {accentBarClasses(t.type)} opacity-60"></div>
        <div class="px-4 py-3 pl-5 flex items-center gap-3">
          <div class="h-6 w-6 shrink-0 rounded-full grid place-items-center ring-1 {iconWrapClasses(t.type)}">
            {#if t.type === 'success'}
              <Check size={14} strokeWidth={2} />
            {:else if t.type === 'error'}
              <AlertTriangle size={14} strokeWidth={2} />
            {:else if t.type === 'warning'}
              <AlertTriangle size={14} strokeWidth={2} />
            {:else}
              <Info size={14} strokeWidth={2} />
            {/if}
          </div>
          <div class="flex-1 min-w-0">
            <div class="text-[13px] leading-5 font-medium tracking-wide break-words">
              {t.message}
            </div>
          </div>
          {#if t.action}
            <button
              class="text-[11px] uppercase tracking-wide font-semibold px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 border border-white/15 shadow-sm whitespace-nowrap"
              onclick={() => { t.action?.onClick?.(); dismiss(t.id); }}
            >
              {t.action.label}
            </button>
          {/if}
          {#if t.dismissible !== false}
            <button
              class="ml-1 text-white/70 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 rounded-full h-6 w-6 grid place-items-center border border-white/10 bg-white/5"
              aria-label="Dismiss notification"
              onclick={() => dismiss(t.id)}
            >
              <X size={12} strokeWidth={2} />
            </button>
          {/if}
        </div>
      </div>
    </div>
  {/each}
</div>
