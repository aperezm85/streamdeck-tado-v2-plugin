import { action, JsonObject, KeyDownEvent, SingletonAction, streamDeck } from "@elgato/streamdeck";
import { MeHome, Power, Tado, Zone } from "node-tado-client";

import { BoostSettings } from "../types";

@action({ UUID: "dev.aperez.tado-plugin.boost" })
export class Boost extends SingletonAction<BoostSettings> {
	private tado: Tado;

	constructor(tado: Tado) {
		super();

		this.tado = tado;
	}

	override async onSendToPlugin(ev: any): Promise<void> {
		streamDeck.logger.info("onSendToPlugin", JSON.stringify(ev, null, 2));

		if (ev.payload.event === "getHomes") {
			this.getHomes();
		}

		streamDeck.connect();
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

	override async onKeyDown(ev: KeyDownEvent<JsonObject>): Promise<void> {
		streamDeck.logger.info(`Key pressed!`);
		const pluginSettings = await ev.action.getSettings();
		const { homeId } = pluginSettings;

		const zones = await this.tado.getZones(parseInt(homeId as string, 10));

		const overlays = zones.map((zone, index) => {
			return {
				power: "ON" as Power,
				isBoost: true,
				type: "HEATING",
				zone_id: zone.id,
				temperature: {
					celsius: 25,
					fahrenheit: 77,
				},
			};
		});

		await this.tado.setZoneOverlays(parseInt(homeId as string, 10), overlays, 1800);
	}
}
