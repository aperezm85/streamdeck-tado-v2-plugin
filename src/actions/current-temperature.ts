import {
	action,
	DidReceiveSettingsEvent,
	JsonObject,
	SingletonAction,
	streamDeck,
	WillAppearEvent,
	WillDisappearEvent,
} from "@elgato/streamdeck";
import { MeHome, Tado, Token, Zone } from "node-tado-client";

import { TadoSettings } from "../types";

@action({ UUID: "dev.aperez.new-tado.current-temperature" })
export class CurrentTemperature extends SingletonAction<CurrentTemperatureSettings> {
	private updateInterval: NodeJS.Timeout | undefined;

	private tado: Tado;

	constructor(tado: Tado) {
		super();

		this.tado = tado;

		this.initialize();
	}

	private async initialize() {
		const settings: TadoSettings = await streamDeck.settings.getGlobalSettings();

		this.tado.setTokenCallback(this.onTokenCallback);
		streamDeck.logger.info(`settings?.expires_in: ${settings?.expiry}`);
		streamDeck.logger.info(`settings?.refresh_token: ${settings?.refresh_token}`);
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
	}

	private async onTokenCallback(token: Token) {
		const settings = await streamDeck.settings.getGlobalSettings();

		await streamDeck.settings.setGlobalSettings({
			...settings,
			access_token: token.access_token,
			refresh_token: token.refresh_token,
			expiry: token.expiry.toISOString(),
		});
	}

	override async onWillAppear(ev: WillAppearEvent<CurrentTemperatureSettings>): Promise<void> {
		const settings = await streamDeck.settings.getGlobalSettings();
		streamDeck.logger.info("onWillAppear", settings);

		this.updateZoneState(ev);

		this.updateInterval = setInterval(
			async () => {
				await this.updateZoneState(ev);
			},
			5 * 60 * 1000,
		);
	}

	override onWillDisappear(_ev: WillDisappearEvent<CurrentTemperatureSettings>): void {
		if (this.updateInterval) {
			clearInterval(this.updateInterval);
			this.updateInterval = undefined;
		}
	}

	private async updateZoneState(ev: any): Promise<void> {
		const { homeId, zoneId, unit } = ev.payload.settings;
		streamDeck.logger.info("updateZoneState", ev.payload);

		if (homeId) {
			this.getZones(homeId);
		}
		if (homeId && zoneId) {
			this.getTemperatureRoom(homeId, zoneId, unit, ev);
		}
	}

	override async onSendToPlugin(ev: any): Promise<void> {
		streamDeck.logger.info("onSendToPlugin", JSON.stringify(ev, null, 2));
		const settings = await ev.action.getSettings();
		streamDeck.logger.info("onSendToPlugin settings", JSON.stringify(settings, null, 2));

		if (ev.payload.event === "getHomes") {
			this.getHomes();
		}

		if (ev.payload.event === "getZones" && settings.homeId) {
			this.getZones(settings.homeId);
		}
		streamDeck.connect();
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<CurrentTemperatureSettings>): Promise<void> {
		streamDeck.logger.info("DidReceiveSettingsEvent", ev.payload.settings);

		const { homeId, zoneId, unit } = ev.payload.settings;

		if (homeId && !zoneId) {
			this.getZones(homeId);
		}
		if (homeId && zoneId) {
			this.getTemperatureRoom(homeId, zoneId, unit, ev);
		}
	}

	private async getHomes() {
		const { homes } = await this.tado.getMe();

		const homesName = homes.map((home: MeHome) => {
			return {
				label: home.name,
				value: home.id,
			};
		});
		streamDeck.ui.current?.sendToPropertyInspector({
			event: "getHomes",
			items: homesName,
		});
	}

	private async getZones(homeId: string) {
		const zones = await this.tado.getZones(parseInt(homeId, 10));

		const zonesName = zones.map((zone: Zone) => {
			return {
				label: zone.name,
				value: zone.id,
			};
		});
		streamDeck.ui.current?.sendToPropertyInspector({
			event: "getZones",
			items: zonesName,
		});
		streamDeck.connect();
	}
	private async getTemperatureRoom(
		homeId: string,
		zoneId: string,
		unit: "celsius" | "fahrenheit",
		ev: DidReceiveSettingsEvent<CurrentTemperatureSettings>,
	) {
		streamDeck.logger.info("getTemperatureRoom", homeId, zoneId);

		try {
			const zone = await this.tado.getZoneState(parseInt(homeId, 10), parseInt(zoneId, 10));
			if (unit === "fahrenheit") {
				return ev.action.setTitle(`${zone?.sensorDataPoints?.insideTemperature?.fahrenheit ?? 0}°F`);
			}
			return ev.action.setTitle(`${zone?.sensorDataPoints?.insideTemperature?.celsius ?? 0}°C`);
		} catch (error) {
			streamDeck.logger.error(`Error getting the zone: ${error}`);
		}
	}
}

interface CurrentTemperatureSettings extends JsonObject {
	homeId: string;
	zoneId: string;
	unit: "celsius" | "fahrenheit";
}
