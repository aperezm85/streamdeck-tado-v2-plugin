# streamdeck-tado-plugin

> [!WARNING]
> Due to latest Tado API changes, I don't recommend to use this plugin on streamdeck until issues with rate limit and auth has being solved


Plugin for manage TADO Thermostat from the Elgato Stream Deck.

![Thumbnail](https://github.com/aperezm85/streamdeck-tado-v2-plugin/blob/main/dev.aperez.tado-plugin.sdPlugin/imgs/screenshots/Thumbnail.png?raw=true "Tado")

> [!WARNING]
> This plugin works only for thermostats Tado V2 and V3 (Not TadoX)

> [!IMPORTANT]
> This version replaces the old Elgato Stream Deck Tado plugin that will stop working when Tado removes the old authentication journey.
> [Documentation](https://mattdavis90.github.io/node-tado-client/)

## What you can do!

- You can turn on / off the heating on one room (you can use the dials on the Stream Deck + to regulate the temperature)
- You can check the current temperature on one room (also available on the Stream Deck +)
- You can turn on all the thermostats to the maximum power! (Boost)
- You can turn off all the thermostats on your home

![What you can do](https://github.com/aperezm85/streamdeck-tado-v2-plugin/blob/main/dev.aperez.tado-plugin.sdPlugin/imgs/screenshots/Screenshot.png?raw=true)

### Known issues

- Tado added a rate limit of 100 API calls per day, so I will not recommend to use this plugin until futher notice.

- The auth screen appears more often that desired. Sometimes the plugin don't load correctly, but you can click other plugin on your SD configuration or restart it to fix it (working on an improvement)

- The translations are set for English, Spanish, French and German, but the Property inspector is only showing the english version (needs review)

### Thanks to Matt Davis for his node client and his updates

[Node Tado Client](https://github.com/mattdavis90/node-tado-client)
