import { createContext } from 'svelte'
import type { ConnectivityCheckResult } from './api'

export interface TailnetContextState {
	apiConnected: boolean | null
	deviceInTailnet: boolean | null
	checking: boolean
	forceCheckingDevice: boolean
	lastCheckAt: string | null
	connectivity: ConnectivityCheckResult | null
	connectionRevision: number
}

export interface TailnetContextValue {
	state: TailnetContextState
	refreshStatus: () => Promise<void>
	forceCheckDeviceStatus: () => Promise<void>
}

export const [useTailnetContext, provideTailnetContext] =
	createContext<TailnetContextValue>()
