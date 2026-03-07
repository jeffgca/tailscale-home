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
- [x] ui updates to automagically reflect tailnet connection status
- [x] hard refresh button to manually refresh tailnet connection status
- [x] a basic listing of available tailnet services

## Backlog

- [ ] [SECURITY] should we use Oauth for authentication instead of storing the api token? Probably.
- [ ] how do we know which tailnet host we're on, if we are on one?
- [ ] would this all be much easier if we had a bun executable that implemented native messaging and had raw sockets? well yes but is bundling an executable practical? Electrobun companion app?
- [ ] is there a local api / interface exposed by the tailscale client we can hijack, er, take advantage of?
