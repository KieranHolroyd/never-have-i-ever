<script lang="ts">
	import IcRoundAccountCircle from '~icons/ic/round-account-circle';
	import LogosGoogle from '~icons/logos/google-icon';
	import { LogIn, UserPlus } from 'lucide-svelte';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Card, CardContent } from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';
	import { ToggleGroup, ToggleGroupItem } from '$lib/components/ui/toggle-group';

	type ActionData = { action?: 'register' | 'login'; error?: string } | null;
	type AuthMode = 'login' | 'register';

	let { form }: { form: ActionData } = $props();

	let mode = $state<AuthMode>('login');

	const redirect = $derived(page.url.searchParams.get('redirect') ?? '');

	$effect(() => {
		if (form?.action === 'register' || form?.action === 'login') {
			mode = form.action;
		}
	});
</script>

<div class="flex min-h-[60vh] items-center justify-center px-4 py-12">
	<div class="w-full max-w-sm space-y-8">
		<div class="text-center">
			<div class="bg-muted mb-4 inline-flex size-14 items-center justify-center rounded-2xl">
				<IcRoundAccountCircle class="size-8" />
			</div>
			<h1 class="text-2xl font-bold">
				{mode === 'login' ? 'Welcome back' : 'Join the party'}
			</h1>
			<p class="text-muted-foreground mt-2 text-sm">
				{mode === 'login'
					? 'Sign in to keep your nickname across devices.'
					: 'Pick a nickname that follows you everywhere.'}
			</p>
		</div>

		<Card class="overflow-hidden pt-0">
			<div class="bg-muted/60 border-b p-1.5">
				<ToggleGroup
					type="single"
					value={mode}
					onValueChange={(value) => {
						if (value === 'login' || value === 'register') mode = value;
					}}
					variant="outline"
					spacing={0}
					class="grid w-full grid-cols-2 bg-transparent"
				>
					<ToggleGroupItem
						value="login"
						aria-label="Sign in"
						class="h-10 gap-2 rounded-md border-transparent data-[state=on]:border-border data-[state=on]:bg-background data-[state=on]:shadow-sm"
					>
						<LogIn class="size-4" />
						Sign in
					</ToggleGroupItem>
					<ToggleGroupItem
						value="register"
						aria-label="Sign up"
						class="h-10 gap-2 rounded-md border-transparent data-[state=on]:border-border data-[state=on]:bg-background data-[state=on]:shadow-sm"
					>
						<UserPlus class="size-4" />
						Sign up
					</ToggleGroupItem>
				</ToggleGroup>
			</div>

			<CardContent class="space-y-5 pt-6">
				<Button
					href="/auth/google{redirect ? `?redirect=${encodeURIComponent(redirect)}` : ''}"
					variant="outline"
					class="w-full"
				>
					<LogosGoogle />
					{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}
				</Button>

				<div class="flex items-center gap-3">
					<Separator class="flex-1" />
					<span class="text-muted-foreground text-xs">or</span>
					<Separator class="flex-1" />
				</div>

				{#if mode === 'login'}
					<form method="POST" action="?/login" use:enhance class="space-y-4">
						{#if redirect}
							<input type="hidden" name="redirect" value={redirect} />
						{/if}
						<div class="space-y-2">
							<Label for="login-email">Email</Label>
							<Input
								type="email"
								id="login-email"
								name="email"
								placeholder="you@example.com"
								autocomplete="email"
								required
							/>
						</div>
						<div class="space-y-2">
							<Label for="login-password">Password</Label>
							<Input
								type="password"
								id="login-password"
								name="password"
								placeholder="••••••••"
								autocomplete="current-password"
								required
							/>
						</div>
						{#if form?.action === 'login' && form.error}
							<p class="text-destructive text-xs">{form.error}</p>
						{/if}
						<Button type="submit" variant="emerald" class="w-full">Sign in</Button>
						<p class="text-center text-xs">
							<Button href="/auth/forgot-password" variant="link" size="sm" class="h-auto p-0">
								Forgot your password?
							</Button>
						</p>
					</form>
				{:else}
					<form method="POST" action="?/register" use:enhance class="space-y-4">
						{#if redirect}
							<input type="hidden" name="redirect" value={redirect} />
						{/if}
						<div class="space-y-2">
							<Label for="reg-nickname">Nickname</Label>
							<Input
								type="text"
								id="reg-nickname"
								name="nickname"
								placeholder="e.g. P. Flynn"
								autocomplete="nickname"
								maxlength={30}
								required
							/>
						</div>
						<div class="space-y-2">
							<Label for="reg-email">Email</Label>
							<Input
								type="email"
								id="reg-email"
								name="email"
								placeholder="you@example.com"
								autocomplete="email"
								required
							/>
						</div>
						<div class="space-y-2">
							<Label for="reg-password">Password</Label>
							<Input
								type="password"
								id="reg-password"
								name="password"
								placeholder="Min. 8 characters"
								autocomplete="new-password"
								minlength={8}
								required
							/>
						</div>
						{#if form?.action === 'register' && form.error}
							<p class="text-destructive text-xs">{form.error}</p>
						{/if}
						<Button type="submit" variant="emerald" class="w-full">Create account</Button>
					</form>
				{/if}
			</CardContent>
		</Card>

		<p class="text-muted-foreground text-center text-sm">
			{#if mode === 'login'}
				Don't have an account?
				<Button
					variant="link"
					size="sm"
					class="h-auto p-0"
					onclick={() => (mode = 'register')}
				>
					Sign up
				</Button>
			{:else}
				Already have an account?
				<Button variant="link" size="sm" class="h-auto p-0" onclick={() => (mode = 'login')}>
					Sign in
				</Button>
			{/if}
			<span class="mx-1">·</span>
			<Button href="/play/name" variant="link" size="sm" class="h-auto p-0">
				Continue as guest
			</Button>
		</p>
	</div>
</div>
