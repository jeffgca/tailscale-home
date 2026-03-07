<script lang="ts">
    import type { Device } from '../lib/api'

    interface Props {
        device: Device
        current: boolean
    }

    let { device, current }: Props = $props()

    function getStatusColor(connected: boolean, authorized: boolean): string {
        if (!authorized) return 'var(--status-pending)'
        return connected ? 'var(--status-connected)' : 'var(--status-disconnected)'
    }

    function getStatusLabel(connected: boolean, authorized: boolean): string {
        if (!authorized) return 'Pending'
        return connected ? 'Connected' : 'Disconnected'
    }

    function getOS(d: Device): string {
        if (d.distro?.name) {
            return d.distro.name.charAt(0).toUpperCase() + d.distro.name.slice(1)
        }
        return d.os?.toUpperCase() || 'Unknown'
    }

    function formatDate(dateString: string): string {
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }
</script>

<div class="device-card" class:current-device={current}>
    {#if current}
        <span class="current-device-badge">This Device</span>
    {/if}

    <div class="device-header">
        <div class="device-name-section">
            <h3 class="device-name">{device.name}</h3>
            {#if device.fqdn}
                <p class="device-fqdn">{device.fqdn}</p>
            {/if}
        </div>
        <div
            class="device-status"
            style:--status-color={getStatusColor(device.connected, device.authorized)}
        >
            <span class="status-dot"></span>
            {getStatusLabel(device.connected, device.authorized)}
        </div>
    </div>

    <div class="device-details">
        {#if device.addresses?.length}
            <div class="detail-row">
                <span class="detail-label">IP Address</span>
                <span class="detail-value">{device.addresses[0]}</span>
            </div>
        {/if}

        <div class="detail-row">
            <span class="detail-label">OS</span>
            <span class="detail-value">{getOS(device)}</span>
        </div>

        {#if device.lastSeen}
            <div class="detail-row">
                <span class="detail-label">Last Seen</span>
                <span class="detail-value">{formatDate(device.lastSeen)}</span>
            </div>
        {/if}

        {#if device.tags?.length}
            <div class="detail-row">
                <span class="detail-label">Tags</span>
                <div class="tags">
                    {#each device.tags as tag}
                        <span class="tag">{tag}</span>
                    {/each}
                </div>
            </div>
        {/if}
    </div>
</div>

<style>
    .device-card {
        background: var(--bg-secondary);
        border: 1px solid var(--border-color);
        border-radius: 4px;
        padding: 1rem;
        transition: all 0.2s;
    }

    .device-card:hover {
        border-color: var(--text-secondary);
    }

    .device-card.current-device {
        border: 2px solid var(--status-connected);
        background: var(--bg-primary);
        box-shadow: inset 0 0 8px rgba(0, 128, 0, 0.08);
    }

    .current-device-badge {
        display: inline-block;
        background: var(--status-connected);
        color: white;
        padding: 0.25rem 0.6rem;
        border-radius: 3px;
        font-size: 0.7rem;
        font-weight: 700;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        margin-bottom: 0.5rem;
        margin-right: 0.5rem;
    }

    .device-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 0.75rem;
        padding-bottom: 0.75rem;
        border-bottom: 1px solid var(--border-color);
        gap: 1rem;
    }

    .device-name-section {
        flex: 1;
        min-width: 0;
        display: flex;
        flex-direction: column;
        gap: 0.3rem;
    }

    .device-name {
        margin: 0;
        font-size: 1.1rem;
        color: var(--text-primary);
        word-break: break-word;
    }

    .device-fqdn {
        margin: 0.15rem 0 0 0;
        font-size: 0.8rem;
        color: var(--text-secondary);
        font-family: 'Courier New', monospace;
        word-break: break-all;
    }

    .device-status {
        display: flex;
        align-items: center;
        gap: 0.4rem;
        padding: 0.3rem 0.6rem;
        background: var(--bg-primary);
        border: 1px solid var(--border-color);
        border-radius: 3px;
        color: var(--status-color);
        font-weight: 600;
        font-size: 0.8rem;
        white-space: nowrap;
    }

    .status-dot {
        display: inline-block;
        width: 6px;
        height: 6px;
        border-radius: 50%;
        background: var(--status-color);
    }

    .device-details {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 0.75rem;
        font-size: 0.9rem;
    }

    .detail-row {
        display: flex;
        flex-direction: column;
        gap: 0.2rem;
    }

    .detail-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
        font-weight: 600;
        text-transform: uppercase;
        letter-spacing: 0.5px;
    }

    .detail-value {
        font-size: 0.85rem;
        color: var(--text-primary);
        font-family: 'Courier New', monospace;
        word-break: break-all;
    }

    .tags {
        display: flex;
        gap: 0.4rem;
        flex-wrap: wrap;
    }

    .tag {
        display: inline-block;
        padding: 0.2rem 0.5rem;
        background: var(--text-primary);
        color: var(--bg-primary);
        border-radius: 3px;
        font-size: 0.75rem;
        font-weight: 600;
    }
</style>
