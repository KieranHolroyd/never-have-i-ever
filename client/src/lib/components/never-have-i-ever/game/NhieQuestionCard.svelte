<script lang="ts">
	import { fade, fly } from 'svelte/transition';
	import { backOut, quintOut } from 'svelte/easing';

	interface Props {
		category: string;
		content: string;
	}

	let { category, content }: Props = $props();
</script>

{#key content}
	<div class="nhie-hero-card" in:fade={{ duration: 200, easing: quintOut }}>
		<div in:fly={{ y: 12, duration: 280, easing: backOut }}>
			<p
				class="nhie-phase-label mb-3 inline-block rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-300/90"
				data-testid="question-category"
			>
				{category}
			</p>
			<p class="nhie-hero-question" data-testid="question-content">
				{content}
			</p>
		</div>
	</div>
{/key}
