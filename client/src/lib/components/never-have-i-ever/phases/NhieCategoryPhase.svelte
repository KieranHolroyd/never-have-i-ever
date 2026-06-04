<script lang="ts">
	import { fly } from 'svelte/transition';
	import { quintOut } from 'svelte/easing';
	import type { Catagories } from '$lib/types';

	interface Props {
		visibleCatagories: [string, Catagories[string]][];
		selectedCategories: string[];
		visibleCategoryCount: number;
		selectedCategoryCount: number;
		catagoriesLoaded: boolean;
		onToggleCategory: (name: string) => void;
		onConfirm: () => void;
		onBackToLobby: () => void;
	}

	let {
		visibleCatagories,
		selectedCategories,
		visibleCategoryCount,
		selectedCategoryCount,
		catagoriesLoaded,
		onToggleCategory,
		onConfirm,
		onBackToLobby
	}: Props = $props();
</script>

<div class="mx-auto mt-4 w-full max-w-lg pb-24" data-testid="nhie-categories">
	<div class="mb-4 text-center sm:text-left">
		<p class="nhie-phase-label">Categories</p>
		<h2 class="text-2xl font-black text-white">Pick your decks</h2>
		<p class="mt-1 text-sm text-white/45">
			{selectedCategoryCount > 0
				? `${selectedCategoryCount} of ${visibleCategoryCount} selected`
				: 'Choose at least one to start'}
		</p>
	</div>

	<button
		type="button"
		class="mb-4 text-sm font-semibold text-white/40 hover:text-emerald-300"
		onclick={onBackToLobby}
	>
		← Back to lobby
	</button>

	{#if catagoriesLoaded}
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-2">
			{#each visibleCatagories as [catagory_name, catagory], index (catagory_name)}
				{@const isSelected = selectedCategories.includes(catagory_name)}
				<button
					type="button"
					data-testid="category-chip"
					class={`relative rounded-2xl border p-4 text-left transition-all ${isSelected
						? 'nhie-chip-selected'
						: 'nhie-chip-default'}`}
					in:fly={{
						y: 8,
						duration: 200,
						delay: Math.min(index * 15, 150),
						easing: quintOut
					}}
					onclick={() => onToggleCategory(catagory_name)}
				>
					<span class="block text-sm font-black capitalize text-white">{catagory_name}</span>
					<span class="mt-1 block text-xs text-white/40">
						{catagory.questions.length} questions
					</span>
					<div class="mt-2 flex flex-wrap gap-1">
						{#if catagory.flags.is_nsfw}
							<span
								class="rounded-full border border-red-400/20 bg-red-500/10 px-2 py-0.5 text-[10px] font-black uppercase text-red-200"
								>NSFW</span
							>
						{/if}
						{#if catagory.flags.is_hidden}
							<span
								class="rounded-full border border-white/10 px-2 py-0.5 text-[10px] font-black uppercase text-white/45"
								>Hidden</span
							>
						{/if}
					</div>
					{#if isSelected}
						<span
							class="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500 text-xs font-black text-zinc-950"
							>✓</span
						>
					{/if}
				</button>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-2">
			{#each Array.from({ length: 6 }) as _, index (index)}
				<div class="h-24 animate-pulse rounded-2xl border border-white/8 bg-zinc-900/50"></div>
			{/each}
		</div>
	{/if}

	<div
		class="fixed bottom-0 left-0 z-20 w-full border-t border-white/10 bg-zinc-950/95 px-3 py-3 backdrop-blur-md pb-[max(env(safe-area-inset-bottom),0.75rem)]"
	>
		<button
			type="button"
			class="w-full rounded-xl bg-emerald-500 py-3.5 text-base font-black text-zinc-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
			disabled={selectedCategoryCount === 0}
			onclick={onConfirm}
		>
			Start game ({selectedCategoryCount} {selectedCategoryCount === 1 ? 'category' : 'categories'})
		</button>
	</div>
</div>
