<script lang="ts">
    import { settingsStore } from '$lib/settings';
    import { Tutorial } from '$lib/tutorial';
    import { fade, scale } from 'svelte/transition';

    type Step = {
        title?: string;
        content?: string;
    };

    interface Props {
        id: string;
        title?: string;
        steps?: Step[];
        children?: import('svelte').Snippet; // fallback single-step content
        show?: boolean; // force show (overrides seen check)
        persistent?: boolean; // don't auto-mark seen on close
    }

    let { id, title = '', steps = [], children, show = undefined, persistent = false }: Props = $props();

    let hidden = $state(false);
    let currentStep = $state(0);
    let dontShowAgain = $state(true);

    let shouldShow = $derived(
        show === true || (show === undefined && !Tutorial.isSeen(id) && $settingsStore.no_tutorials !== true)
    );

    const totalSteps = $derived(steps?.length > 0 ? steps.length : 1);
    const isLastStep = $derived(currentStep >= totalSteps - 1);

    function closeTutorial(markSeen: boolean) {
        if (markSeen && !persistent && dontShowAgain) Tutorial.markAsSeen(id);
        hidden = true;
    }

    function next() {
        if (isLastStep) return closeTutorial(true);
        currentStep = Math.min(currentStep + 1, totalSteps - 1);
    }

    function prev() {
        currentStep = Math.max(currentStep - 1, 0);
    }

    function skip() {
        // Skip for now: do not mark as seen so it can reappear later unless user checked don't show again
        closeTutorial(dontShowAgain);
    }

    function onBackdrop(e: MouseEvent) {
        // Only close when clicking the dark backdrop, not inner content
        const target = e.target as HTMLElement;
        if (target?.dataset?.overlay === 'backdrop') skip();
    }

    function onKeydown(e: KeyboardEvent) {
        if (!shouldShow || hidden) return;
        if (e.key === 'Escape') skip();
        if (e.key === 'ArrowRight') next();
        if (e.key === 'ArrowLeft') prev();
    }
</script>

{#if shouldShow && !hidden}
    <div class="fixed inset-0 z-50 flex items-center justify-center" onkeydown={onKeydown}>
        <!-- Backdrop -->
        <div
            class="absolute inset-0 bg-black/60 backdrop-blur-sm"
            data-overlay="backdrop"
            onclick={onBackdrop}
            transition:fade={{ duration: 150 }}
        />

        <!-- Modal -->
        <div
            role="dialog"
            aria-modal="true"
            class="relative w-[min(680px,95vw)] max-h-[85vh] overflow-hidden rounded-2xl border border-slate-700/70 bg-gradient-to-br from-slate-900 to-slate-800 shadow-2xl ring-1 ring-white/10"
            in:scale={{ start: 0.96, duration: 150 }}
        >
            <!-- Header -->
            <div class="px-6 py-4 border-b border-slate-700/60 bg-slate-900/60">
                <div class="flex items-center justify-between gap-4">
                    <div>
                        <h2 class="text-xl font-bold tracking-tight">
                            {steps.length > 0 ? (steps[currentStep]?.title || title) : title}
                        </h2>
                        <p class="text-xs text-slate-400">{currentStep + 1} / {totalSteps}</p>
                    </div>
                    <button
                        class="px-2 py-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-700/60"
                        aria-label="Skip tutorial"
                        onclick={skip}
                    >
                        Skip
                    </button>
                </div>
            </div>

            <!-- Body -->
            <div class="px-6 py-5 overflow-auto max-h-[58vh]">
                {#if steps.length > 0}
                    {#if steps[currentStep]?.content}
                        <div class="prose dark:prose-invert prose-p:leading-relaxed prose-li:leading-relaxed">
                            <p>{steps[currentStep].content}</p>
                        </div>
                    {:else}
                        <div class="prose dark:prose-invert">
                            <p>Follow the steps to continue.</p>
                        </div>
                    {/if}
                {:else}
                    <div class="prose dark:prose-invert lg:prose-lg">
                        {@render children?.()}
                    </div>
                {/if}
            </div>

            <!-- Footer -->
            <div class="px-6 py-4 border-t border-slate-700/60 bg-slate-900/60">
                <div class="flex items-center justify-between gap-4">
                    <div class="flex items-center gap-2">
                        <input id={`dontshow-${id}`} type="checkbox" class="rounded border-slate-600 bg-slate-800 text-emerald-500 focus:ring-emerald-500" bind:checked={dontShowAgain} />
                        <label for={`dontshow-${id}`} class="text-sm text-slate-300">Don't show again</label>
                    </div>
                    <div class="flex items-center gap-2">
                        <button
                            class="px-3 py-2 rounded-lg bg-slate-700/70 text-white text-sm font-medium hover:bg-slate-600 disabled:opacity-50"
                            onclick={prev}
                            disabled={currentStep === 0}
                        >
                            Back
                        </button>
                        <button
                            class="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold shadow hover:bg-emerald-500"
                            onclick={next}
                        >
                            {isLastStep ? 'Finish' : 'Next'}
                        </button>
                    </div>
                </div>

                {#if totalSteps > 1}
                    <div class="mt-3 flex items-center justify-center gap-2">
                        {#each Array(totalSteps) as _, i}
                            <span class={`h-2 w-2 rounded-full ${i === currentStep ? 'bg-emerald-400' : 'bg-slate-600'}`}></span>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>
    </div>
{/if}
