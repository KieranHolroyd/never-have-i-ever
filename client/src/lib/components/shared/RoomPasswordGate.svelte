<script lang="ts">
	import { validateRoomPassword } from '$lib/validation';
	import MdiArrowRight from '~icons/mdi/arrow-right';
	import MdiLockOutline from '~icons/mdi/lock-outline';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';

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
	<Card class="w-full border-emerald-500/30">
		<CardHeader class="text-center">
			<div class="bg-muted mx-auto inline-flex size-14 items-center justify-center rounded-2xl">
				<MdiLockOutline class="size-7" />
			</div>
			<CardTitle class="mt-4">{title}</CardTitle>
			<CardDescription>{description}</CardDescription>
		</CardHeader>
		<CardContent class="space-y-4">
			<div class="space-y-2">
				<Label for="room-password">Password</Label>
				<Input
					id="room-password"
					type="password"
					placeholder="Enter room password"
					bind:value={password}
					onkeydown={(event) => {
						if (event.key === 'Enter') submit();
					}}
				/>
			</div>

			{#if localError || error}
				<p class="text-destructive text-sm">{localError ?? error}</p>
			{/if}

			<Button type="button" variant="emerald" class="w-full" onclick={submit} disabled={busy}>
				{busy ? 'Joining…' : 'Join game'}
				<MdiArrowRight />
			</Button>
		</CardContent>
	</Card>
</div>
