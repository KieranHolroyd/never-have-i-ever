<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData, PageData } from './$types';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';

	let { data, form }: { data: PageData; form: ActionData } = $props();
</script>

<svelte:head>
	<title>Reset password — games.kieran.dev</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
	<div class="w-full max-w-sm space-y-8">
		<div class="text-center">
			<h1 class="text-2xl font-bold">Choose a new password</h1>
			<p class="text-muted-foreground mt-2 text-sm">Must be at least 8 characters.</p>
		</div>

		<Card>
			<CardContent class="pt-6">
				{#if data.invalid}
					<p class="text-destructive text-sm">This reset link is invalid or has expired.</p>
				{:else}
					<form method="POST" use:enhance class="space-y-4">
						<input type="hidden" name="token" value={data.token ?? ''} />
						{#if form?.error}
							<p class="text-destructive text-sm">{form.error}</p>
						{/if}
						<div class="space-y-2">
							<Label for="password">New password</Label>
							<Input
								type="password"
								id="password"
								name="password"
								minlength={8}
								autocomplete="new-password"
								required
							/>
						</div>
						<div class="space-y-2">
							<Label for="confirm">Confirm password</Label>
							<Input
								type="password"
								id="confirm"
								name="confirm"
								minlength={8}
								autocomplete="new-password"
								required
							/>
						</div>
						<Button type="submit" variant="emerald" class="w-full">Set new password</Button>
					</form>
				{/if}
			</CardContent>
		</Card>

		<p class="text-muted-foreground text-center text-sm">
			Link expired?
			<Button href="/auth/forgot-password" variant="link" size="sm" class="h-auto p-0">
				Request a new one
			</Button>
		</p>
	</div>
</div>
