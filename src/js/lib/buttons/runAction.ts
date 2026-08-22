import { evalES, evalTS, openLinkInBrowser } from "../utils/bolt";
import { child_process } from "../cep/node";
import type { CustomButtonDef } from "../../../shared/customButtons";

export async function runCustomButtonAction(def: CustomButtonDef): Promise<void> {
  const action = def.action;
  try {
    if (action.kind === "script") {
      // isGlobal: true — это произвольный пользовательский код, а не вызов
      // именованной функции из host[ns] (для чего вообще существует scoping
      // в evalES по умолчанию).
      await evalES(action.code, true);
    } else if (action.kind === "expression") {
      const result = await evalTS("applyExpressionToSelected", action.code);
      if (!result.ok) alert(result.message || "Не удалось применить выражение.");
    } else if (action.kind === "link") {
      openLinkInBrowser(action.url);
    } else if (action.kind === "program") {
      // exec (через shell, cmd.exe /c "start ...") — не execFile: execFile
      // спавнит путь напрямую как исполняемый файл, а .lnk (ярлык) — это не
      // Win32-программа, его может запустить только сам шелл через
      // ассоциацию, как двойной клик в проводнике. "" первым аргументом у
      // start — заголовок окна (стандартная идиома, чтобы путь в кавычках
      // не принимался за него).
      child_process.exec(`start "" "${action.path}"`, (err) => {
        if (err) alert(`Не удалось запустить программу: ${err.message}`);
      });
    } else if (action.kind === "folder") {
      // Тот же приём: "start" через шелл открывает путь к папке в
      // Проводнике (Explorer), как двойной клик по ней.
      child_process.exec(`start "" "${action.path}"`, (err) => {
        if (err) alert(`Не удалось открыть папку: ${err.message}`);
      });
    }
  } catch (e: any) {
    alert(`Ошибка кнопки "${def.tooltip}": ${e?.message || String(e)}`);
  }
}
