<script lang="ts">
	import MdiCheck from '~icons/mdi/check';

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

	const tone = $derived(
		accent === 'violet'
			? {
					dot: 'bg-violet-500',
					text: 'text-violet-600 dark:text-violet-300',
					line: 'bg-violet-500/60'
				}
			: {
					dot: 'bg-emerald-500',
					text: 'text-emerald-600 dark:text-emerald-300',
					line: 'bg-emerald-500/60'
				}
	);
</script>

<nav class="flex min-w-0 flex-1 items-center" aria-label={ariaLabel}>
	{#each steps as step, i (step.id)}
		{@const isActive = step.id === currentStep}
		{@const isPast = i < activeIdx}
		<div class="flex min-w-0 items-center {i < steps.length - 1 ? 'flex-1' : ''}">
			<div
				class="flex min-w-0 items-center gap-1.5"
				aria-current={isActive ? 'step' : undefined}
				title={step.label}
			>
				{#if isPast}
					<span class="flex size-4 shrink-0 items-center justify-center rounded-full {tone.dot}">
						<MdiCheck class="size-2.5 text-white" />
					</span>
				{:else}
					<span
						class="size-2 shrink-0 rounded-full transition-colors duration-300 {isActive
							? tone.dot
							: 'bg-muted-foreground/25'}"
					></span>
				{/if}
				<span
					class="truncate text-[11px] font-medium transition-colors {isActive
						? tone.text
						: isPast
							? 'text-muted-foreground hidden md:block'
							: 'text-muted-foreground/50 hidden md:block'}"
				>
					{step.label}
				</span>
			</div>
			{#if i < steps.length - 1}
				<div class="mx-1.5 h-px min-w-2 flex-1 sm:mx-2 {isPast ? tone.line : 'bg-border'}"></div>
			{/if}
		</div>
	{/each}
</nav>
