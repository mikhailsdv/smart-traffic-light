import "dotenv/config";
import { getYandexAccessToken } from "../providers/yandexAuth.js";

interface YandexGroup {
  id: string;
  name: string;
  devices: string[];
}

interface YandexDevice {
  id: string;
  name: string;
}

interface YandexUserInfo {
  groups: YandexGroup[];
  devices: YandexDevice[];
}

async function getYandexUserInfo(): Promise<YandexUserInfo> {
  const token = await getYandexAccessToken();
  const response = await fetch("https://api.iot.yandex.net/v1.0/user/info", {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await response.text();

  if (!response.ok) {
    throw new Error(`Yandex request failed: ${response.status} ${response.statusText}\n${body}`);
  }

  return JSON.parse(body) as YandexUserInfo;
}

async function main(): Promise<void> {
  const userInfo = await getYandexUserInfo();
  const group = userInfo.groups.find((item) => item.name === "Светофор");

  if (!group) {
    throw new Error("Yandex group not found: Светофор");
  }

  const devicesById = new Map(userInfo.devices.map((device) => [device.id, device]));

  console.log(`Group: ${group.name}`);
  console.log(`Group ID: ${group.id}`);
  console.log("Lamps:");

  for (const deviceId of group.devices) {
    const device = devicesById.get(deviceId);

    console.log(`- ${device?.name ?? "Unknown"}: ${deviceId}`);
  }
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
