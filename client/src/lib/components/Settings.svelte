<script lang="ts">
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
	<SheetContent side="right" class="flex w-full flex-col gap-0 p-0 sm:max-w-sm">
		<SheetHeader class="border-b px-5 py-4 text-left">
			<SheetDescription>Preferences</SheetDescription>
			<SheetTitle>Settings</SheetTitle>
		</SheetHeader>

		<div class="flex-1 overflow-y-auto px-5 py-5 pb-[max(env(safe-area-inset-bottom),1.25rem)]">
			<SettingsPanel />
		</div>
	</SheetContent>
</Sheet>
