import { csi } from "./bolt";
import { fs, os, path } from "../cep/node";
import { version as currentVersion } from "../../../shared/shared";

// Репозиторий на GitHub, откуда панель проверяет и качает обновления.
const REPO = "pavelshvarko-creator/RRR";

export type UpdateCheckResult = {
  hasUpdate: boolean;
  latestVersion: string;
  downloadUrl: string | null;
};

// Простое сравнение версий вида "2.0.1" по числовым сегментам.
function isNewerVersion(latest: string, current: string): boolean {
  const latestParts = latest.split(".").map((n) => parseInt(n, 10) || 0);
  const currentParts = current.split(".").map((n) => parseInt(n, 10) || 0);
  const len = Math.max(latestParts.length, currentParts.length);
  for (let i = 0; i < len; i++) {
    const l = latestParts[i] || 0;
    const c = currentParts[i] || 0;
    if (l > c) return true;
    if (l < c) return false;
  }
  return false;
}

// Проверяет последний релиз на GitHub (публичный API, без токена) и сравнивает
// его версию (tag_name, например "v2.0.2") с версией текущей сборки панели.
export const checkForUpdate = async (): Promise<UpdateCheckResult> => {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`);
  if (!res.ok) {
    throw new Error("Не удалось проверить обновления (GitHub API: " + res.status + ")");
  }
  const data = await res.json();
  const latestVersion = String(data.tag_name || "").replace(/^v/, "");
  const asset = (data.assets || []).find((a: any) => a.name && a.name.indexOf(".zip") === a.name.length - 4);

  return {
    hasUpdate: !!latestVersion && isNewerVersion(latestVersion, currentVersion),
    latestVersion,
    downloadUrl: asset ? asset.browser_download_url : null,
  };
};

// Качает zip с собранными файлами расширения и распаковывает их поверх текущей
// установленной папки расширения (csi.getSystemPath("extension")) — без
// переустановки через .zxp. После этого нужен перезапуск AE, чтобы CEP
// перечитал обновлённые файлы.
export const downloadAndInstallUpdate = async (downloadUrl: string): Promise<void> => {
  const AdmZip = require("adm-zip");

  const res = await fetch(downloadUrl);
  if (!res.ok) {
    throw new Error("Не удалось скачать обновление (" + res.status + ")");
  }
  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  const extensionDir = csi.getSystemPath("extension");
  const tmpZipPath = path.join(os.tmpdir(), "rrr_update_" + Date.now() + ".zip");
  fs.writeFileSync(tmpZipPath, buffer);

  try {
    const zip = new AdmZip(tmpZipPath);
    // Файлы записываем сами (fs.writeFileSync), а не через zip.extractAllTo —
    // та дополнительно делает chmod на каждый файл, а в защищённых папках вроде
    // Program Files это падает с EPERM и обрывает распаковку на середине,
    // оставляя расширение в наполовину обновлённом виде.
    const failedEntries: string[] = [];
    for (const entry of zip.getEntries()) {
      if (entry.isDirectory) continue;
      const targetPath = path.join(extensionDir, entry.entryName);
      try {
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, entry.getData());
      } catch (e) {
        failedEntries.push(entry.entryName);
      }
    }
    if (failedEntries.length > 0) {
      throw new Error("Не удалось обновить файлы: " + failedEntries.join(", "));
    }
  } finally {
    try { fs.unlinkSync(tmpZipPath); } catch (_) {}
  }
};

// Проверяет и, если есть более новая версия, сразу скачивает и устанавливает
// её — используется для тихой автопроверки при каждом запуске AE (см.
// main.tsx). Ошибки самой проверки (например нет интернета) не выбрасываются
// наружу, чтобы не мешать открытию панели — вызывающий код сам решает, что
// показать пользователю по результату.
export const checkAndAutoInstallUpdate = async (): Promise<{ installed: boolean; version?: string }> => {
  const result = await checkForUpdate();
  if (!result.hasUpdate || !result.downloadUrl) return { installed: false };
  await downloadAndInstallUpdate(result.downloadUrl);
  return { installed: true, version: result.latestVersion };
};
