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
  // Подтверждено диагностикой (удалённый DevTools, живой инстанс в AE):
  // window.__adobe_cep__.getScaleFactor() === 1, а
  // window.__adobe_cep__.getMonitorScaleFactor() === 1.25 — CEF рисует
  // контент панели как если бы масштаба не было (1:1), хотя реальный
  // монитор — 125%. AE-докинг (сам DPI-aware) выделяет панели область в
  // РЕАЛЬНЫХ физических пикселях монитора, а CEF кладёт туда CSS-пиксели
  // 1:1 — рассинхрон ровно в 1.25 раза, отсюда обрезанный "довесок"
  // следующей кнопки в каждой строке. Форсируем масштаб CEF, чтобы он
  // совпадал с реальным монитором (1.25), а не с тем, что сообщает AE (1).
  // (Прежняя версия этой правки — "=1" — была ошибочной: это то же самое
  // значение, что CEF и так уже использовал, поэтому ничего не меняло.)
  // as any — vite-cep-plugin типизирует parameters фиксированным списком
  // известных флагов и не включает "--force-device-scale-factor"/
  // "--high-dpi-support", но генерация манифеста просто пишет
  // item.toString() в <Parameter> без runtime-проверки списка.
  parameters: [
    "--v=0",
    "--enable-nodejs",
    "--mixed-context",
    "--force-device-scale-factor=1.25",
    "--high-dpi-support=1",
  ] as any,
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
      // Без <MinSize> в манифесте AE не даёт настоящему рендер-вьюпорту
      // панели сузиться меньше исходного width/height (600×650) — сама
      // докнутая область в интерфейсе AE визуально сужается, а фактическое
      // содержимое рендерится на прежнюю, более широкую ширину и просто
      // обрезается по видимому краю (поэтому в узкой панели виден
      // "надрезанный" кусок следующей кнопки вместо честного переноса на
      // новую строку — flex-wrap физически не может отрисовать элемент
      // наполовину, значит браузер и не переносил его, просто у него было
      // больше места, чем видно на экране). Явный маленький MinSize снимает
      // это ограничение.
      minWidth: 70,
      minHeight: 200,
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
