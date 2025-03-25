import {
	action,
	DialDownEvent,
	DialRotateEvent,
	DidReceiveSettingsEvent,
	JsonObject,
	KeyDownEvent,
	SingletonAction,
	streamDeck,
	WillAppearEvent,
	WillDisappearEvent,
} from "@elgato/streamdeck";
import { MeHome, Tado, Zone } from "node-tado-client";

import { PowerSettings, UnitTemperature } from "../types";

@action({ UUID: "dev.aperez.new-tado.power" })
export class Power extends SingletonAction<PowerSettings> {
	private updateInterval: NodeJS.Timeout | undefined;

	private tado: Tado;

	constructor(tado: Tado) {
		super();

		this.tado = tado;
	}

	override async onWillAppear(ev: WillAppearEvent<PowerSettings>): Promise<void> {
		this.updateZoneState(ev);

		this.updateInterval = setInterval(
			async () => {
				await this.updateZoneState(ev);
			},
			5 * 60 * 1000,
		);
	}

	override onWillDisappear(_ev: WillDisappearEvent<PowerSettings>): void {
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
			this.getRoomState(homeId, zoneId, ev);
		}
	}

	override async onSendToPlugin(ev: any): Promise<void> {
		streamDeck.logger.info("onSendToPlugin", JSON.stringify(ev, null, 2));
		const settings = await ev.action.getSettings();

		if (ev.payload.event === "getHomes") {
			this.getHomes();
		}

		if (ev.payload.event === "getZones" && settings.homeId) {
			this.getZones(settings.homeId);
		}
		streamDeck.connect();
	}

	override async onDidReceiveSettings(ev: DidReceiveSettingsEvent<PowerSettings>): Promise<void> {
		streamDeck.logger.info("DidReceiveSettingsEvent", ev.payload.settings);

		const { homeId, zoneId, unit, temperature } = ev.payload.settings;

		if (homeId && !zoneId) {
			this.getZones(homeId);
		}
		if (homeId && zoneId) {
			this.getTemperatureRoom(homeId, zoneId, unit, ev);
			this.getRoomState(homeId, zoneId, ev);
			if (temperature !== undefined) {
				this.setRoomValue(homeId as string, zoneId as string, unit as UnitTemperature, temperature as number);
			}
		}
	}

	private getIndicator(value: number, unit: UnitTemperature) {
		if (unit === "celsius") {
			return ((value - 5) / (25 - 5)) * 100;
		}
		return ((value - 41) / (77 - 41)) * 100;
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
		ev: DidReceiveSettingsEvent<PowerSettings>,
	) {
		streamDeck.logger.info("getTemperatureRoom", homeId, zoneId);

		const { setting } = await this.tado.getZoneOverlay(parseInt(homeId as string, 10), parseInt(zoneId as string, 10));
		try {
			const zoneState = await this.tado.getZoneState(parseInt(homeId, 10), parseInt(zoneId, 10));
			const zone = (await this.tado.getZones(parseInt(homeId, 10))).find((z) => z.id === parseInt(zoneId, 10));

			if (ev.action.isKey()) {
				if (unit === "fahrenheit") {
					return ev.action.setTitle(`${zoneState?.sensorDataPoints?.insideTemperature?.fahrenheit ?? 0}°F`);
				}
				return ev.action.setTitle(`${zoneState?.sensorDataPoints?.insideTemperature?.celsius ?? 0}°C`);
			}
			if (ev.action.isDial()) {
				try {
					if (unit === "fahrenheit") {
						return ev.action.setFeedback({
							value: `${zoneState?.sensorDataPoints?.insideTemperature?.fahrenheit ?? 0}°F`,
							title: `${setting.power}: ${zone?.name || ""}`,
							indicator: this.getIndicator(zoneState?.sensorDataPoints?.insideTemperature?.fahrenheit, "fahrenheit"),
						});
					}
					return ev.action.setFeedback({
						value: `${zoneState?.sensorDataPoints?.insideTemperature?.celsius ?? 0}°C`,
						title: `${setting.power}: ${zone?.name || ""}`,
						indicator: this.getIndicator(zoneState?.sensorDataPoints?.insideTemperature?.celsius, "celsius"),
					});
				} catch (error) {
					streamDeck.logger.error(`Error getting the zone: ${error}`);
				}
			}
		} catch (error) {
			streamDeck.logger.error(`Error getting the zone: ${error}`);
		}
	}

	private async getRoomState(homeId: string, zoneId: string, ev: any) {
		streamDeck.logger.info("getRoomState", homeId, zoneId);
		try {
			const { setting } = await this.tado.getZoneOverlay(parseInt(homeId, 10), parseInt(zoneId, 10));

			if (ev.action.isKey()) {
				if (setting.power === "ON") {
					ev.action.setState(0);
				} else {
					ev.action.setState(1);
				}
			}
		} catch (error) {
			streamDeck.logger.error(`Error getting the zone: ${error}`);
		}
	}

	override async onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> {
		streamDeck.logger.info(`Key pressed!`);
		const pluginSettings = await ev.action.getSettings();
		const { homeId, zoneId, unit, temperature } = pluginSettings;

		this.setRoomValue(homeId as string, zoneId as string, unit as UnitTemperature, temperature as number, true);
	}

	override async onDialDown(ev: DialDownEvent<PowerSettings>): Promise<void> {
		streamDeck.logger.info(`onDialDown pressed!`);
		const pluginSettings = await ev.action.getSettings();
		const { homeId, zoneId, unit, temperature } = pluginSettings;

		await this.setRoomValue(homeId as string, zoneId as string, unit as UnitTemperature, temperature as number, true);

		if (ev.action.isDial()) {
			const zone = (await this.tado.getZones(parseInt(homeId, 10))).find((z) => z.id === parseInt(zoneId, 10));
			const { setting } = await this.tado.getZoneOverlay(
				parseInt(homeId as string, 10),
				parseInt(zoneId as string, 10),
			);

			return ev.action.setFeedback({
				title: `${setting.power}: ${zone?.name || ""}`,
			});
		}
	}

	override async onDialRotate(ev: DialRotateEvent<PowerSettings>): Promise<void> {
		streamDeck.logger.info(`onDialRotate pressed!`, ev);
		const pluginSettings = await ev.action.getSettings();
		const ticks = ev.payload.ticks;
		const { homeId, zoneId, unit, temperature } = pluginSettings;
		let newTemperature = temperature as number;
		if (unit === "fahrenheit") {
			newTemperature += ticks;
			if (newTemperature < 41) {
				newTemperature = 41;
			} else if (newTemperature > 77) {
				newTemperature = 77;
			}
		}
		if (unit === "celsius") {
			newTemperature += ticks / 2;
			if (newTemperature < 5) {
				newTemperature = 5;
			} else if (newTemperature > 25) {
				newTemperature = 25;
			}
		}

		await ev.action.setSettings({ homeId, zoneId, unit, temperature: newTemperature });
	}

	private async setRoomValue(
		homeId: string,
		zoneId: string,
		unit: UnitTemperature,
		temperature: number,
		changeState: boolean = false,
	) {
		streamDeck.logger.info("setRoomValue", homeId, zoneId, unit, temperature, changeState);
		try {
			if (homeId && zoneId) {
				const { setting } = await this.tado.getZoneOverlay(
					parseInt(homeId as string, 10),
					parseInt(zoneId as string, 10),
				);
				if (changeState) {
					if (setting.power === "ON") {
						streamDeck.logger.info(`Turning off the heating`);
						this.tado.setZoneOverlays(
							parseInt(homeId as string, 10),
							[
								{
									power: "OFF",
									zone_id: parseInt(zoneId as string, 10),
									temperature: setting.temperature,
								},
							],
							"MANUAL",
						);
					} else {
						streamDeck.logger.info(`Turning ON the heating`);
						this.tado.setZoneOverlays(
							parseInt(homeId as string, 10),
							[
								{
									power: "ON",
									zone_id: parseInt(zoneId as string, 10),
									temperature: this.getTemperature(unit as UnitTemperature, temperature as number),
								},
							],
							"MANUAL",
						);
					}
				} else {
					streamDeck.logger.info(
						`Change temperature only`,
						this.getTemperature(unit as UnitTemperature, temperature as number),
					);
					this.tado.setZoneOverlays(
						parseInt(homeId as string, 10),
						[
							{
								power: setting.power,
								zone_id: parseInt(zoneId as string, 10),
								temperature: this.getTemperature(unit as UnitTemperature, temperature as number),
							},
						],
						"MANUAL",
					);
				}
			}
		} catch (error) {
			streamDeck.logger.error(`Error getting the zone: ${error}`);
		}
	}

	private getTemperature(unit: UnitTemperature, temperature: number) {
		if (unit === "fahrenheit") {
			return {
				celsius: this.convertToCelsius(temperature as number),
				fahrenheit: temperature as number,
			};
		}
		return {
			celsius: temperature as number,
			fahrenheit: this.convertToFahrenheit(temperature as number),
		};
	}

	private convertToFahrenheit(celsius: number) {
		return (celsius * 9) / 5 + 32;
	}

	private convertToCelsius(f: number) {
		return ((f - 32) * 5) / 9;
	}
}
