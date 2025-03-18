import streamDeck from "@elgato/streamdeck";
import { Tado, Token } from "node-tado-client";

import { TadoSettings } from "./types";

class TadoSingleton {
	private static instance: TadoSingleton;
	public tado!: Tado;

	private constructor() {
		this.initialize();
	}

	private async initialize() {
		const settings: TadoSettings = await streamDeck.settings.getGlobalSettings();

		streamDeck.logger.info(`settings: ${JSON.stringify(settings)}`);

		this.tado = new Tado();
		// Register a callback function for token changes
		this.tado.setTokenCallback(this.onTokenCallback);
		// Authenticate with the Tado Web API
		// The refreshToken is optional, if you have a previous session still active
		const [verify, futureToken] = await this.tado.authenticate(settings?.refresh_token || "refreshToken");

		if (verify) {
			streamDeck.logger.info("------------------------------------------------");
			streamDeck.logger.info("Device authentication required.");
			streamDeck.logger.info("Please visit the following website in a browser.");
			streamDeck.logger.info("");
			streamDeck.logger.info(`  ${verify.verification_uri_complete}`);
			streamDeck.system.openUrl(verify.verification_uri_complete);
			streamDeck.logger.info("");
			streamDeck.logger.info(`Checks will occur every ${verify.interval}s up to a maximum of ${verify.expires_in}s`);
			streamDeck.logger.info("------------------------------------------------");
		}
		await futureToken;

		const me = await this.tado.getMe();

		streamDeck.logger.info(`me: ${JSON.stringify(me)}`);

		streamDeck.logger.info(`saving homes: ${JSON.stringify(settings)}`);
		await streamDeck.settings.setGlobalSettings({
			...settings,
			homes: me.homes,
		});
		streamDeck.logger.info(`homes saved`);

		const savedSettings = await streamDeck.settings.getGlobalSettings();
		streamDeck.logger.info(`savedSettings: ${JSON.stringify(savedSettings)}`);
	}

	public static getInstance(): TadoSingleton {
		if (!TadoSingleton.instance) {
			TadoSingleton.instance = new TadoSingleton();
		}
		return TadoSingleton.instance;
	}

	async onTokenCallback(token: Token): Promise<void> {
		streamDeck.logger.info(`token: ${JSON.stringify(token)}`);
		const settings = await streamDeck.settings.getGlobalSettings();
		streamDeck.logger.info(`saving token: ${JSON.stringify(token)}`);
		await streamDeck.settings.setGlobalSettings({
			...settings,
			access_token: token.access_token,
			refresh_token: token.refresh_token,
			expiry: token.expiry.toISOString(),
		});
		streamDeck.logger.info(`token saved`);
	}
}

export default TadoSingleton.getInstance();
