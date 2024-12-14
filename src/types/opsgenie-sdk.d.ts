declare module 'opsgenie-sdk' {
	interface OpsGenieClient {
	  configure(config: { api_key: string }): void;
	  alertV2: {
		create(
		  data: any,
		  callback: (error: Error | null, result: any) => void
		): void;
		get(
		  params: { identifier: string; identifierType: string },
		  callback: (error: Error | null, result: any) => void
		): void;
		close(
		  params: { identifier: string; identifierType: string },
		  callback: (error: Error | null) => void
		): void;
	  };
	}

	const client: OpsGenieClient;
	export = client;
  }
