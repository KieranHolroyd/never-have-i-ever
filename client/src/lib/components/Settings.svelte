<script lang="ts">
	import clickOutside from '$lib/clickOutside';
	import MdiSettings from '~icons/mdi/settings';
	import MdiClose from '~icons/mdi/close';
	import MdiSave from '~icons/mdi/content-save';

	import { browser } from '$app/environment';
	import { toast } from '$lib/toast';
	import { settingsStore } from '$lib/settings';

	let show = $state(false);

	let settings = settingsStore;
	let error: string | null = $state(null);

	function save_settings() {
		try {
			if (browser) {
				localStorage.setItem('settings', JSON.stringify($settings));
                toast.success('Settings saved');
			}
		} catch (e) {
			error = String(e ?? 'Failed to save settings');
			toast.error(error);
		}
	}
</script>

<div use:clickOutside={() => (show = false)}>
	<div class="fixed z-20 top-16 left-2">
		<button
			class="relative rounded-full p-2 bg-slate-700/40 text-slate-100 backdrop-blur-sm border border-slate-500/50 shadow hover:bg-slate-600/50 transition {show
				? 'transform rotate-90'
				: 'transform'}"
			onclick={() => (show = !show)}
		>
			{#if show}
				<MdiClose class="h-7 w-7" />
			{:else}
				<MdiSettings class="h-7 w-7" />
			{/if}
		</button>
	</div>

	<div
		class="{show
			? 'pointer-events-auto opacity-100 translate-x-0'
			: 'pointer-events-none opacity-0 -translate-x-4'} transition duration-200 prose dark:prose-invert z-10 fixed top-0 left-0 py-3 pl-[4.5rem] pr-4 min-w-full md:min-w-[24rem] bg-slate-800/75 text-slate-100 backdrop-blur-md border border-slate-600/60 rounded-lg shadow-xl"
	>
		<h1 class="mb-2">Settings</h1>
		<label class="my-[2px] block">
			<div
				class="py-2 px-4 w-full text-left text-base capitalize font-semibold rounded-md border border-slate-600/50 bg-slate-700/40 hover:bg-slate-700/60 transition"
			>
				<input
					type="checkbox"
					class=""
					onchange={(e) => {
						$settings = { ...$settings, no_nsfw: e?.currentTarget?.checked };
					}}
					checked={$settings.no_nsfw ?? false}
				/>
				<span class="float-right"> No NSFW Questions </span>
			</div>
			<label class="my-[2px] block">
				<div
					class="py-2 px-4 w-full text-left text-base capitalize font-semibold rounded-md border border-slate-600/50 bg-slate-700/40 hover:bg-slate-700/60 transition"
				>
					<input
						type="checkbox"
						class=""
						onchange={(e) => {
							$settings = { ...$settings, no_tutorials: e?.currentTarget?.checked };
						}}
						checked={$settings.no_tutorials ?? false}
					/>
					<span class="float-right"> No Tutorials </span>
				</div>
			</label>
			<label class="my-[2px] block">
				<div
					class="py-2 px-4 w-full text-left text-base capitalize font-semibold rounded-md border border-slate-600/50 bg-slate-700/40 hover:bg-slate-700/60 transition"
				>
					<input
						type="checkbox"
						class=""
						onchange={(e) => {
							$settings = { ...$settings, show_hidden: e?.currentTarget?.checked };
						}}
						checked={$settings.show_hidden ?? false}
					/>
					<span class="float-right"> Show Hidden Questions </span>
				</div>
			</label>
			<label class="my-[2px] block">
				<div
					class="py-2 px-4 w-full text-left text-base capitalize font-semibold rounded-md border border-slate-600/50 bg-slate-700/40 hover:bg-slate-700/60 transition"
				>
					<input
						type="checkbox"
						class=""
						onchange={(e) => {
							$settings = { ...$settings, show_debug: e?.currentTarget?.checked };
						}}
						checked={$settings.show_debug ?? false}
					/>
					<span class="float-right"> Show Debug Info </span>
				</div>
			</label>
			<button
				class="mt-2 w-full inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-white font-semibold shadow hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
				onclick={save_settings}
			>
				<MdiSave class="inline-block mr-2" /> Save
			</button>
		</label>
	</div>
</div>

