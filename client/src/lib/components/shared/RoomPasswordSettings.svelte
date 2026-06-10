<script lang="ts">
	import { validateRoomPassword } from '$lib/validation';
	import MdiLockOutline from '~icons/mdi/lock-outline';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '$lib/components/ui/card';

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

<Card>
	<CardHeader class="flex-row items-start justify-between gap-4 space-y-0">
		<div>
			<CardTitle class="flex items-center gap-2 text-base">
				<MdiLockOutline class="size-4" />
				Room password
			</CardTitle>
			<CardDescription class="mt-1">
				{passwordProtected
					? 'This room is currently protected. New players need the password to join.'
					: 'Optional. Set a password before the game starts if you want a private room.'}
			</CardDescription>
		</div>
		<Badge variant={passwordProtected ? 'default' : 'secondary'}>
			{passwordProtected ? 'Protected' : 'Public'}
		</Badge>
	</CardHeader>
	<CardContent class="space-y-3">
		<div class="flex flex-col gap-3 sm:flex-row">
			<Input
				type="password"
				class="min-w-0 flex-1"
				placeholder={passwordProtected ? 'Enter a new password' : 'Set a password'}
				bind:value={password}
				onkeydown={(event) => {
					if (event.key === 'Enter') save();
				}}
			/>
			<Button type="button" variant="emerald" onclick={save} disabled={busy}>
				{passwordProtected ? 'Update password' : 'Set password'}
			</Button>
			{#if passwordProtected}
				<Button type="button" variant="outline" onclick={onClear} disabled={busy}>Remove</Button>
			{/if}
		</div>

		{#if localError || error}
			<p class="text-destructive text-sm">{localError ?? error}</p>
		{/if}
	</CardContent>
</Card>
