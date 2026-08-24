import { fs, path } from "../cep/node";
import { csi } from "../utils/bolt";

// label — точный текст пункта меню Window: имя файла для ScriptUI-скрипта,
// текст <Menu> из манифеста для CEP-расширения. Это всё, что нужно
// toggleWindowMenuItem (findMenuCommandId работает по этому тексту).
export type InstalledItem = { label: string };

// Установленные ScriptUI-панели — это просто файлы .jsx/.jsxbin в папке
// Scripts/ScriptUI Panels самой AE (то, что показывается снизу в меню
// Window). SystemPath.HOST_APPLICATION даёт путь к EXE самой AE
// (...\Support Files\AfterFX.exe) — нужен dirname, а не сам путь к exe.
export async function listScriptUIPanels(): Promise<InstalledItem[]> {
  try {
    const hostAppExePath = csi.getSystemPath("hostApplication");
    const panelsDir = path.join(path.dirname(hostAppExePath), "Scripts", "ScriptUI Panels");
    const names = await fs.promises.readdir(panelsDir);
    return names
      .filter((name) => /\.(jsx|jsxbin)$/i.test(name))
      .sort((a, b) => a.localeCompare(b))
      .map((name) => ({ label: name }));
  } catch (_) {
    return [];
  }
}

async function readManifestPanelLabels(extensionsRoot: string, dirNamesToSkip: Set<string>): Promise<string[]> {
  let dirNames: string[] = [];
  try {
    dirNames = await fs.promises.readdir(extensionsRoot);
  } catch (_) {
    return [];
  }

  const labels: string[] = [];
  for (const dirName of dirNames) {
    if (dirNamesToSkip.has(dirName)) continue;
    const manifestPath = path.join(extensionsRoot, dirName, "CSXS", "manifest.xml");
    let xml = "";
    try {
      xml = await fs.promises.readFile(manifestPath, "utf8");
    } catch (_) {
      continue;
    }

    // Каждый <Extension Id="..."> внутри DispatchInfoList — со своим
    // <Type>Panel</Type> и <Menu>Название</Menu> — то, что реально
    // появляется отдельным пунктом в Window → Extensions (и тем же
    // текстом ищется через findMenuCommandId).
    const blockRe = /<Extension\s+Id="([^"]+)"\s*>([\s\S]*?)<\/Extension>/g;
    let match: RegExpExecArray | null;
    while ((match = blockRe.exec(xml))) {
      const [, id, body] = match;
      if (!/<Type>\s*Panel\s*<\/Type>/i.test(body)) continue;
      const menuMatch = body.match(/<Menu>([^<]*)<\/Menu>/i);
      const label = (menuMatch ? menuMatch[1].trim() : id.trim());
      if (label) labels.push(label);
    }
  }
  return labels;
}

// Установленные CEP-расширения (Window → Extensions → ...) — не только
// пользовательская папка extensions (там же, где мы сами), но и общая
// системная (Program Files\Common Files\Adobe\CEP\extensions) — многие
// расширения (например Animation Composer) ставятся именно туда, и без
// неё список получался неполным.
export async function listCepExtensions(): Promise<InstalledItem[]> {
  const ownExtensionDir = csi.getSystemPath("extension");
  const userExtensionsRoot = path.dirname(ownExtensionDir);
  const ownDirName = path.basename(ownExtensionDir);
  const systemExtensionsRoot = path.join(csi.getSystemPath("commonFiles"), "Adobe", "CEP", "extensions");

  const [userLabels, systemLabels] = await Promise.all([
    readManifestPanelLabels(userExtensionsRoot, new Set([ownDirName])),
    readManifestPanelLabels(systemExtensionsRoot, new Set()),
  ]);

  const seen = new Set<string>();
  const merged: InstalledItem[] = [];
  for (const label of [...userLabels, ...systemLabels]) {
    if (seen.has(label)) continue;
    seen.add(label);
    merged.push({ label });
  }
  return merged.sort((a, b) => a.label.localeCompare(b.label));
}
