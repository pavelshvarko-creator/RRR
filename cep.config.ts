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
  // Откат: RRR3 (тот же баг искали сравнением) работает корректно с этим
  // же набором параметров без изменений — значит, все мои добавления
  // этой сессии (MinSize, --force-device-scale-factor, --high-dpi-support,
  // --disable-gpu) не чинили проблему, а сами были лишней переменной.
  // Возвращаем ровно то, что было до сессии (= то, что сейчас у RRR3).
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
      // Раньше было type: "Modeless" (отдельное плавающее окно, не
      // пристыкованное к основной панели — как старое ScriptUI-окно
      // Window("palette", ...)). В этой версии AE/CEP "Modeless"-окна не
      // перерисовываются после программного открытия (requestOpenExtension) —
      // содержимое полностью корректно (проверено через удалённый DevTools),
      // но на экране остаётся белый прямоугольник, и никакие трюки с
      // перерисовкой изнутри страницы не помогают. "Panel" — тип, которым
      // уже работает основная панель RRR без единого сбоя, — переключаемся
      // на него и для гайда.
      mainPath: "./guide/index.html",
      name: "guide",
      panelDisplayName: "RRR Guide",
      // true, а не false: гарантирует, что экземпляр панели гайда уже создан
      // AE к моменту клика по кнопке "i" — иначе requestOpenExtension не
      // может открыть его "с нуля" (см. handleInfoClick в main.tsx).
      autoVisible: true,
      type: "Panel",
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
  copyAssets: ["resources/GifsGuide"],
  copyZipAssets: [],
};
export default config;
