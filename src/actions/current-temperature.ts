import {
	action,
	DidReceiveSettingsEvent,
	JsonObject,
	SingletonAction,
	streamDeck,
	WillAppearEvent,
	WillDisappearEvent,
} from "@elgato/streamdeck";
import { MeHome, type Tado, Zone } from "node-tado-client";

import { UnitTemperature } from "../types";

@action({ UUID: "dev.aperez.tado-plugin.current-temperature" })
export class CurrentTemperature extends SingletonAction<CurrentTemperatureSettings> {
	private updateInterval: NodeJS.Timeout | undefined;

	private tado: Tado;

	constructor(tado: Tado) {
		super();

		this.tado = tado;
	}

	override async onWillAppear(ev: WillAppearEvent<CurrentTemperatureSettings>): Promise<void> {
		this.updateZoneState(ev);

		this.updateInterval = setInterval(
			async () => {
				await this.updateZoneState(ev);
			},
			2 * 60 * 1000,
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
		try {
			streamDeck.logger.info(JSON.stringify(this.tado));
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
		} catch (error) {
			streamDeck.logger.error(`Error getting the homes: ${error}`);
		}
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

	private getIndicator(value: number, unit: UnitTemperature) {
		if (unit === "celsius") {
			streamDeck.logger.info("getIndicator", (value - 5) / (25 - 5) / 100);
			return ((value - 5) / (25 - 5)) * 100;
		}
		return ((value - 41) / (77 - 41)) * 100;
	}
	private async getTemperatureRoom(
		homeId: string,
		zoneId: string,
		unit: "celsius" | "fahrenheit",
		ev: DidReceiveSettingsEvent<CurrentTemperatureSettings>,
	) {
		streamDeck.logger.info("getTemperatureRoom", homeId, zoneId);
		const zoneState = await this.tado.getZoneState(parseInt(homeId, 10), parseInt(zoneId, 10));
		const zone = (await this.tado.getZones(parseInt(homeId, 10))).find((z) => z.id === parseInt(zoneId, 10));

		if (ev.action.isKey()) {
			try {
				if (unit === "fahrenheit") {
					return ev.action.setTitle(`${zoneState?.sensorDataPoints?.insideTemperature?.fahrenheit ?? 0}°F`);
				}
				return ev.action.setTitle(`${zoneState?.sensorDataPoints?.insideTemperature?.celsius ?? 0}°C`);
			} catch (error) {
				streamDeck.logger.error(`Error getting the zone: ${error}`);
			}
		}
		if (ev.action.isDial()) {
			try {
				if (unit === "fahrenheit") {
					return ev.action.setFeedback({
						value: `${zoneState?.sensorDataPoints?.insideTemperature?.fahrenheit ?? 0}°F`,
						title: zone?.name || "",
						indicator: this.getIndicator(zoneState?.sensorDataPoints?.insideTemperature?.fahrenheit, "fahrenheit"),
					});
				}
				return ev.action.setFeedback({
					value: `${zoneState?.sensorDataPoints?.insideTemperature?.celsius ?? 0}°C`,
					title: zone?.name || "",
					indicator: this.getIndicator(zoneState?.sensorDataPoints?.insideTemperature?.celsius, "celsius"),
				});
			} catch (error) {
				streamDeck.logger.error(`Error getting the zone: ${error}`);
			}
		}
	}
}

interface CurrentTemperatureSettings extends JsonObject {
	homeId: string;
	zoneId: string;
	unit: "celsius" | "fahrenheit";
}
