# Tailscale Home

A browser extension for Tailscale / Tailnet users that authenticates you gives you access to your tailnet status, devices and services.

## TODO:

- [ ] implement main page that displays the devices / services etc that the user wants to see
- [ ] optional setting that makes the main view the newtab page
- [ ] first run experience selecting which devices and services are added to the main page
- [ ] simple themes for the main page

## DONE:

- [x] a preferences page the user can use to enter their tailscale api key, including storage of the api key across browser sessions.
- [x] a browser action button that opens the main extension page
- [x] the main extension page that displays a list of tailnet devices from the tailscale api, including the name, ip address and whether the device is currently online
- [x] a background timer that regularly checks to see if the tailscale network is available
