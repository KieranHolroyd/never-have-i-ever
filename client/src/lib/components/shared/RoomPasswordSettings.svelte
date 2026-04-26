<script lang="ts">
	import { validateRoomPassword } from '$lib/validation';
	import MdiLockOutline from '~icons/mdi/lock-outline';

	interface Props {
		passwordProtected: boolean;
		error?: string | null;
		busy?: boolean;
		onSave: (password: string) => void;
		onClear: () => void;
	}

	let { passwordProtected, error = null, busy = false, onSave, onClear }: Props = $props();

	let password = $state('');
	let localError = $state<string | null>(null);

	function save() {
		const result = validateRoomPassword(password);
		if (!result.isValid) {
			localError = result.errors[0];
			return;
		}

		localError = null;
		onSave(password.trim());
		password = '';
	}
</script>

<div class="rounded-2xl border border-zinc-800 bg-zinc-900 p-5">
	<div class="flex items-start justify-between gap-4">
		<div>
			<div class="flex items-center gap-2 text-sm font-bold text-zinc-200">
				<MdiLockOutline class="h-4 w-4" />
				<span>Room password</span>
			</div>
			<p class="mt-1 text-sm text-zinc-400">
				{passwordProtected
					? 'This room is currently protected. New players need the password to join.'
					: 'Optional. Set a password before the game starts if you want a private room.'}
			</p>
		</div>
		<div class="shrink-0 rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-[0.18em]
			{passwordProtected
				? 'border-emerald-400/20 bg-emerald-500/10 text-emerald-300'
				: 'border-zinc-700 bg-zinc-800 text-zinc-500'}">
			{passwordProtected ? 'Protected' : 'Public'}
		</div>
	</div>

	<div class="mt-4 flex flex-col gap-3 sm:flex-row">
		<input
			type="password"
			class="min-w-0 flex-1 rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
			placeholder={passwordProtected ? 'Enter a new password' : 'Set a password'}
			bind:value={password}
			onkeydown={(event) => {
				if (event.key === 'Enter') {
					save();
				}
			}}
		/>
		<button
			type="button"
			class="rounded-xl bg-emerald-500 px-4 py-3 text-sm font-bold text-zinc-950 transition-colors hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-zinc-700 disabled:text-zinc-400"
			onclick={save}
			disabled={busy}
		>
			{passwordProtected ? 'Update password' : 'Set password'}
		</button>
		{#if passwordProtected}
			<button
				type="button"
				class="rounded-xl border border-zinc-700 bg-zinc-800 px-4 py-3 text-sm font-bold text-zinc-400 transition-colors hover:border-zinc-600 hover:text-zinc-200"
				onclick={onClear}
				disabled={busy}
			>
				Remove
			</button>
		{/if}
	</div>

	{#if localError || error}
		<p class="mt-3 text-sm text-red-400">{localError ?? error}</p>
	{/if}
</div>