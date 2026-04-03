<script>
	const { status, apiStatus } = $props();

	let connected = 'Unknown';

	let iconOptions = {
		connected: '✅',
		disconnected: '❌',
		// connecting: '⏳',
		unknown: '❓',
	};
</script>

<div class="status-block">
	<ul>
		<li>Tailnet {iconOptions[status]}</li>
		<li>API {apiStatus === true ? '✅' : apiStatus === false ? '❌' : '❓'}</li>
	</ul>
</div>

<style>
	.status-block ul {
		list-style: none;
		padding: 0;
		text-align: right;
	}
</style>
