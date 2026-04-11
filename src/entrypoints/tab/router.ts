import { createRouter } from 'sv-router';
import Devices from '../../lib/Devices.svelte';
import Device from '../../lib/Device.svelte';
import Services from '../../lib/Services.svelte';
import Layout from '../../lib/Layout.svelte';

export const { p, navigate, isActive, route } = createRouter({
	'/tab.html': Services,
	'/tab.html/devices': Devices,
	layout: Layout,
	'/tab.html/device/:name': Device,
});
