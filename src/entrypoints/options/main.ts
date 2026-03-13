import { mount } from 'svelte'
import './app.css'
import App from './Options.svelte'
import { discoverAndStoreLocalIPs } from '../../lib/localIp'

const app = mount(App, {
	target: document.getElementById('app')!,
})

export default app
