<script lang="ts">
	import { fly, scale } from 'svelte/transition';
	import { quintOut, backOut } from 'svelte/easing';
	import type { Catagories } from '$lib/types';
	import NhieStickyActionBar from '../NhieStickyActionBar.svelte';
	import MdiArrowLeft from '~icons/mdi/arrow-left';
	import MdiCheck from '~icons/mdi/check';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Skeleton } from '$lib/components/ui/skeleton';

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

	const totalSelectedQuestions = $derived(
		visibleCatagories
			.filter(([name]) => selectedCategories.includes(name))
			.reduce((sum, [, cat]) => sum + cat.questions.length, 0)
	);
</script>

<div class="space-y-5 pb-32 pt-3" data-testid="nhie-categories">
	<div class="space-y-1">
		<div class="flex items-center justify-between gap-3">
			<p class="text-muted-foreground text-xs font-semibold tracking-widest uppercase">Step 2 of 3</p>
			<Button variant="ghost" size="sm" class="text-muted-foreground -mr-2 shrink-0" onclick={onBackToLobby}>
				<MdiArrowLeft class="size-4" />
				Back
			</Button>
		</div>
		<h2 class="text-3xl font-bold tracking-tight">Pick your decks</h2>
		<p class="text-muted-foreground text-sm leading-relaxed">
			Mix and match — questions are shuffled from every selected deck.
		</p>
	</div>

	{#if catagoriesLoaded}
		<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
			{#each visibleCatagories as [catagory_name, catagory], index (catagory_name)}
				{@const isSelected = selectedCategories.includes(catagory_name)}
				<div
					in:fly={{
						y: 10,
						duration: 250,
						delay: Math.min(index * 20, 200),
						easing: quintOut
					}}
				>
					<button
						type="button"
						aria-pressed={isSelected}
						data-state={isSelected ? 'on' : 'off'}
						class="group border-input hover:bg-muted hover:text-foreground aria-pressed:border-emerald-500 aria-pressed:bg-emerald-500/10 relative inline-flex h-auto min-h-[6rem] w-full flex-col items-start justify-start gap-0.5 rounded-xl border bg-transparent p-4 text-left text-sm font-medium transition-colors duration-150 hover:border-emerald-500/40 hover:bg-emerald-500/5"
						data-testid="category-chip"
						onclick={() => onToggleCategory(catagory_name)}
					>
						<span class="block pr-7 text-sm font-semibold capitalize leading-tight">
							{catagory_name}
						</span>
						<span class="text-muted-foreground block text-xs">
							{catagory.questions.length} questions
						</span>
						{#if catagory.flags.is_nsfw || catagory.flags.is_hidden}
							<div class="mt-1.5 flex flex-wrap gap-1">
								{#if catagory.flags.is_nsfw}
									<Badge variant="destructive" class="h-4 px-1.5 text-[10px]">NSFW</Badge>
								{/if}
								{#if catagory.flags.is_hidden}
									<Badge variant="outline" class="h-4 px-1.5 text-[10px]">Hidden</Badge>
								{/if}
							</div>
						{/if}
						{#if isSelected}
							<span
								class="absolute top-2.5 right-2.5 flex size-5 items-center justify-center rounded-full bg-emerald-500 text-white shadow-sm"
								in:scale={{ duration: 200, start: 0.5, easing: backOut }}
							>
								<MdiCheck class="size-3.5" />
							</span>
						{/if}
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
			{#each Array.from({ length: 8 }) as _, index (index)}
				<Skeleton class="h-[5.75rem] rounded-xl" />
			{/each}
		</div>
	{/if}
</div>

<NhieStickyActionBar>
	<div class="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
		<span class="text-muted-foreground text-xs">
			{#if selectedCategoryCount === 0}
				Select at least one deck to start
			{:else}
				{selectedCategoryCount} of {visibleCategoryCount} decks · {totalSelectedQuestions} questions
			{/if}
		</span>
		<Button
			variant="emerald"
			size="lg"
			class="h-12 w-full text-base font-semibold sm:w-auto sm:px-8"
			disabled={selectedCategoryCount === 0}
			onclick={onConfirm}
		>
			Start game
		</Button>
	</div>
</NhieStickyActionBar>
