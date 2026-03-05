import { createRouter } from "sv-router";
import DevicesList from "../../components/DevicesList.svelte";
import ServicesList from "../../components/ServicesList.svelte";

export const { p, navigate, isActive, route } = createRouter({
  "/tab.html": DevicesList,
  "/tab.html/services": ServicesList,
});
