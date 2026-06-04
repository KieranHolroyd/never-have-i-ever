<script lang="ts">
	import { Status } from '$lib/types';
	import SitePhaseStepper from '$lib/components/ui/SitePhaseStepper.svelte';
	import MdiShareOutline from '~icons/mdi/share-outline';
	import MdiDotsVertical from '~icons/mdi/dots-vertical';
	import MdiUndoVariant from '~icons/mdi/undo-variant';
	import MdiListBox from '~icons/mdi/list-box';

	export type NhieStep = 'lobby' | 'categories' | 'play' | 'results';

	interface Props {
		currentStep: NhieStep;
		connection?: Status;
		children?: import('svelte').Snippet;
		onShare?: () => void;
		showPlayMenu?: boolean;
		onReset?: () => void;
		onOpenCategories?: () => void;
		confirmResetVisible?: boolean;
	}

	let {
		currentStep,
		connection = Status.DISCONNECTED,
		children,
		onShare,
		showPlayMenu = false,
		onReset,
		onOpenCategories,
		confirmResetVisible = false
	}: Props = $props();

	let menuOpen = $state(false);

	const steps = [
		{ id: 'lobby', label: 'Lobby' },
		{ id: 'categories', label: 'Categories' },
		{ id: 'play', label: 'Play' },
		{ id: 'results', label: 'Results' }
	];

	function connectionDot() {
		if (connection === Status.CONNECTED) return 'bg-emerald-400';
		if (connection === Status.DISCONNECTED) return 'bg-rose-400';
		return 'bg-amber-400 animate-pulse';
	}
</script>

<div class="min-h-screen text-zinc-100">
	<header
		class="sticky top-14 z-20 border-b border-white/8 bg-zinc-950/95 backdrop-blur-md px-3 py-2 sm:px-4"
	>
		<div class="mx-auto flex max-w-2xl items-center justify-between gap-2">
			<SitePhaseStepper {steps} currentStep={currentStep} accent="emerald" />

			<div class="flex shrink-0 items-center gap-1">
				<span class={`h-2 w-2 rounded-full ${connectionDot()}`} title="Connection"></span>
				{#if onShare}
					<button
						type="button"
						class="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
						title="Share game"
						onclick={onShare}
					>
						<MdiShareOutline class="h-5 w-5" />
					</button>
				{/if}
				{#if showPlayMenu}
					<div class="relative">
						<button
							type="button"
							class="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
							title="More actions"
							aria-expanded={menuOpen}
							onclick={() => (menuOpen = !menuOpen)}
						>
							<MdiDotsVertical class="h-5 w-5" />
						</button>
						{#if menuOpen}
							<!-- svelte-ignore a11y_click_events_have_key_events -->
							<!-- svelte-ignore a11y_no_static_element_interactions -->
							<div class="fixed inset-0 z-30" onclick={() => (menuOpen = false)}></div>
							<div
								class="absolute right-0 top-full z-40 mt-1 min-w-[11rem] rounded-xl border border-white/10 bg-zinc-900 py-1 shadow-xl"
							>
								{#if onOpenCategories}
									<button
										type="button"
										class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-white/80 hover:bg-white/5"
										onclick={() => {
											menuOpen = false;
											onOpenCategories();
										}}
									>
										<MdiListBox class="h-4 w-4" />
										Change categories
									</button>
								{/if}
								{#if onReset}
									<button
										type="button"
										class="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-rose-300 hover:bg-white/5"
										onclick={() => {
											menuOpen = false;
											onReset();
										}}
									>
										<MdiUndoVariant class="h-4 w-4" />
										{confirmResetVisible ? 'Confirm reset' : 'Reset game'}
									</button>
								{/if}
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</div>
	</header>

	<main class="px-3 pb-[calc(env(safe-area-inset-bottom)+10rem)] sm:px-4">
		{@render children?.()}
	</main>
</div>
