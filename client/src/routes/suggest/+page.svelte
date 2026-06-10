<script lang="ts">
	import MdiEmailOutline from '~icons/mdi/email-outline';
	import MdiArrowLeft from '~icons/mdi/arrow-left';
	import { Button } from '$lib/components/ui/button';
	import {
		Card,
		CardContent,
		CardDescription,
		CardFooter,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
</script>

<div class="flex min-h-[60vh] items-start justify-center px-4 py-12">
	<div class="w-full max-w-lg">
		<Button href="/" variant="ghost" size="sm" class="mb-8">
			<MdiArrowLeft />
			Back to games
		</Button>

		<p class="text-muted-foreground mb-2 text-xs font-medium uppercase tracking-widest">Contact</p>
		<h1 class="mb-2 text-3xl font-bold">Get in touch</h1>
		<p class="text-muted-foreground mb-8">
			Questions, bug reports, or game suggestions — we want to hear them.
		</p>

		<Card>
			<CardHeader>
				<div class="flex items-center gap-4">
					<span class="bg-primary/10 text-primary inline-flex size-10 items-center justify-center rounded-xl">
						<MdiEmailOutline class="size-5" />
					</span>
					<div>
						<CardDescription>Email us directly</CardDescription>
						<CardTitle>
							<a href="mailto:games@kieran.dev" class="hover:underline">games@kieran.dev</a>
						</CardTitle>
					</div>
				</div>
			</CardHeader>
			<CardFooter>
				<Button type="button" variant="emerald" class="open-feedback w-full">Send feedback</Button>
			</CardFooter>
		</Card>
	</div>
</div>
