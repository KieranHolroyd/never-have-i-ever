<script lang="ts">
	import clickOutside from '$lib/clickOutside';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';

	interface Props {
		show?: boolean;
		embedded?: boolean;
	}

	let { show = $bindable(false), embedded = false }: Props = $props();
</script>

{#if !embedded}
	<div class="fixed right-2 top-2 z-50">
		<button
			type="button"
			data-settings-toggle
			class="rounded-lg p-2 text-white/45 hover:bg-white/5 hover:text-white"
			onclick={(e) => {
				e.stopPropagation();
				show = !show;
			}}
			aria-label="Settings"
		>
			Settings
		</button>
	</div>
{/if}

<div
	use:clickOutside={{
		onClose: () => (show = false),
		isActive: () => show,
		exclude: '[data-settings-toggle]'
	}}
>
	<div
		class="{show
			? 'pointer-events-auto translate-x-0 opacity-100'
			: 'pointer-events-none translate-x-4 opacity-0'} fixed right-0 top-0 z-50 flex min-h-screen w-full flex-col border-l border-white/8 bg-zinc-950/98 shadow-2xl backdrop-blur-md transition duration-200 md:w-[22rem]"
	>
		<div class="flex items-center justify-between border-b border-white/8 px-5 py-4">
			<div>
				<p class="site-phase-label mb-0.5">Preferences</p>
				<h2 class="text-lg font-black text-white">Settings</h2>
			</div>
			<button
				type="button"
				data-settings-toggle
				class="rounded-lg p-2 text-white/45 hover:bg-white/5 hover:text-white"
				aria-label="Close settings"
				onclick={(e) => {
					e.stopPropagation();
					show = false;
				}}
			>
				<span class="sr-only">Close</span>
				<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
					<path
						d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"
					/>
				</svg>
			</button>
		</div>

		<div class="flex-1 overflow-y-auto px-5 py-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
			<SettingsPanel />
		</div>
	</div>
</div>
