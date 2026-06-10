<script lang="ts">
	import MdiCog from '~icons/mdi/cog';
	import SettingsPanel from '$lib/components/settings/SettingsPanel.svelte';
	import {
		Sheet,
		SheetContent,
		SheetDescription,
		SheetHeader,
		SheetTitle
	} from '$lib/components/ui/sheet';

	interface Props {
		show?: boolean;
		embedded?: boolean;
	}

	let { show = $bindable(false), embedded = false }: Props = $props();
</script>

<Sheet bind:open={show}>
	<SheetContent side="right" class="flex w-full flex-col gap-0 p-0 sm:max-w-md">
		<SheetHeader class="border-b bg-muted/20 px-5 py-5 text-left">
			<div class="flex items-center gap-3 pr-8">
				<span class="bg-primary/10 text-primary inline-flex size-10 shrink-0 items-center justify-center rounded-xl">
					<MdiCog class="size-5" />
				</span>
				<div class="min-w-0">
					<SheetTitle class="text-base">Settings</SheetTitle>
					<SheetDescription>Customize your experience</SheetDescription>
				</div>
			</div>
		</SheetHeader>

		<div class="flex-1 overflow-y-auto px-5 py-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
			<SettingsPanel />
		</div>
	</SheetContent>
</Sheet>
