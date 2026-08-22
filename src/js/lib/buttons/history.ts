import { fs, os, path } from "../cep/node";
import type { ButtonHistoryEntry } from "../../../shared/customButtons";

// Локальная история — один JSON-файл в AppData пользователя, НЕ внутри папки
// самого расширения (та перезаписывается при каждом обновлении). Каждый
// пользователь видит только свою историю — никакой синхронизации/общего
// хранилища.
function getHistoryFilePath(): string {
  const base = process.env.APPDATA || path.join(os.homedir(), "AppData", "Roaming");
  return path.join(base, "RRR", "buttonHistory.json");
}

async function readEntries(): Promise<ButtonHistoryEntry[]> {
  try {
    const raw = await fs.promises.readFile(getHistoryFilePath(), "utf8");
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e: any) {
    if (e?.code === "ENOENT") return [];
    throw e;
  }
}

async function writeEntries(entries: ButtonHistoryEntry[]): Promise<void> {
  const filePath = getHistoryFilePath();
  await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
  await fs.promises.writeFile(filePath, JSON.stringify(entries));
}

export async function loadButtonHistory(): Promise<ButtonHistoryEntry[]> {
  const entries = await readEntries();
  return entries
    .filter((e) => e && typeof e.id === "string")
    .sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));
}

export async function publishButtonToHistory(entry: ButtonHistoryEntry): Promise<void> {
  const entries = await readEntries();
  entries.push(entry);
  await writeEntries(entries);
}

// В отличие от RRR3 (общая история на Drive, ничего не удаляется) — здесь
// история личная, поэтому безвозвратное удаление имеет смысл и нужно.
export async function deleteButtonFromHistory(id: string): Promise<void> {
  const entries = await readEntries();
  await writeEntries(entries.filter((e) => e.id !== id));
}
