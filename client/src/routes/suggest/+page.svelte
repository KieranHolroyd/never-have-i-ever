<script lang="ts">
	import MdiEmailMultiple from '~icons/mdi/email';
	import MdiKeyboardBackspace from '~icons/mdi/keyboard-backspace';
</script>

<div class="p-2 prose prose-invert lg:prose-lg xl:prose-xl">
	<h1>Contact us</h1>
	<p>
		We are always looking for ways to improve our service. If you have any suggestions, bug reports,
		or general questions, please reach out to us.
	</p>
	<p>
		You can also reach us at <a href="mailto:games@kieran.dev">
			<MdiEmailMultiple class="inline ml-2 mr-1" />games@kieran.dev
		</a>
	</p>
	<!-- <form method="POST" action="?/suggest">
		<div class="grid grid-cols-1 gap-6">
			<label class="block">
				<span class="dark:text-gray-200 text-gray-700">Full name</span>
				<input
					type="text"
					class="mt-1 block w-full rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-500 border-gray-300 shadow-sm dark:focus:border-indigo-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
					placeholder="Peter B. Parker"
					required
				/>
			</label>
			<label class="block">
				<span class="dark:text-gray-200 text-gray-700">Email Address</span>
				<input
					type="text"
					class="mt-1 block w-full rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-500 border-gray-300 shadow-sm dark:focus:border-indigo-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
					placeholder="games@kieran.dev, myemail@gmail.com"
					required
				/>
			</label>
			<label class="block">
				<span class="dark:text-gray-200 text-gray-700">Message</span>
				<textarea
					rows="4"
					class="mt-1 block w-full rounded-md dark:bg-gray-800 dark:text-white dark:border-gray-500 border-gray-300 shadow-sm dark:focus:border-indigo-600 focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
					placeholder="Is this thing on?"
					required
				/>
			</label>
		</div> -->
	<a href="/">
		<button
			class="relative pl-10 dark:text-white bg-gray-400 dark:bg-gray-600 hover:bg-gray-200 hover:dark:bg-gray-900 mt-2 px-4"
		>
			<MdiKeyboardBackspace class="absolute top-2.5 lg:top-3 xl:top-3.5 left-2 h-6 w-6" />Back
		</button>
	</a>
	<!-- <button
			type="submit"
			class="dark:text-white bg-gray-400 dark:bg-gray-800 hover:bg-gray-200 hover:dark:bg-gray-900 mt-2 px-4"
		>
			Send
		</button> -->
	<!-- </form> -->
</div>
