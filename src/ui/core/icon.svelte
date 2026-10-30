<script lang="ts">
	import type { LucideIcon, LucideProps } from '@lucide/svelte';

	interface Props extends LucideProps {
		/** The glyph, imported per icon (`@lucide/svelte/icons/<name>`) so the
		 *  bundle carries only the icons in use and none load at runtime. */
		icon: LucideIcon;
	}

	// 1em unless sized: an unsized icon follows the text it sits in.
	let { icon: Glyph, size = '1em', ...rest }: Props = $props();
</script>

<Glyph {size} {...rest} />
