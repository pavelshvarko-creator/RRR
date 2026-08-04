// @include './lib/json2.js'

import { ns } from "../shared/shared";

import * as aeft from "./aeft/aeft";

//@ts-ignore
const host = typeof $ !== "undefined" ? $ : window;

// A safe way to get the app name since some versions of Adobe Apps broken BridgeTalk in various places (e.g. After Effects 24-25)
// in that case we have to do various checks per app to deterimine the app name

const getAppNameSafely = (): ApplicationName | "unknown" => {
  const compare = (a: string, b: string) => {
    return a.toLowerCase().indexOf(b.toLowerCase()) > -1;
  };
  const exists = (a: any) => typeof a !== "undefined";
  const isBridgeTalkWorking =
    typeof BridgeTalk !== "undefined" &&
    typeof BridgeTalk.appName !== "undefined";

  // ВАЖНО: BridgeTalk.appName сравниваем через тот же нормализующий compare()
  // (регистр/формат), а не точным равенством — на части версий AE значение
  // отличается по регистру/пробелам от ожидаемого "aftereffects", и точное
  // сравнение никогда не совпадало (host[ns] не выставлялся вообще никогда
  // за сессию, независимо от переустановки — это баг в логике, а не в файлах).
  // И пробуем app.appName как запасной вариант, даже если BridgeTalk "работает",
  // но вернул нераспознанное значение — раньше это вообще не проверялось.
  if (isBridgeTalkWorking) {
    const btName = BridgeTalk.appName;
    if (compare(btName, "aftereffectsbeta")) return "aftereffectsbeta";
    if (compare(btName, "aftereffects") || compare(btName, "after effects")) return "aftereffects";
  }
  if (app) {
    //@ts-ignore
    if (exists(app.appName)) {
      //@ts-ignore
      const appName: string = app.appName;
      if (compare(appName, "after effects")) return "aftereffects";
    }
  }
  return "unknown";
};

switch (getAppNameSafely()) {
  case "aftereffects":
  case "aftereffectsbeta":
    host[ns] = aeft;
    break;
}

const empty = {};
export type Scripts = typeof empty & typeof aeft;

// https://extendscript.docsforadobe.dev/interapplication-communication/bridgetalk-class.html?highlight=bridgetalk#appname
type ApplicationName = "aftereffects" | "aftereffectsbeta";
