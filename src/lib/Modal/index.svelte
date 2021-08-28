<script lang="ts">
	export let show: boolean;
	export let title: string;
	export let question: string;
	export let onYes: () => void;
	export let onNo: () => void;

	function handleNo() {
		if (onNo) onNo();
		document.body.style.overflow = 'auto';
	}

	function handleYes() {
		if (onYes) onYes();
		document.body.style.overflow = 'hidden';
	}
</script>

<div class="overlay" class:show class:hide={!show} />
<div class="container" class:show class:hide={!show}>
	<div class="wrapper">
		<div class="header">
			<div class="repoName">{title}</div>
			<button
				on:click={() => {
					if (onNo) onNo();
					document.body.style.overflow = 'auto';
				}}
				class="close">X</button
			>
		</div>
		<div class="question">
			<p><strong>{question}</strong></p>
			<div>
				<button class="yes" on:click={handleYes}>Yes</button>
				<button class="no" on:click={handleNo}>No</button>
			</div>
		</div>
	</div>
</div>

<style src="./styles.scss" lang="scss"></style>
