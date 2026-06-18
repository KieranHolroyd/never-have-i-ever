<script lang="ts">
	import { settingsStore } from '$lib/settings';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
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

	let {
		id,
		title = '',
		steps = [],
		children,
		show = undefined,
		persistent = false
	}: Props = $props();

	let hidden = $state(false);
	let currentStep = $state(0);
	let dontShowAgain = $state(true);

	let shouldShow = $derived(
		show === true ||
			(show === undefined && !Tutorial.isSeen(id) && $settingsStore.no_tutorials !== true)
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
	<div
		class="fixed inset-0 z-50 flex items-end justify-center p-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] sm:items-center sm:p-4"
		onkeydown={onKeydown}
	>
		<!-- Backdrop -->
		<div
			class="absolute inset-0 bg-black/60 backdrop-blur-sm"
			data-overlay="backdrop"
			onclick={onBackdrop}
			transition:fade={{ duration: 150 }}
		></div>

		<!-- Modal -->
		<div
			role="dialog"
			aria-modal="true"
			class="relative flex max-h-[min(90dvh,calc(100dvh-env(safe-area-inset-top)-env(safe-area-inset-bottom)-1rem))] w-full max-w-[min(680px,100%)] flex-col overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl ring-1 ring-emerald-500/10"
			in:scale={{ start: 0.96, duration: 150 }}
		>
			<!-- Header -->
			<div class="border-b border-white/8 bg-zinc-900/80 px-4 py-3 sm:px-6 sm:py-4">
				<div class="flex items-start justify-between gap-3 sm:items-center sm:gap-4">
					<div class="min-w-0">
						<h2 class="text-lg font-bold tracking-tight sm:text-xl">
							{steps.length > 0 ? steps[currentStep]?.title || title : title}
						</h2>
						<p class="text-xs text-white/40">{currentStep + 1} / {totalSteps}</p>
					</div>
					<button
						class="touch-manipulation shrink-0 rounded-md px-2 py-1 text-sm text-white/50 hover:bg-white/5 hover:text-white"
						aria-label="Skip tutorial"
						onclick={skip}
					>
						Skip
					</button>
				</div>
			</div>

			<!-- Body -->
			<div class="flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-5">
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
			<div class="border-t px-4 py-3 sm:px-6 sm:py-4">
				<div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
					<div class="flex items-center gap-2">
						<Checkbox id={`dontshow-${id}`} bind:checked={dontShowAgain} />
						<Label for={`dontshow-${id}`} class="text-sm font-normal">Don't show again</Label>
					</div>
					<div class="flex items-center gap-2">
						<Button variant="secondary" size="sm" class="touch-manipulation flex-1 sm:flex-none" onclick={prev} disabled={currentStep === 0}>
							Back
						</Button>
						<Button variant="emerald" size="sm" class="touch-manipulation flex-1 sm:flex-none" onclick={next}>
							{isLastStep ? 'Finish' : 'Next'}
						</Button>
					</div>
				</div>

				{#if totalSteps > 1}
					<div class="mt-3 flex items-center justify-center gap-2">
						{#each Array(totalSteps) as _, i}
							<span
								class={`h-2 w-2 rounded-full ${i === currentStep ? 'bg-fuchsia-400' : 'bg-white/20'}`}
							></span>
						{/each}
					</div>
				{/if}
			</div>
		</div>
	</div>
{/if}
