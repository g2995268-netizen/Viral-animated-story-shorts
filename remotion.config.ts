import { Config } from "@remotion/cli/config";

Config.setEntryPoint("./src/index.ts");
Config.setOverwriteOutput(true);
Config.setConcurrency(1);
