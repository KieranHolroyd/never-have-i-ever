<script lang="ts">
	import MdiEmailMultiple from '~icons/mdi/email';
	import MdiKeyboardBackspace from '~icons/mdi/keyboard-backspace';
</script>

<div class="max-w-2xl mx-auto mt-10">
	<div
		class="rounded-2xl border border-slate-700/70 bg-slate-800/50 backdrop-blur-sm shadow-xl ring-1 ring-white/5 p-6 prose prose-invert"
	>
		<h1>Contact us</h1>
		<p>
			We are always looking for ways to improve our service. If you have any suggestions, bug
			reports, or general questions, please reach out to us.
		</p>
		<p>
			You can also reach us at <a href="mailto:games@kieran.dev">
				<MdiEmailMultiple class="inline ml-2 mr-1" />games@kieran.dev
			</a>
		</p>
		<div class="mt-6 flex gap-3">
			<a href="/">
				<button
					class="inline-flex items-center gap-2 rounded-lg bg-slate-600 px-4 py-2 text-white font-semibold shadow hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
				>
					<MdiKeyboardBackspace class="h-5 w-5" />
					Back
				</button>
			</a>
			<button
				class="open-feedback inline-flex items-center gap-2 rounded-lg bg-emerald-500 px-4 py-2 text-white font-semibold shadow hover:bg-emerald-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300"
			>
				Open Feedback Box
			</button>
		</div>
	</div>
</div>
