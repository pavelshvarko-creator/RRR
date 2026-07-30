import type { CEP_Config } from "vite-cep-plugin";
import { version } from "./package.json";

const config: CEP_Config = {
  version,
  id: "com.rrr.panel",
  displayName: "RRR",
  symlink: "local",
  port: 3000,
  servePort: 5000,
  startingDebugPort: 8860,
  extensionManifestVersion: 6.0,
  requiredRuntimeVersion: 9.0,
  hosts: [{ name: "AEFT", version: "[0.0,99.9]" }],

  type: "Panel",
  iconDarkNormal: "./src/assets/light-icon.png",
  iconNormal: "./src/assets/dark-icon.png",
  iconDarkNormalRollOver: "./src/assets/light-icon.png",
  iconNormalRollOver: "./src/assets/dark-icon.png",
  parameters: ["--v=0", "--enable-nodejs", "--mixed-context"],
  width: 500,
  height: 550,

  panels: [
    {
      mainPath: "./main/index.html",
      name: "main",
      panelDisplayName: "RRR",
      autoVisible: true,
      width: 600,
      height: 650,
    },
    {
      // Отдельное (не встроенное в основную панель) плавающее окно гайда —
      // "Modeless", как старое ScriptUI-окно Window("palette", ...): не
      // блокирует работу с AE и не пристыковано к основной панели.
      mainPath: "./guide/index.html",
      name: "guide",
      panelDisplayName: "RRR Guide",
      autoVisible: false,
      type: "Modeless",
      width: 420,
      height: 600,
    },
  ],
  build: {
    jsxBin: "off",
    sourceMap: true,
  },
  zxp: {
    country: "US",
    province: "CA",
    org: "Company",
    password: "password",
    tsa: [
      "http://timestamp.digicert.com/", // Windows Only
      "http://timestamp.apple.com/ts01", // MacOS Only
    ],
    allowSkipTSA: false,
    sourceMap: false,
    jsxBin: "off",
  },
  installModules: ["adm-zip"],
  copyAssets: [],
  copyZipAssets: [],
};
export default config;
