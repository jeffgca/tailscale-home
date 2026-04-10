type AppState = {
	state: {
		apiKey?: string;
		status?: string;
		apiStatus?: string;
		services?: any[];
		devices?: any[];
		[key: string]: any;
	};
};

export const appState = $state<AppState>({
	state: {},
});
