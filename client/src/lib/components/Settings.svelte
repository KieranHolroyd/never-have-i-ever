<script lang="ts">
	import clickOutside from '$lib/clickOutside';
	import MdiSettings from '~icons/mdi/settings';
	import MdiClose from '~icons/mdi/close';
	import MdiSave from '~icons/mdi/content-save';

	import { browser } from '$app/environment';
	import Notification from './Notification.svelte';
	import { settingsStore } from '$lib/settings';

	let show = false;

	let settings = settingsStore;
	let error: string | null = null;

	function save_settings() {
		try {
			if (browser) {
				localStorage.setItem('settings', JSON.stringify($settings));
			}
		} catch (e) {
			error = e as any;
		}
	}
</script>

<div use:clickOutside={() => (show = false)}>
	<div class="fixed z-20 top-16 left-2">
		<button
			class="relative rounded-full p-2 bg-slate-200/40 dark:bg-slate-500/40 backdrop-blur-sm border-2"
			on:click={() => (show = !show)}
		>
			{#if show}
				<MdiClose class="dark:text-white h-8 w-8" />
			{:else}
				<MdiSettings class="dark:text-white h-8 w-8" />
			{/if}
		</button>
	</div>

	<div
		class="{show
			? 'pointer-events-auto opacity-100'
			: 'pointer-events-none opacity-0 -translate-x-4'} duration-200 prose dark:prose-invert z-10 fixed top-0 left-0 py-2 pl-[4.5rem] pr-4 min-w-full md:min-w-[24rem] bg-slate-200/75 dark:bg-slate-800/75 backdrop-blur-sm border-2 rounded-lg"
	>
		<h1>Settings</h1>
		<label class="my-[2px]">
			<div
				class="bg-gray-300 dark:bg-slate-700 py-2 px-4 w-full text-left text-lg capitalize font-semibold hover:bg-gray-100 hover:dark:bg-gray-600 duration-75 my-2 rounded-md"
			>
				<input
					type="checkbox"
					class=""
					on:change={(e) => {
						$settings = { ...$settings, no_nsfw: e?.currentTarget?.checked };
					}}
					checked={$settings.no_nsfw ?? false}
				/>
				<span class="float-right"> No NSFW Questions </span>
			</div>
			<label class="my-[2px]">
				<div
					class="bg-gray-300 dark:bg-slate-700 py-2 px-4 w-full text-left text-lg capitalize font-semibold hover:bg-gray-100 hover:dark:bg-gray-600 duration-75 my-2 rounded-md"
				>
					<input
						type="checkbox"
						class=""
						on:change={(e) => {
							$settings = { ...$settings, no_tutorials: e?.currentTarget?.checked };
						}}
						checked={$settings.no_tutorials ?? false}
					/>
					<span class="float-right"> No Tutorials </span>
				</div>
			</label>
			<label class="my-[2px]">
				<div
					class="bg-gray-300 dark:bg-slate-700 py-2 px-4 w-full text-left text-lg capitalize font-semibold hover:bg-gray-100 hover:dark:bg-gray-600 duration-75 my-2 rounded-md"
				>
					<input
						type="checkbox"
						class=""
						on:change={(e) => {
							$settings = { ...$settings, show_hidden: e?.currentTarget?.checked };
						}}
						checked={$settings.show_hidden ?? false}
					/>
					<span class="float-right"> Show Hidden Questions </span>
				</div>
				<button
					class="transition bg-blue-500 text-white font-bold py-2 px-4 hover:bg-blue-400 w-full shadow hover:shadow-lg"
					on:click={save_settings}
				>
					<MdiSave class="inline-block" /> Save
				</button>
			</label>
		</label>
	</div>
</div>
<Notification
	show={error !== null}
	on:closeNotification={() => {
		error = null;
	}}
>
	{error ?? 'Unknown Error (See Javascript Console)'}
</Notification>
