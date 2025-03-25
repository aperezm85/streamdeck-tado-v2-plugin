import streamDeck, { LogLevel } from "@elgato/streamdeck";

import { Boost } from "./actions/boost";
import { CurrentTemperature } from "./actions/current-temperature";
import { PowerAllOff } from "./actions/off";
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
	const boostAction = new Boost(tadoInstance.tado);
	const powerOffAction = new PowerAllOff(tadoInstance.tado);

	// Register actions
	streamDeck.actions.registerAction(powerAction);
	streamDeck.actions.registerAction(currentTemperatureAction);
	streamDeck.actions.registerAction(boostAction);
	streamDeck.actions.registerAction(powerOffAction);

	// Explicitly trigger initialization for actions
	const globalSettings = await streamDeck.settings.getGlobalSettings();
	streamDeck.logger.info("Initializing actions with global settings", globalSettings);

	const actionId = jsonObj.action.manifestId;

	streamDeck.logger.info("actionId", actionId);
	// Handle specific actions
	if (actionId === "dev.aperez.new-tado.current-temperature") {
		currentTemperatureAction.onWillAppear(jsonObj as any);
	}
	if (actionId === "dev.aperez.new-tado.power") {
		powerAction.onWillAppear(jsonObj as any);
	}
});
