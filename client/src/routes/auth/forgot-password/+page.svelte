<script lang="ts">
	import { enhance } from '$app/forms';
	import type { ActionData } from './$types';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';

	let { form }: { form: ActionData } = $props();
</script>

<svelte:head>
	<title>Forgot password — games.kieran.dev</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
	<div class="w-full max-w-sm space-y-8">
		<div class="text-center">
			<h1 class="text-2xl font-bold">Forgot password?</h1>
			<p class="text-muted-foreground mt-2 text-sm">
				Enter your email and we'll send you a reset link.
			</p>
		</div>

		<Card>
			<CardContent class="pt-6">
				{#if form?.success}
					<div class="space-y-2 text-center">
						<p class="font-medium">Check your inbox!</p>
						<p class="text-muted-foreground text-sm">
							If an account exists for that email, we've sent a password reset link. It expires in 1
							hour.
						</p>
					</div>
				{:else}
					<form method="POST" use:enhance class="space-y-4">
						{#if form?.error}
							<p class="text-destructive text-sm">{form.error}</p>
						{/if}
						<div class="space-y-2">
							<Label for="email">Email</Label>
							<Input
								type="email"
								id="email"
								name="email"
								placeholder="you@example.com"
								autocomplete="email"
								required
							/>
						</div>
						<Button type="submit" variant="emerald" class="w-full">Send reset link</Button>
					</form>
				{/if}
			</CardContent>
		</Card>

		<p class="text-muted-foreground text-center text-sm">
			<Button href="/auth" variant="link" size="sm">Back to sign in</Button>
		</p>
	</div>
</div>
