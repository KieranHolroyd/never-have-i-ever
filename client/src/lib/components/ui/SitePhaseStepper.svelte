<script lang="ts">
	export type StepperAccent = 'emerald' | 'violet';

	interface Step {
		id: string;
		label: string;
	}

	interface Props {
		steps: Step[];
		currentStep: string;
		accent?: StepperAccent;
		ariaLabel?: string;
	}

	let { steps, currentStep, accent = 'emerald', ariaLabel = 'Game progress' }: Props = $props();

	function stepIndex(stepId: string) {
		return steps.findIndex((s) => s.id === stepId);
	}

	const activeIdx = $derived(stepIndex(currentStep));

	const activeDot =
		accent === 'violet'
			? 'bg-violet-400 shadow-[0_0_8px_rgba(167,139,250,0.6)]'
			: 'bg-fuchsia-400 shadow-[0_0_8px_rgba(232,121,249,0.6)]';
	const activeLabel = accent === 'violet' ? 'text-violet-300' : 'text-fuchsia-300';
	const pastDot = accent === 'violet' ? 'bg-violet-500' : 'bg-emerald-500';
	const pastLine = accent === 'violet' ? 'bg-violet-500/50' : 'bg-emerald-500/50';
</script>

<nav class="flex flex-1 items-center gap-1 sm:gap-2" aria-label={ariaLabel}>
	{#each steps as step, i (step.id)}
		{@const isActive = step.id === currentStep}
		{@const isPast = i < activeIdx}
		<div class="flex min-w-0 flex-1 items-center gap-1">
			<div
				class="flex min-w-0 flex-1 flex-col items-center gap-0.5"
				aria-current={isActive ? 'step' : undefined}
			>
				<span
					class={`h-2 w-2 shrink-0 rounded-full transition-colors ${isActive
						? activeDot
						: isPast
							? pastDot
							: 'bg-white/15'}`}
				></span>
				<span
					class={`hidden truncate text-[9px] font-black uppercase tracking-wider sm:block ${isActive
						? activeLabel
						: isPast
							? accent === 'violet'
								? 'text-violet-400/80'
								: 'text-emerald-400/80'
							: 'text-white/25'}`}
				>
					{step.label}
				</span>
			</div>
			{#if i < steps.length - 1}
				<div class={`h-px max-w-6 flex-1 ${i < activeIdx ? pastLine : 'bg-white/10'}`}></div>
			{/if}
		</div>
	{/each}
</nav>
