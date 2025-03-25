import { MeHome } from "node-tado-client";

type TadoSettings = {
	access_token: string;
	refresh_token: string;
	expiry: string;
	homes: MeHome[];
};

type UnitTemperature = "celsius" | "fahrenheit";

type PowerSettings = {
	homeId: string;
	zoneId: string;
	unit: UnitTemperature;
	temperature: number;
};
type BoostSettings = {
	homeId: string;
};
