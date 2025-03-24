import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { CurrentTemperature } from "./actions/current-temperature";
import { Power } from "./actions/power";
import TadoSingleton from "./Tado";

// Enable logging
streamDeck.logger.setLevel(LogLevel.TRACE);
streamDeck.connect();

streamDeck.actions.onWillAppear(async (jsonObj) => {
	streamDeck.logger.info("onWillAppear global", jsonObj);

	await streamDeck.connect();

	// Initialize the Tado singleton
	const tadoInstance = TadoSingleton.getInstance();
	await tadoInstance.init();

	// Create action instances
	const powerAction = new Power(tadoInstance.tado);
	const currentTemperatureAction = new CurrentTemperature(tadoInstance.tado);

	// Register actions
	streamDeck.actions.registerAction(powerAction);
	streamDeck.actions.registerAction(currentTemperatureAction);

	// Explicitly trigger initialization for actions
	const globalSettings = await streamDeck.settings.getGlobalSettings();
	streamDeck.logger.info("Initializing actions with global settings", globalSettings);

	const actionId = jsonObj.action.manifestId;

	streamDeck.logger.info("actionId", actionId);
	// Handle specific actions
	if (actionId === "dev.aperez.new-tado.current-temperature") {
		currentTemperatureAction.onWillAppear(jsonObj as any);
	} else if (actionId === "dev.aperez.new-tado.power") {
		powerAction.onWillAppear(jsonObj as any);
	}
});
