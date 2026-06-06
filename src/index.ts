import "dotenv/config";
import { SmartTrafficLightController } from "./controller/SmartTrafficLightController.js";
import { createProvider } from "./providers/createProvider.js";
import { getTrafficLightScript, trafficLightScripts } from "./scripts/index.js";

interface CliOptions {
  scriptName: string;
  providerName: string;
}

function parseCliOptions(argv: string[]): CliOptions {
  const scriptFlagIndex = argv.indexOf("--script");
  const scriptName = scriptFlagIndex === -1
    ? undefined
    : argv[scriptFlagIndex + 1];
  const providerFlagIndex = argv.indexOf("--provider");
  const providerName = providerFlagIndex === -1
    ? undefined
    : argv[providerFlagIndex + 1];

  if (!scriptName) {
    throw new Error(`Usage: npm run dev -- --script <script> --provider tasmota|yandex. Available scripts: ${trafficLightScripts.map((script) => script.name).join(", ")}`);
  }

  if (!providerName) {
    throw new Error("Missing value for --provider");
  }

  return { scriptName, providerName };
}

async function main(): Promise<void> {
  const { scriptName, providerName } = parseCliOptions(process.argv.slice(2));
  const provider = createProvider(providerName);
  const controller = new SmartTrafficLightController(provider);
  const script = getTrafficLightScript(scriptName);

  await script.run(controller);
}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);

  console.error(message);
  process.exitCode = 1;
});
