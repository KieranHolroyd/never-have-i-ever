<script lang="ts">
	import { validateRoomPassword } from '$lib/validation';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiLockOutline from '~icons/mdi/lock-outline';

	interface Props {
		title?: string;
		description?: string;
		error?: string | null;
		initialValue?: string;
		busy?: boolean;
		onSubmit: (password: string) => void;
	}

	let {
		title = 'Enter room password',
		description = 'This game is protected. Enter the password to join.',
		error = null,
		initialValue = '',
		busy = false,
		onSubmit
	}: Props = $props();

	let password = $state('');
	let localError = $state<string | null>(null);

	$effect(() => {
		password = initialValue;
	});

	function submit() {
		const result = validateRoomPassword(password);
		if (!result.isValid) {
			localError = result.errors[0];
			return;
		}

		localError = null;
		onSubmit(password.trim());
	}
</script>

<div class="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4 py-10">
	<div class="site-surface site-accent-nhie w-full p-6 shadow-2xl sm:p-8">
		<div class="text-center">
			<div class="mx-auto inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-800 text-zinc-200">
				<MdiLockOutline class="h-7 w-7" />
			</div>
			<h1 class="mt-4 text-2xl font-black tracking-tight text-white">{title}</h1>
			<p class="mt-2 text-sm leading-6 text-zinc-400">{description}</p>
		</div>

		<div class="mt-6 space-y-4">
			<div>
				<label class="site-phase-label mb-2 block" for="room-password">
					Password
				</label>
				<input
					id="room-password"
					type="password"
					class="w-full rounded-2xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
					placeholder="Enter room password"
					bind:value={password}
					onkeydown={(event) => {
						if (event.key === 'Enter') {
							submit();
						}
					}}
				/>
			</div>

			{#if localError || error}
				<p class="text-sm text-red-400">{localError ?? error}</p>
			{/if}

			<button type="button" class="site-btn-primary w-full gap-2" onclick={submit} disabled={busy}>
				<span>{busy ? 'Joining…' : 'Join game'}</span>
				<MdiArrowRight class="h-4 w-4" />
			</button>
		</div>
	</div>
</div>