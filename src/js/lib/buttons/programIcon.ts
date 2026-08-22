import { fs, os, path, child_process } from "../cep/node";

// Извлекает системную иконку .exe через PowerShell (System.Drawing) — тот
// же приём "сгенерировать .ps1 во temp и запустить через child_process",
// что уже используется в update.ts (elevateAndCopyDir), но без повышения
// прав — чтение ассоциированной иконки не требует доступа к защищённым
// папкам. Возвращает File (совместимый с loadAndScaleIcon из icon.ts, для
// единообразного масштабирования ≤32px по высоте, как у всех остальных
// иконок), или null, если извлечь не удалось (иконку тогда просто не
// подставляем — пользователь может выбрать любую вручную через IconPickerModal).
export async function extractProgramIconAsFile(exePath: string): Promise<File | null> {
  const stamp = Date.now();
  const scriptPath = path.join(os.tmpdir(), "rrr_icon_extract_" + stamp + ".ps1");
  const pngPath = path.join(os.tmpdir(), "rrr_icon_extract_" + stamp + ".png");
  const esc = (p: string) => p.replace(/'/g, "''");
  const psScript =
    "Add-Type -AssemblyName System.Drawing\n" +
    "$icon = [System.Drawing.Icon]::ExtractAssociatedIcon('" + esc(exePath) + "')\n" +
    "if ($icon -eq $null) { exit 1 }\n" +
    "$bitmap = $icon.ToBitmap()\n" +
    "$bitmap.Save('" + esc(pngPath) + "', [System.Drawing.Imaging.ImageFormat]::Png)\n";
  fs.writeFileSync(scriptPath, psScript, "utf8");

  try {
    child_process.execSync("powershell -NoProfile -ExecutionPolicy Bypass -File \"" + scriptPath + "\"", { windowsHide: true });
    // new Uint8Array(buf) копирует байты в свежий, обычный ArrayBuffer —
    // Buffer сам по себе типизирован как ArrayBufferLike (допускает и
    // SharedArrayBuffer), который File/Blob не принимает напрямую.
    const bytes = new Uint8Array(fs.readFileSync(pngPath));
    return new File([bytes], "icon.png", { type: "image/png" });
  } catch (_) {
    return null;
  } finally {
    try { fs.unlinkSync(scriptPath); } catch (_) {}
    try { fs.unlinkSync(pngPath); } catch (_) {}
  }
}
