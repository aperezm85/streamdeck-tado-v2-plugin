import streamDeck, { LogLevel } from "@elgato/streamdeck";
import { Tado } from "node-tado-client";

import { CurrentTemperature } from "./actions/current-temperature";
import { Power } from "./actions/power";

// We can enable "trace" logging so that all messages between the Stream Deck, and the plugin are recorded. When storing sensitive information
streamDeck.logger.setLevel(LogLevel.INFO);

const tado = new Tado();

// Register the increment action.
// streamDeck.actions.registerAction(new IncrementCounter(tado));
streamDeck.actions.registerAction(new CurrentTemperature(tado));
streamDeck.actions.registerAction(new Power(tado));

// Finally, connect to the Stream Deck.
streamDeck.connect();
