import type { Device } from "./api";
import { createTailscaleClient } from "./api";
import { deviceReachability, deviceReachabilityLastScan, type DeviceReachabilityMap, type DeviceReachabilityResult } from "./storage";

export const REACHABILITY_ALARM_NAME = "tailscale-device-reachability-scan";
export const REACHABILITY_SCAN_PERIOD_MINUTES = 1;

function isIpv6(address: string): boolean {
  return address.includes(":");
}

function hostForUrl(hostOrIp: string): string {
  return isIpv6(hostOrIp) ? `[${hostOrIp}]` : hostOrIp;
}

function getProbeTargets(device: Device): string[] {
  const targets: string[] = [];
  const fqdn = device.name?.trim();
  // const hostname = device.hostname?.trim();

  console.log("fqdn", fqdn, "addresses", device.addresses);

  if (fqdn) {
    targets.push(`https://${fqdn}`);
    targets.push(`http://${fqdn}`);
  }

  for (const address of device.addresses ?? []) {
    const host = hostForUrl(address);

    console.log("hostForUrl", address, host);

    targets.push(`http://${host}`);
    targets.push(`https://${host}`);
  }

  return [...new Set(targets)];
}

async function probeUrl(url: string, timeoutMs = 2500): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  console.log(url, "probe started");

  try {
    let result = await fetch(url, {
      method: "HEAD",
      mode: "no-cors",
      cache: "no-store",
      signal: controller.signal,
    });

    console.log("prope response from", url, result);
    return true;
  } catch (Err) {
    console.warn("probe error for", url, Err);
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

async function checkDeviceReachability(device: Device): Promise<DeviceReachabilityResult> {
  const checkedAt = new Date().toISOString();
  const targets = getProbeTargets(device);

  if (targets.length === 0) {
    return {
      status: "unknown",
      checkedAt,
      detail: "No hostname or IP targets available",
    };
  }

  for (const target of targets) {
    const isReachable = await probeUrl(target);
    if (isReachable) {
      return {
        status: "reachable",
        checkedAt,
        target,
      };
    }
  }

  return {
    status: "unreachable",
    checkedAt,
    detail: "All HTTP/HTTPS probes failed or timed out",
  };
}

export async function runAndStoreReachabilityScan(): Promise<DeviceReachabilityMap> {
  const client = await createTailscaleClient();

  if (!client) {
    await deviceReachability.setValue({});
    await deviceReachabilityLastScan.setValue(new Date().toISOString());
    return {};
  }

  const { devices } = await client.listDevices("default");
  const resultMap: DeviceReachabilityMap = {};

  for (const device of devices) {
    resultMap[device.id] = await checkDeviceReachability(device);
  }

  await deviceReachability.setValue(resultMap);
  await deviceReachabilityLastScan.setValue(new Date().toISOString());

  return resultMap;
}
