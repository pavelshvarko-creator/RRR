// ====================== СОРТИРОВКА ПРОЕКТА ДЛЯ COLLECT ======================
// Создаёт иерархию Assets/{Audios,Comps,Images,layers,Videos} + <LANG>/<WxH>
// и раскладывает элементы. Родительские (выделенные) композиции -> <LANG>/<WxH>
// по разрешению, где LANG — язык КАЖДОЙ композиции по отдельности (из
// selectedCompLangs) — так при выделении сразу нескольких языковых папок
// иерархия по языкам сохраняется, а не схлопывается в одну общую папку.
function organizeProjectForCollect(
  proj: Project,
  selectedCompLangs: { [id: number]: string }
) {
  function addFolder(name: string, parent?: FolderItem) {
    var fld = proj.items.addFolder(name);
    fld.parentFolder = parent || proj.rootFolder;
    return fld;
  }
  function contains(list: string[], value: string) {
    for (var i = 0; i < list.length; i++) if (list[i] === value) return true;
    return false;
  }
  function getExt(item: any) {
    var fileName = "";
    try { fileName = (item.file && item.file.name) ? item.file.name : item.name; }
    catch (_) { fileName = item.name; }
    var parts = fileName.toLowerCase().split('.');
    return parts.length > 1 ? parts.pop() : "";
  }

  var stillExts = [
    "ai", "bmp", "cin", "cr2", "crw", "dcr", "dng", "dpx", "eps", "erf", "exr", "gif", "heic", "heif",
    "hdr", "iff", "jpeg", "jpg", "mrw", "nef", "orf", "pcx", "pdf", "pef", "pic", "png", "ps", "psd",
    "raf", "raw", "rle", "sgi", "sr2", "srf", "svg", "tga", "tif", "tiff", "vda", "vst", "x3f"
  ];
  var audioExts = [
    "aac", "aif", "aiff", "flac", "m4a", "mp2", "mp3", "ogg", "wav", "wma"
  ];
  var videoExts = [
    "3g2", "3gp", "amc", "avi", "dmx", "dv", "f4v", "flv", "gif", "hevc", "m2p", "m2t", "m2ts", "m2v",
    "m4v", "mkv", "mod", "mov", "mp4", "mpe", "mpeg", "mpg", "mts", "mxf", "r3d", "rm", "swf", "ts",
    "vob", "wmv"
  ];

  var assets  = addFolder("Assets", proj.rootFolder);
  var fAudios = addFolder("Audios", assets);
  var fComps  = addFolder("Comps",  assets);
  var fImages = addFolder("Images", assets);
  var fLayers = addFolder("layers", assets);
  var fVideos = addFolder("Videos", assets);

  var langFolders: { [lang: string]: FolderItem } = {};
  function getLangFolder(lang: string) {
    if (!langFolders[lang]) langFolders[lang] = addFolder(lang, proj.rootFolder);
    return langFolders[lang];
  }

  var resFolders: { [key: string]: FolderItem } = {};
  function getResFolder(lang: string, w: number, h: number) {
    var key = lang + "|" + w + "x" + h;
    if (!resFolders[key]) resFolders[key] = addFolder(w + "x" + h, getLangFolder(lang));
    return resFolders[key];
  }

  var protectedIDs: { [id: number]: boolean } = {};
  var prot = [assets, fAudios, fComps, fImages, fLayers, fVideos];
  for (var pi = 0; pi < prot.length; pi++) protectedIDs[prot[pi].id] = true;

  var snapshot = [];
  for (var n = 1; n <= proj.numItems; n++) snapshot.push(proj.item(n));

  for (var i = 0; i < snapshot.length; i++) {
    var it: any = snapshot[i];
    if (protectedIDs[it.id]) continue;
    if (it instanceof FolderItem) continue;

    if (it instanceof CompItem) {
      var compLang = selectedCompLangs[it.id];
      if (compLang) it.parentFolder = getResFolder(compLang, it.width, it.height);
      else it.parentFolder = fComps;
      continue;
    }

    if (it instanceof FootageItem) {
      if (it.mainSource instanceof SolidSource || !it.file) { it.parentFolder = fLayers; continue; }
      var ext = getExt(it);
      if (it.hasAudio && !it.hasVideo) it.parentFolder = fAudios;
      else if (it.mainSource && it.mainSource.isStill) it.parentFolder = fImages;
      else if (it.hasVideo) it.parentFolder = fVideos;
      else if (contains(audioExts, ext)) it.parentFolder = fAudios;
      else if (contains(stillExts, ext)) it.parentFolder = fImages;
      else if (contains(videoExts, ext)) it.parentFolder = fVideos;
      else it.parentFolder = fLayers;
    }
  }
}

// === ЯЗЫКИ И ФУНКЦИИ ДУБЛИРОВАНИЯ ===
var LANGUAGES: { [code: string]: string } = {
  "AR": "Arabic",
  "DA": "Danish",
  "DE": "German",
  "EN": "English",
  "ES": "Spanish",
  "FI": "Finnish",
  "FR": "French",
  "IT": "Italian",
  "JA": "Japanese",
  "KO": "Korean",
  "NL": "Dutch",
  "SV": "Swedish",
  "TH": "Thai"
};

// Убирает существующий суффикс языка ("_ES" и т.п.), если имя уже им заканчивается —
// чтобы при повторном дублировании не накапливалось "_EN_ES_FR...".
function stripLanguageSuffix(name: string) {
  var m = name.match(/^(.*)_([A-Za-z]{2})$/);
  if (m && LANGUAGES.hasOwnProperty(m[2].toUpperCase())) return m[1];
  return name;
}

// Достаёт код языка из суффикса имени композиции ("V1__1920x1080_EN" -> "EN").
// Возвращает null, если распознаваемого суффикса нет.
function extractLanguageCodeFromName(name: string) {
  var m = name.match(/^(.*)_([A-Za-z]{2})$/);
  if (m && LANGUAGES.hasOwnProperty(m[2].toUpperCase())) return m[2].toUpperCase();
  return null;
}

function duplicateFolderWithLanguage(sourceFolderItem: FolderItem, newLang: string, currentLang: string) {
  var proj = app.project;
  var sourceFolders: FolderItem[] = [];
  var sourceComps: CompItem[] = [];
  var sourceCompMap: { [id: number]: CompItem } = {};
  var folderMap: { [id: number]: FolderItem } = {};
  var compMap: { [id: number]: CompItem } = {};
  var sourceItemCount = proj.numItems;

  // Снимок исходного дерева: новые элементы в этот список никогда не попадут.
  function collectSourceItems(folder: FolderItem) {
    for (var i = 1; i <= sourceItemCount; i++) {
      var item = proj.item(i);
      if (item instanceof FolderItem) {
        var parent = item.parentFolder;
        if (parent === folder) {
          sourceFolders.push(item);
          collectSourceItems(item);
        }
      } else if (item instanceof CompItem && item.parentFolder === folder) {
        sourceComps.push(item);
      }
    }
  }

  collectSourceItems(sourceFolderItem);
  if (sourceComps.length === 0) {
    alert("В выбранной папке нет композиций!");
    return null;
  }

  // Расширяем снимок до полного графа: каждая дочерняя композиция,
  // на которую ссылается композиция языковой папки, тоже копируется.
  function collectLinkedComps(comp: CompItem) {
    if (sourceCompMap[comp.id]) return;
    sourceCompMap[comp.id] = comp;
    sourceComps.push(comp);

    for (var layerIdx = 1; layerIdx <= comp.numLayers; layerIdx++) {
      var sourceLayer = comp.layer(layerIdx);
      if (sourceLayer instanceof AVLayer && sourceLayer.source &&
        sourceLayer.source instanceof CompItem) {
        collectLinkedComps(sourceLayer.source);
      }
    }
  }

  var rootComps = sourceComps.slice(0);
  var rootCompIDs: { [id: number]: boolean } = {};
  for (var ri = 0; ri < rootComps.length; ri++) rootCompIDs[rootComps[ri].id] = true;

  sourceComps = [];
  for (var rootIndex = 0; rootIndex < rootComps.length; rootIndex++) {
    collectLinkedComps(rootComps[rootIndex]);
  }

  // Имя новой языковой папки уникально среди соседей.
  var parentFolder = sourceFolderItem.parentFolder;
  var baseFolderName = newLang;
  var folderName = baseFolderName;
  var suffixIndex = 1;
  var nameTaken = true;
  while (nameTaken) {
    nameTaken = false;
    for (var f = 1; f <= sourceItemCount; f++) {
      var existingFolder = proj.item(f);
      if (existingFolder instanceof FolderItem &&
        existingFolder.parentFolder === parentFolder &&
        existingFolder.name === folderName) {
        nameTaken = true;
        folderName = baseFolderName + "_" + suffixIndex;
        suffixIndex++;
        break;
      }
    }
  }

  var newFolder = proj.items.addFolder(folderName);
  newFolder.parentFolder = parentFolder;
  folderMap[sourceFolderItem.id] = newFolder;

  // Копируем зафиксированные папки, сохраняя пути и имена как есть — суффикс
  // языка добавляется только к именам композиций, папки его не получают.
  // stripLanguageSuffix на случай, если имя папки уже случайно содержит старый
  // суффикс (например от предыдущей версии скрипта) — чтобы не тащить его дальше.
  for (var sf = 0; sf < sourceFolders.length; sf++) {
    var sourceFolder = sourceFolders[sf];
    var sourceParent = sourceFolder.parentFolder;
    var targetParent = folderMap[sourceParent.id];
    if (targetParent) {
      var copiedFolder = proj.items.addFolder(stripLanguageSuffix(sourceFolder.name));
      copiedFolder.parentFolder = targetParent;
      folderMap[sourceFolder.id] = copiedFolder;
    }
  }

  // Дублируем все композиции графа. Корневым (лежащим прямо в языковой папке)
  // присваиваем суффикс нового языка — например "_ES". Вложенные precomp'ы,
  // подтянутые как зависимости, имена не меняют.
  for (var sc = 0; sc < sourceComps.length; sc++) {
    var sourceComp = sourceComps[sc];
    var dupComp = sourceComp.duplicate();
    dupComp.name = rootCompIDs[sourceComp.id]
      ? (stripLanguageSuffix(sourceComp.name) + "_" + newLang)
      : sourceComp.name;
    compMap[sourceComp.id] = dupComp;
    // Композиции из EN получают зеркальный путь внутри новой папки.
    // Внешние дочерние композиции, например из Assets/Comps,
    // остаются в своей исходной папке.
    var compTargetFolder = folderMap[sourceComp.parentFolder.id] || sourceComp.parentFolder;
    dupComp.parentFolder = compTargetFolder;
  }

  // Теперь заменяем все ссылки графа на соответствующие новые композиции.
  for (var dc = 0; dc < sourceComps.length; dc++) {
    var duplicatedComp = compMap[sourceComps[dc].id];
    for (var layerIdx = 1; layerIdx <= duplicatedComp.numLayers; layerIdx++) {
      var layerItem = duplicatedComp.layer(layerIdx);
      if (layerItem instanceof AVLayer && layerItem.source &&
        layerItem.source instanceof CompItem && compMap[layerItem.source.id]) {
        layerItem.replaceSource(compMap[layerItem.source.id], false);
      }
    }
  }

  return newFolder;
}

// === СОХРАНЕНИЕ ЗНАЧЕНИЙ EN / NAME МЕЖДУ ЗАПУСКАМИ ===
var SETTINGS_SECTION = "RRR_Script";
var SETTINGS_KEY_LANG = "lang";
var SETTINGS_KEY_CREATOR = "creator";
var SETTINGS_KEY_ICON_MODE = "iconMode";

// Тумблер в гайде: показывать кнопки панели как PNG-иконки (по умолчанию)
// или как стандартные текстовые кнопки (как в старом ScriptUI, если бы
// иконки не были найдены). Настройка общая на всё расширение — сохраняется
// в app.settings, чтобы её видели и основная панель, и гайд.
export function getIconModeSetting(): boolean {
  if (app.settings.haveSetting(SETTINGS_SECTION, SETTINGS_KEY_ICON_MODE)) {
    return app.settings.getSetting(SETTINGS_SECTION, SETTINGS_KEY_ICON_MODE) !== "0";
  }
  return true;
}

export function setIconModeSetting(useIcons: boolean) {
  app.settings.saveSetting(SETTINGS_SECTION, SETTINGS_KEY_ICON_MODE, useIcons ? "1" : "0");
}

// При каждом новом запуске язык всегда начинается с EN. Name запоминается между запусками.
export function getSavedCreatorName(): string {
  if (app.settings.haveSetting(SETTINGS_SECTION, SETTINGS_KEY_CREATOR)) {
    return app.settings.getSetting(SETTINGS_SECTION, SETTINGS_KEY_CREATOR);
  }
  return "";
}

function saveLangCreatorSettings(lang: string, creator: string) {
  app.settings.saveSetting(SETTINGS_SECTION, SETTINGS_KEY_LANG, lang);
  app.settings.saveSetting(SETTINGS_SECTION, SETTINGS_KEY_CREATOR, creator);
}

export function saveCreatorName(name: string, lang: string) {
  saveLangCreatorSettings(lang, name);
}

// Выбор нового языка в дропдауне: дублирует выделенную (двубуквенную) папку под новый язык.
export function onLanguageChange(newLang: string, currentLang: string, creatorName: string): boolean {
  var proj = app.project;
  var selectedItems = proj.selection;

  // Ищем выбранную папку с двубуквенным именем
  var selectedFolder: FolderItem | null = null;
  for (var si = 0; si < selectedItems.length; si++) {
    var item = selectedItems[si];
    if (item instanceof FolderItem && item.name.length === 2) {
      selectedFolder = item;
      break;
    }
  }

  if (!selectedFolder) {
    alert("Пожалуйста, выделите папку с двубуквенным названием языка (например EN, ES).");
    return false;
  }

  var success = false;
  app.beginUndoGroup("Duplicate Language Folder");
  try {
    var newFolderItem = duplicateFolderWithLanguage(selectedFolder, newLang, currentLang);
    if (newFolderItem) {
      saveLangCreatorSettings(newLang, creatorName);
      alert("✅ Папка \"" + newLang + "\" создана с дублированными композициями.");
      success = true;
    }
  } catch (e: any) {
    alert("Ошибка: " + e.toString());
  } finally {
    app.endUndoGroup();
  }
  return success;
}

// === Версионный формат имён: V?__WxH ===
var RESOLUTIONS: { [key: string]: { w: number; h: number } } = {
  "9x16": { w: 1080, h: 1920 },
  "4x3":  { w: 1080, h: 1350 },
  "1x1":  { w: 1080, h: 1080 },
  "16x9": { w: 1920, h: 1080 }
};

function getVersionFromName(name: string) {
  var m = name.match(/[Vv](\d+)/);
  return m ? m[1] : "1";
}

// Цвет-лейбл композиции по номеру версии в имени: V1 = Label 1, V2 = Label 2,
// ... V16 = Label 16, дальше цикл заново (V17 = Label 1 и т.д.) — в AE ровно
// 16 цветов-лейблов. Применяется при переименовании (кнопки ресайза), при
// Collect и при Render — везде, где в имени есть "V?".
function applyVersionLabel(comp: CompItem) {
  var v = parseInt(getVersionFromName(comp.name), 10);
  if (isNaN(v) || v < 1) return;
  comp.label = ((v - 1) % 16) + 1;
}

// Сканирует ПРЯМЫХ соседей (parentFolder) на такое же разрешение и находит
// максимальный номер версии среди них — новый дубликат получает следующий
// номер относительно того, что уже есть в папке, а не относительно версии
// самой выделенной (дублируемой) композиции.
function getNextVersionInFolder(folder: FolderItem | null, w: number, h: number): number {
  var maxVersion = 0;
  for (var i = 1; i <= app.project.numItems; i++) {
    var it = app.project.item(i);
    if (it instanceof CompItem && it.parentFolder === folder && it.width === w && it.height === h) {
      var v = parseInt(getVersionFromName(it.name), 10);
      if (!isNaN(v) && v > maxVersion) maxVersion = v;
    }
  }
  return maxVersion + 1;
}

function buildProjectName(version: string, w: number, h: number) {
  return "V" + version + "__" + w + "x" + h;
}

function buildTimelineName(oldName: string, w: number, h: number) {
  return oldName + "__" + w + "x" + h;
}

// Определяет язык из иерархии папок: ближайшая (на любой глубине вверх от
// композиции) папка с именем — двубуквенным кодом языка (EN/ES/...). Если
// такой папки нет (композиция в корне или во вложенных не-языковых папках) —
// используется defaultLang (по умолчанию EN).
function getLanguageFromFolderHierarchy(folder: FolderItem | null, defaultLang?: string): string {
  var current = folder;
  while (current && current !== app.project.rootFolder) {
    var code = current.name.toUpperCase();
    if (code.length === 2 && LANGUAGES.hasOwnProperty(code)) return code;
    current = current.parentFolder;
  }
  return defaultLang || "EN";
}

// Находит папку с именем name внутри parent или создаёт её, если такой ещё нет.
function getOrCreateFolder(name: string, parent: FolderItem): FolderItem {
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
    var item = proj.item(i);
    if (item instanceof FolderItem && item.parentFolder === parent && item.name === name) {
      return item;
    }
  }
  var fld = proj.items.addFolder(name);
  fld.parentFolder = parent;
  return fld;
}

// Находит (или создаёт, если ещё нет) иерархию <lang>/<WxH> в корне проекта —
// та же структура, что и organizeProjectForCollect использует при сборе.
function getOrCreateResolutionFolder(lang: string, w: number, h: number): FolderItem {
  var proj = app.project;
  var langFolder = getOrCreateFolder(lang, proj.rootFolder);
  return getOrCreateFolder(w + "x" + h, langFolder);
}

// Собирает граф композиции: сама композиция + все вложенные precomp'ы,
// на которые ссылаются её слои (рекурсивно, без дублей).
function collectCompGraph(rootComp: CompItem): CompItem[] {
  var seenIDs: { [id: number]: boolean } = {};
  var result: CompItem[] = [];
  function walk(comp: CompItem) {
    if (seenIDs[comp.id]) return;
    seenIDs[comp.id] = true;
    result.push(comp);
    for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);
      if (layer instanceof AVLayer && layer.source && layer.source instanceof CompItem) {
        walk(layer.source);
      }
    }
  }
  walk(rootComp);
  return result;
}

// Дублирует ВЕСЬ граф композиции (саму композицию + все вложенные precomp'ы)
// независимой копией — родительские связи (layer.source) пересобираются
// заново между дублями, каждый дубль кладётся рядом со своим оригиналом.
// Корневой дубль называется по полной формуле V<newVersion>__WxH_LANG,
// дочерние получают суффикс "_V<newVersion>" к своему текущему имени.
function duplicateCompVersionGraph(sourceComp: CompItem, newVersion: number, lang: string, w: number, h: number): CompItem {
  var graph = collectCompGraph(sourceComp);
  var compMap: { [id: number]: CompItem } = {};

  for (var i = 0; i < graph.length; i++) {
    var orig = graph[i];
    var dup = orig.duplicate();
    dup.parentFolder = orig.parentFolder;
    if (orig === sourceComp) {
      dup.name = buildProjectName(String(newVersion), w, h) + "_" + lang;
    } else {
      dup.name = orig.name + "_V" + newVersion;
    }
    compMap[orig.id] = dup;
  }

  for (var j = 0; j < graph.length; j++) {
    var origComp = graph[j];
    var dupComp = compMap[origComp.id];
    for (var li = 1; li <= dupComp.numLayers; li++) {
      var layer = dupComp.layer(li);
      if (layer instanceof AVLayer && layer.source && layer.source instanceof CompItem && compMap[layer.source.id]) {
        layer.replaceSource(compMap[layer.source.id], false);
      }
    }
  }

  return compMap[sourceComp.id];
}

// Общая логика для всех 4 кнопок ресайза, когда разрешение выделенной
// композиции УЖЕ совпадает с целевым разрешением кнопки: вместо кропа/билда
// либо переименовываем композицию по формуле V?__WxH_LANG (если имя ещё не
// соответствует формуле), либо, если оно уже соответствует, создаём
// независимый дубликат всего графа со следующим номером версии.
// Без своей undo-группы — её открывают вызывающие обёртки (одиночная/массовая).
function renameOrVersionCompCore(sourceComp: CompItem, key: string) {
  var target = RESOLUTIONS[key];
  var lang = getLanguageFromFolderHierarchy(sourceComp.parentFolder);
  var expectedName = buildProjectName(getVersionFromName(sourceComp.name), target.w, target.h) + "_" + lang;
  var destFolder = getOrCreateResolutionFolder(lang, target.w, target.h);

  if (sourceComp.name === expectedName) {
    var newVersion = getNextVersionInFolder(sourceComp.parentFolder, target.w, target.h);
    var dupRoot = duplicateCompVersionGraph(sourceComp, newVersion, lang, target.w, target.h);
    dupRoot.parentFolder = destFolder;
    applyVersionLabel(dupRoot);
    dupRoot.openInViewer();
  } else {
    sourceComp.name = expectedName;
    sourceComp.parentFolder = destFolder;
    applyVersionLabel(sourceComp);
    sourceComp.openInViewer();
  }
}

// Одиночная композиция — своя undo-группа.
function renameOrVersionComp(sourceComp: CompItem, key: string) {
  app.beginUndoGroup("Rename/Version " + key);
  try {
    renameOrVersionCompCore(sourceComp, key);
  } finally {
    app.endUndoGroup();
  }
}

// Массовое переименование/версия: несколько выделенных композиций одного
// разрешения обрабатываются каждая по своим собственным версии/языку (из
// собственной иерархии папок), но всё — в ОДНОЙ undo-группе, чтобы один
// Ctrl+Z отменял всю пачку целиком.
function renameOrVersionComps(comps: CompItem[], key: string) {
  app.beginUndoGroup("Rename/Version " + key + " (Batch)");
  try {
    for (var i = 0; i < comps.length; i++) {
      renameOrVersionCompCore(comps[i], key);
    }
  } finally {
    app.endUndoGroup();
  }
}

// Дублирует композицию и обрезает/дополняет сверху-снизу до targetH,
// сохраняя положение всех слоёв относительно центра кадра. Ширина не меняется.
function cropResizeComp(sourceComp: CompItem, targetH: number) {
  var newComp = sourceComp.duplicate();
  var oldH = newComp.height;
  var diff = (targetH - oldH) / 2;
  var tNull = newComp.layers.addNull();
  tNull.transform.position.setValue([newComp.width / 2, oldH / 2]);
  var parents: any[] = [];
  for (var i = 1; i <= newComp.numLayers; i++) {
    var lyr = newComp.layer(i);
    if (lyr === tNull) continue;
    parents[i] = lyr.parent;
    if (lyr.parent === null) lyr.parent = tNull;
  }
  newComp.height = targetH;
  var curP = tNull.transform.position.value;
  tNull.transform.position.setValue([curP[0], curP[1] + diff]);
  for (var j = 1; j <= newComp.numLayers; j++) {
    var l = newComp.layer(j);
    if (l !== tNull && l.parent === tNull) l.parent = parents[j];
  }
  tNull.remove();
  return newComp;
}

function unlockAllLayers(comp: CompItem) {
  for (var i = 1; i <= comp.numLayers; i++) {
    if (comp.layer(i).locked) comp.layer(i).locked = false;
  }
}

// Клик (без модификаторов) на 9:16 / 4:3 / 1:1: работаем ТОЛЬКО с выделением
// в панели Project — дублируем, кропаем, переименовываем по формуле V?__WxH.
function processCropResolutionProject(key: string) {
  var target = RESOLUTIONS[key];
  var proj = app.project;

  // Среди выделения отдельно собираем ВСЕ композиции, чьё разрешение уже
  // совпадает с целевым (для массового переименования/версии), и отдельно
  // запоминаем первую композицию другого разрешения (для обычного кропа).
  var selection = proj.selection;
  var matchingComps: CompItem[] = [];
  var sourceComp: CompItem | null = null;
  for (var i = 0; i < selection.length; i++) {
    if (selection[i] instanceof CompItem) {
      var selComp = selection[i] as CompItem;
      if (selComp.width === target.w && selComp.height === target.h) {
        matchingComps.push(selComp);
      } else if (!sourceComp) {
        sourceComp = selComp;
      }
    }
  }

  // Разрешение выделенной(ых) композиции(й) уже совпадает с целевым — вместо
  // кропа переименовываем по формуле V?__WxH_LANG или создаём новую версию
  // (см. renameOrVersionComp/renameOrVersionComps) для каждой из них.
  if (matchingComps.length > 0) {
    renameOrVersionComps(matchingComps, key);
    return;
  }

  if (!sourceComp) {
    alert("Выделите композицию в панели Project!");
    return;
  }

  var version = getVersionFromName(sourceComp.name);
  app.beginUndoGroup("Resize " + key);
  unlockAllLayers(sourceComp);
  var newComp2 = cropResizeComp(sourceComp, target.h);
  newComp2.name = buildProjectName(version, target.w, target.h);
  newComp2.openInViewer();
  app.endUndoGroup();
}

// Ctrl+Click на 9:16 / 4:3 / 1:1: работаем ТОЛЬКО с выделенным слоем
// на таймлайне (source которого — композиция) — заменяем композицию в слое.
function processCropResolutionTimeline(key: string) {
  var target = RESOLUTIONS[key];
  var proj = app.project;
  var active = proj.activeItem;

  if (!(active && active instanceof CompItem && active.selectedLayers.length === 1)) {
    alert("Выделите один слой на таймлайне (source которого — композиция)!");
    return;
  }
  var selLayer = active.selectedLayers[0];
  if (!(selLayer instanceof AVLayer) || !selLayer.source || !(selLayer.source instanceof CompItem)) {
    alert("Выделенный слой на таймлайне не является композицией.");
    return;
  }
  var srcComp = selLayer.source;
  if (srcComp.width === target.w && srcComp.height === target.h) {
    alert("Эта композиция уже в разрешении " + target.w + "x" + target.h + " — менять нечего.");
    return;
  }

  app.beginUndoGroup("Resize " + key);
  unlockAllLayers(srcComp);
  var newComp = cropResizeComp(srcComp, target.h);
  newComp.name = buildTimelineName(srcComp.name, target.w, target.h);
  selLayer.replaceSource(newComp, false);
  alert("✅ Готово!\nСоздана копия \"" + newComp.name + "\" и подставлена в выделенный слой.\nОригинал не изменён.");
  app.endUndoGroup();
}

// Специальная механика (16:9, 1:1): работает только с исходником 1080x1350 (4:3).
// Создаёт композицию с двумя слоями (нижний — скейл+блюр без звука, верхний — скейл),
// разрешение результата зависит от targetKey. Скейл нижнего (блюр-фон) слоя
// тоже свой на каждый формат — для 1:1 канвас у́же, поэтому меньше 200%.
var BOTTOM_LAYER_SCALE: { [k: string]: number } = { "16x9": 200, "1x1": 101 };

function buildSpecialBuildComp(sourceComp: CompItem, newName: string, targetKey: string) {
  var proj = app.project;
  var target = RESOLUTIONS[targetKey];
  var bottomScale = BOTTOM_LAYER_SCALE[targetKey] || 200;
  var newComp = proj.items.addComp(newName, target.w, target.h, sourceComp.pixelAspect, sourceComp.duration, sourceComp.frameRate);
  var layerBottom = newComp.layers.add(sourceComp);
  layerBottom.property("Transform").property("Scale").setValue([bottomScale, bottomScale]);
  layerBottom.audioEnabled = false;
  var blur = layerBottom.property("Effects").addProperty("ADBE Fast Blur");
  if (blur) blur.property("Blurriness").setValue(40);
  var layerTop = newComp.layers.add(sourceComp);
  layerTop.property("Transform").property("Scale").setValue([80, 80]);
  return newComp;
}

var SPECIAL_BUILD_LABELS: { [k: string]: string } = { "16x9": "16:9", "1x1": "1:1" };

// Клик (без модификаторов) на 1:1 / 16:9: работаем ТОЛЬКО с выделением
// в панели Project — билдим блюр-фон композицию из исходника 1080x1350.
function processSpecialBuildProject(targetKey: string) {
  var proj = app.project;
  var target = RESOLUTIONS[targetKey];
  var label = SPECIAL_BUILD_LABELS[targetKey] || targetKey;

  var selection = proj.selection;
  var matchingComps: CompItem[] = [];
  var sourceComp: CompItem | null = null;
  for (var i = 0; i < selection.length; i++) {
    if (selection[i] instanceof CompItem) {
      var selComp = selection[i] as CompItem;
      if (selComp.width === target.w && selComp.height === target.h) {
        matchingComps.push(selComp);
      } else if (!sourceComp) {
        sourceComp = selComp;
      }
    }
  }

  if (matchingComps.length > 0) {
    renameOrVersionComps(matchingComps, targetKey);
    return;
  }

  if (!sourceComp) {
    alert("Выделите композицию 1080x1350 (4:3) в панели Project!");
    return;
  }
  if (!(sourceComp.width === 1080 && sourceComp.height === 1350)) {
    alert("Кнопка " + label + " работает только с композицией 1080x1350 (4:3). Выделите композицию с этим разрешением.");
    return;
  }
  var version = getVersionFromName(sourceComp.name);
  app.beginUndoGroup("Special Build " + label);
  unlockAllLayers(sourceComp);
  var newName2 = buildProjectName(version, target.w, target.h);
  var newComp2 = buildSpecialBuildComp(sourceComp, newName2, targetKey);
  newComp2.openInViewer();
  app.endUndoGroup();
}

// Ctrl+Click на 1:1 / 16:9: работаем ТОЛЬКО с выделенным слоем на таймлайне
// (source которого — композиция 1080x1350) — заменяем композицию в слое.
function processSpecialBuildTimeline(targetKey: string) {
  var proj = app.project;
  var target = RESOLUTIONS[targetKey];
  var label = SPECIAL_BUILD_LABELS[targetKey] || targetKey;
  var active = proj.activeItem;

  if (!(active && active instanceof CompItem && active.selectedLayers.length === 1)) {
    alert("Выделите один слой на таймлайне (source которого — композиция 1080x1350)!");
    return;
  }
  var selLayer = active.selectedLayers[0];
  if (!(selLayer instanceof AVLayer) || !selLayer.source || !(selLayer.source instanceof CompItem)) {
    alert("Выделенный слой на таймлайне не является композицией.");
    return;
  }
  var srcComp = selLayer.source;
  if (!(srcComp.width === 1080 && srcComp.height === 1350)) {
    alert("Кнопка " + label + " работает только с композицией 1080x1350 (4:3). Выберите слой с таким источником.");
    return;
  }

  app.beginUndoGroup("Special Build " + label);
  unlockAllLayers(srcComp);
  var newName = buildTimelineName(srcComp.name, target.w, target.h);
  var newComp = buildSpecialBuildComp(srcComp, newName, targetKey);
  selLayer.replaceSource(newComp, false);
  alert("✅ Готово!\nСоздана копия \"" + newName + "\" и подставлена в выделенный слой.\nОригинал не изменён.");
  app.endUndoGroup();
}

// Alt+Click на 9:16: создаёт пустую референсную композицию 1080x1920 с гайд-слоем
// сейфзоны — двумя тонкими линиями на расстоянии 1350px друг от друга, симметрично
// относительно центра. Это то, что остаётся видимым после кропа под 1080x1350 по высоте.
function createSafeZoneGuideComp() {
  var proj = app.project;
  var compW = 1080, compH = 1920, frameRate = 30, durationSec = 20;
  var safeZoneHeight = 1350;
  var lineColor = [0x06 / 255, 0x6C / 255, 0xE7 / 255]; // 066CE7
  var lineThickness = 4;

  var comp = proj.items.addComp("V1__1080x1920_EN", compW, compH, 1, durationSec, frameRate);
  comp.parentFolder = getOrCreateResolutionFolder("EN", compW, compH);

  var shapeLayer = comp.layers.addShape();
  shapeLayer.name = "Safe Zone Guide";
  shapeLayer.property("Transform").property("Anchor Point").setValue([0, 0]);
  shapeLayer.property("Transform").property("Position").setValue([compW / 2, compH / 2]);
  shapeLayer.property("Transform").property("Opacity").setValue(24);

  var rootContents = shapeLayer.property("Contents");

  function addGuideLine(name: string, offsetYFromCenter: number) {
    var group = rootContents.addProperty("ADBE Vector Group");
    group.name = name;
    var groupContents = group.property("Contents");

    var rect = groupContents.addProperty("ADBE Vector Shape - Rect");
    rect.property("Size").setValue([compW, lineThickness]);
    rect.property("Position").setValue([0, 0]);

    var fill = groupContents.addProperty("ADBE Vector Graphic - Fill");
    fill.property("Color").setValue(lineColor);

    group.property("Transform").property("Position").setValue([0, offsetYFromCenter]);
  }

  addGuideLine("Line Top", -safeZoneHeight / 2);
  addGuideLine("Line Bottom", safeZoneHeight / 2);

  // Скрыт из таймлайна (shy) и помечен как Guide Layer — виден только в
  // вьювере при монтаже, но не попадает в рендер/вложенные композиции.
  // ВАЖНО: locked ставим ПОСЛЕДНИМ — AE не даёт менять guideLayer/shy
  // на уже залоченном слое.
  shapeLayer.shy = true;
  shapeLayer.guideLayer = true;
  comp.hideShyLayers = true;
  shapeLayer.locked = true;

  comp.openInViewer();
  return comp;
}

// Alt+Click на 4:3: создаёт пустую композицию 1080x1350 — без гайд-слоёв,
// в отличие от createSafeZoneGuideComp (Alt+Click на 9:16).
function createEmpty4x3Comp() {
  var proj = app.project;
  var target = RESOLUTIONS["4x3"];
  var frameRate = 30, durationSec = 20;
  var name = buildProjectName("1", target.w, target.h) + "_EN";

  var comp = proj.items.addComp(name, target.w, target.h, 1, durationSec, frameRate);
  comp.parentFolder = getOrCreateResolutionFolder("EN", target.w, target.h);
  comp.openInViewer();
  return comp;
}

// Клик по кнопкам 9:16 / 4:3: Click — resize in project, Ctrl+Click — resize in timeline,
// Alt+Click на 9:16 — создать референсную комп с гайдами сейфзоны,
// Alt+Click на 4:3 — создать пустую комп 1080x1350 без гайд-слоёв.
export function cropButtonClick(key: string, ctrlKey: boolean, altKey: boolean) {
  if (key === "9x16" && altKey) {
    app.beginUndoGroup("Create Safe Zone Guide Comp");
    try { createSafeZoneGuideComp(); }
    catch (e: any) { alert("Error: " + e.toString()); }
    finally { app.endUndoGroup(); }
    return;
  }
  if (key === "4x3" && altKey) {
    app.beginUndoGroup("Create Empty 4x3 Comp");
    try { createEmpty4x3Comp(); }
    catch (e: any) { alert("Error: " + e.toString()); }
    finally { app.endUndoGroup(); }
    return;
  }
  if (ctrlKey) {
    processCropResolutionTimeline(key);
  } else {
    processCropResolutionProject(key);
  }
}

// Кнопки 1:1 / 16:9 — блюр-фон build (та же механика для обеих).
// Click — resize in project, Ctrl+Click — resize in timeline (как у 9:16/4:3).
export function specialBuildButtonClick(targetKey: string, ctrlKey: boolean) {
  if (ctrlKey) {
    processSpecialBuildTimeline(targetKey);
  } else {
    processSpecialBuildProject(targetKey);
  }
}

function escName(n: string) { return n.replace(/\\/g, "\\\\").replace(/"/g, "\\\""); }

// Render/Collect должны работать одинаково и при выделении композиций напрямую,
// и при выделении папок с композициями — в этом случае берутся ВСЕ композиции
// внутри такой папки (рекурсивно, включая вложенные подпапки).
function collectCompsInFolder(folder: FolderItem, seenIDs: { [id: number]: boolean }, result: CompItem[]) {
  for (var i = 1; i <= app.project.numItems; i++) {
    var it = app.project.item(i);
    if (it.parentFolder !== folder) continue;
    if (it instanceof CompItem) {
      if (!seenIDs[it.id]) { seenIDs[it.id] = true; result.push(it); }
    } else if (it instanceof FolderItem) {
      collectCompsInFolder(it, seenIDs, result);
    }
  }
}

function getCompsFromSelection(selection: any[]) {
  var seenIDs: { [id: number]: boolean } = {};
  var result: CompItem[] = [];
  for (var i = 0; i < selection.length; i++) {
    var it = selection[i];
    if (it instanceof CompItem) {
      if (!seenIDs[it.id]) { seenIDs[it.id] = true; result.push(it); }
    } else if (it instanceof FolderItem) {
      collectCompsInFolder(it, seenIDs, result);
    }
  }
  return result;
}

function getOrAddEffect(layer: AVLayer, matchName: string, effectName: string, defaultValue: any) {
  var fx = layer.property("ADBE Effect Parade") as PropertyGroup;
  if (!fx) return null;
  for (var i = 1; i <= fx.numProperties; i++) {
    if (fx.property(i).name === effectName) return fx.property(i);
  }
  var e = fx.addProperty(matchName);
  if (!e) return null;
  e.name = effectName;
  try {
    if (matchName === "ADBE Point Control") e.property("ADBE Point Control-0001").setValue(defaultValue);
    else if (matchName === "ADBE Slider Control") e.property("ADBE Slider Control-0001").setValue(defaultValue);
  } catch (_) {}
  return e;
}

function applyControllers() {
  var proj = app.project;
  if (!proj) { alert("No project."); return; }
  var active = app.project.activeItem;

  var selectedComp: CompItem | null = null;
  var selectedLayerOnTimeline: AVLayer | null = null;

  if (active && active instanceof CompItem && active.selectedLayers.length === 1) {
    selectedLayerOnTimeline = active.selectedLayers[0] as AVLayer;
    if (!(selectedLayerOnTimeline instanceof AVLayer) || !selectedLayerOnTimeline.source || !(selectedLayerOnTimeline.source instanceof CompItem)) {
      alert("Selected layer is not a precomp.");
      return;
    }
    selectedComp = selectedLayerOnTimeline.source;

  } else if (app.project.selection.length === 1 && app.project.selection[0] instanceof CompItem) {
    selectedComp = app.project.selection[0] as CompItem;
  } else {
    alert("Select exactly ONE precomp layer on the timeline OR ONE composition in the Project panel.");
    return;
  }

  var sourceComp = selectedComp;
  var newSourceComp = sourceComp.duplicate();
  newSourceComp.name = sourceComp.name + " (Ctrl)";

  if (selectedLayerOnTimeline) {
    selectedLayerOnTimeline.replaceSource(newSourceComp, false);
  }

  var innerComp = newSourceComp;
  var outerComp = app.project.activeItem as CompItem;

  if (!selectedLayerOnTimeline) {
    alert("Done!\nClean source created in Project panel.");
    return;
  }

  var outerLayerIndex = selectedLayerOnTimeline.index;

  // Отдельный контроллер Position (Point Control) и Scale (Slider Control,
  // пропорциональный — одно число сразу на X и Y) на КАЖДЫЙ непривязанный
  // (без parent) слой внутри прекомпа, имя контроллера — по имени слоя.
  // Position — аддитивный офсет, Scale — множитель (100 = без изменений).
  var count = 0;
  for (var i = 1; i <= innerComp.numLayers; i++) {
    var layer = innerComp.layer(i);
    if (layer instanceof CameraLayer || layer instanceof LightLayer) continue;
    if (layer.parent !== null) continue;
    if (!layer.hasVideo) continue;
    var transform = layer.property("ADBE Transform Group") as PropertyGroup;
    if (!transform) continue;
    var pos = transform.property("ADBE Position");
    var scl = transform.property("ADBE Scale");
    if (!pos || !scl) continue;

    var layerLabel = layer.name;
    var posCtrlName = layerLabel + "_Position";
    var sclCtrlName = layerLabel + "_Scale";
    getOrAddEffect(selectedLayerOnTimeline, "ADBE Point Control", posCtrlName, [0, 0]);
    getOrAddEffect(selectedLayerOnTimeline, "ADBE Slider Control", sclCtrlName, 100);

    var posExpr = 'var p = comp("' + escName(outerComp.name) + '").layer(' + outerLayerIndex + ').effect("' + escName(posCtrlName) + '")("Point");\n' +
      'value + (value.length==3 ? [p[0], p[1], 0] : p);';
    var sclExpr = 'var s = comp("' + escName(outerComp.name) + '").layer(' + outerLayerIndex + ').effect("' + escName(sclCtrlName) + '")("Slider")/100;\n' +
      'value * s;';
    pos.expression = posExpr;
    scl.expression = sclExpr;
    count++;
  }

  alert("Done!\nReplaced with clean source & Controllers added.\n" + count + " unparented layer(s) got their own Position/Scale controllers.");
}

// === ЭКСПОРТ ПАРАМЕТРОВ СО КЛЮЧАМИ В ESSENTIAL GRAPHICS ===
// Берёт выделенные precomp-слои на таймлайне, находит все параметры со ключами
// и добавляет их в Essential Graphics их собственной (внутренней) композиции.
function hasKeyframes(prop: Property) {
  try {
    return prop.numKeys > 0;
  } catch (e) {
    return false;
  }
}

function collectKeyframedProps(comp: CompItem) {
  var props: any[] = [];
  for (var i = 1; i <= comp.numLayers; i++) {
    var layer = comp.layer(i);
    if (layer instanceof CameraLayer || layer instanceof LightLayer) continue;
    if (!layer.hasVideo) continue;

    // Transform параметры
    var transform = layer.property("ADBE Transform Group") as PropertyGroup;
    if (transform) {
      var transProps = [
        ["ADBE Position", "Position"],
        ["ADBE Anchor Point", "Anchor Point"],
        ["ADBE Scale", "Scale"],
        ["ADBE Rotation", "Rotation"],
        // У 3D-слоёв вместо единого "ADBE Rotation" используются отдельные
        // X/Y/Z Rotate + Orientation — "ADBE Rotation" у них просто не существует.
        ["ADBE Rotate X", "X Rotation"],
        ["ADBE Rotate Y", "Y Rotation"],
        ["ADBE Rotate Z", "Z Rotation"],
        ["ADBE Orientation", "Orientation"],
        ["ADBE Opacity", "Opacity"]
      ];
      for (var tp = 0; tp < transProps.length; tp++) {
        try {
          var p = transform.property(transProps[tp][0]);
          if (p && hasKeyframes(p)) {
            props.push({
              layer: layer,
              prop: p,
              displayName: layer.name + " | " + transProps[tp][1],
              matchName: transProps[tp][0]
            });
          }
        } catch (e) {}
      }
    }

    // Effects параметры
    try {
      var effects = layer.property("ADBE Effect Parade") as PropertyGroup;
      if (effects && effects.numProperties > 0) {
        for (var ei = 1; ei <= effects.numProperties; ei++) {
          var effect = effects.property(ei) as PropertyGroup;
          var effectName = effect.name;
          for (var ej = 1; ej <= effect.numProperties; ej++) {
            try {
              var param = effect.property(ej) as Property;
              if (param && hasKeyframes(param) && param.canVaryOverTime) {
                props.push({
                  layer: layer,
                  effect: effect,
                  prop: param,
                  displayName: layer.name + " | " + effectName + " | " + param.name,
                  effectName: effectName,
                  paramName: param.name
                });
              }
            } catch (e2) {}
          }
        }
      }
    } catch (e) {}
  }
  return props;
}

function exportKeysToEG() {
  var proj = app.project;
  if (!proj) { alert("No project."); return; }

  var active = proj.activeItem;
  if (!(active && active instanceof CompItem)) {
    alert("Open a composition on the timeline and select the precomp layer(s) with keyframes.");
    return;
  }

  if (active.selectedLayers.length === 0) {
    alert("Select at least one precomp layer on the timeline.");
    return;
  }

  // Каждый выделенный precomp-слой обрабатывается отдельно: параметры со ключами
  // регистрируются в Essential Graphics его СОБСТВЕННОЙ (внутренней) композиции.
  // Именно тогда AE сама показывает их как "Master Properties" на этом слое —
  // прямо в таймлайне активной композиции, без открытия отдельной панели.
  var groups: { innerComp: CompItem; props: any[] }[] = [];
  for (var li = 0; li < active.selectedLayers.length; li++) {
    var layer = active.selectedLayers[li];
    if (!(layer instanceof AVLayer) || !layer.source || !(layer.source instanceof CompItem)) continue;
    var innerComp = layer.source;
    var layerProps = collectKeyframedProps(innerComp);
    if (layerProps.length > 0) groups.push({ innerComp: innerComp, props: layerProps });
  }

  if (groups.length === 0) {
    alert("No keyframed parameters found in the selected precomp layer(s).");
    return;
  }

  app.beginUndoGroup("Export Keys to EG");
  try {
    var count = 0;
    var alreadyThere = 0;

    for (var g = 0; g < groups.length; g++) {
      var innerComp = groups[g].innerComp;
      var props = groups[g].props;

      for (var k = 0; k < props.length; k++) {
        var kp = props[k];

        try {
          // Пропускаем то, что уже добавлено — иначе AE покажет
          // блокирующий варнинг "already referenced by a controller"
          if (!kp.prop.canAddToMotionGraphicsTemplate(innerComp)) {
            alreadyThere++;
            continue;
          }
          // Добавляем параметр в Essential Graphics внутренней композиции под именем "Layer | Param"
          if (kp.prop.addToMotionGraphicsTemplateAs(innerComp, kp.displayName)) count++;
        } catch (e) {
          // Пропускаем параметры которые не могут быть добавлены
        }
      }
    }

    var msg = "✅ Done!\n" + count + " keyframed parameters added to Essential Graphics.\nEdit them via \"Master Properties\" directly on the precomp layer.";
    if (alreadyThere > 0) msg += "\n" + alreadyThere + " were already present and skipped.";
    alert(msg);
  } catch (err: any) {
    alert("Error: " + err.toString());
  } finally {
    app.endUndoGroup();
  }
}

// Click — Export Keyframed Parameters to Essential Graphics.
// Ctrl+Click — Precomp Controllers (прежнее поведение кнопки, без изменений).
export function ctrlButtonClick(ctrlKey: boolean) {
  if (ctrlKey) {
    app.beginUndoGroup("Precomp Controllers");
    try { applyControllers(); } catch (e: any) { alert("Error: " + e.toString()); } finally { app.endUndoGroup(); }
  } else {
    exportKeysToEG();
  }
}

export function renderButtonClick(lang: string, creatorName: string) {
  // Все проверки — ДО beginUndoGroup, чтобы ранний return никогда
  // не оставлял незакрытую undo-группу (это ломало повторные клики).
  var proj = app.project;
  if (!proj) { alert("Нет открытого проекта."); return; }
  var selectedItems = proj.selection;
  if (selectedItems.length === 0) { alert("Выделите хотя бы одну композицию или папку с композициями."); return; }
  var compsToRender = getCompsFromSelection(selectedItems);
  if (compsToRender.length === 0) { alert("В выделении нет ни одной композиции."); return; }

  app.beginUndoGroup("Smart Render");
  try {
    var projectName = proj.file ? proj.file.name.replace(/\.[^\.]+$/, "") : "Untitled_Project";
    var desktopPath = Folder.desktop.fsName;
    var defaultLang = lang;
    var creator = creatorName;
    saveLangCreatorSettings(lang, creatorName);

    // Своя корневая папка на рабочем столе на каждый язык — имя проекта +
    // суффикс языка (например "07.26_CB_123_FR"). Для EN (язык по умолчанию)
    // суффикс не добавляется — папка называется просто именем проекта.
    var langBaseFolders: { [langKey: string]: Folder } = {};
    function getLangBaseFolder(langCode: string): Folder {
      if (!langBaseFolders[langCode]) {
        var folderName = langCode === "EN" ? projectName : projectName + "_" + langCode;
        var folder = new Folder(desktopPath + "/" + folderName);
        if (!folder.exists) folder.create();
        langBaseFolders[langCode] = folder;
      }
      return langBaseFolders[langCode];
    }

    for (var i = 0; i < compsToRender.length; i++) {
      var comp = compsToRender[i];
      applyVersionLabel(comp);
      // Язык в имени файла — из суффикса самой композиции (например "_EN"),
      // а не из дропдауна: так рендер нескольких языков сразу называется верно.
      var langCode = extractLanguageCodeFromName(comp.name) || defaultLang;
      var width = comp.width;
      var height = comp.height;
      var durationSec = Math.ceil(comp.workAreaDuration);
      var versionMatch = comp.name.match(/[Vv]\d+/);
      var version = versionMatch ? ("V" + versionMatch[0].replace(/[Vv]/, "")) : "V1";
      var resolutionFolderName = width + "x" + height;
      var langBaseFolder = getLangBaseFolder(langCode);
      var resFolder = new Folder(langBaseFolder.fsName + "/" + resolutionFolderName);
      if (!resFolder.exists) resFolder.create();
      var safeFileName = projectName + "_video_" + version + "__" + resolutionFolderName + "_" + durationSec + "s_" + langCode + "_" + creator;
      var outputPath = resFolder.fsName + "/" + safeFileName + ".mov";
      try {
        var rqItem = app.project.renderQueue.items.add(comp);
        rqItem.outputModule(1).file = new File(outputPath);
      } catch (err: any) { alert("Ошибка: " + comp.name + "\n" + err.message); }
    }
    alert("✅ Композиции добавлены в очередь рендера.");
  } catch (renderErr: any) {
    alert("Error: " + renderErr.toString());
  } finally {
    app.endUndoGroup();
  }
}

export function collectButtonClick(lang: string, ctrlKey: boolean) {
  var proj = app.project;
  if (!proj) { alert("Нет открытого проекта."); return; }

  var selection = proj.selection;
  var selectedComps = getCompsFromSelection(selection);
  if (selectedComps.length === 0) { alert("Выделите хотя бы одну композицию или папку с композициями."); return; }

  // Язык каждой выделенной композиции определяем по ЕЁ СОБСТВЕННОЙ иерархии
  // папок (EN/ES/... на любой глубине) — считаем это ДО расплющивания папок
  // ниже, пока parentFolder ещё указывает на исходное место. Так при выделении
  // сразу нескольких языковых папок Collect сохраняет разделение между языками,
  // а не смешивает всё в одну. Выбранный в дропдауне язык — только запасной
  // вариант для композиций вне языковых папок.
  var compLangs: { [id: number]: string } = {};
  for (var li = 0; li < selectedComps.length; li++) {
    var lc = selectedComps[li];
    compLangs[lc.id] = getLanguageFromFolderHierarchy(lc.parentFolder, lang);
  }

  app.beginUndoGroup("Rename + Organize + Reduce");
  try {
    // 1) Переименование выделенных композиций: V?__WxH (фактическое разрешение)
    //    + суффикс языка — свой для каждой композиции (см. compLangs выше)
    for (var r = 0; r < selectedComps.length; r++) {
      var c = selectedComps[r];
      c.name = buildProjectName(getVersionFromName(c.name), c.width, c.height) + "_" + compLangs[c.id];
      applyVersionLabel(c);
    }

    // 2) Удаление всех папок: сначала всё содержимое в корень, затем удаляем пустые папки
    var allItems = [];
    for (var a = 1; a <= proj.numItems; a++) allItems.push(proj.item(a));
    for (var b = 0; b < allItems.length; b++) {
      try { if (allItems[b].parentFolder !== proj.rootFolder) allItems[b].parentFolder = proj.rootFolder; } catch (_) {}
    }
    for (var d = 0; d < allItems.length; d++) {
      try { if (allItems[d] instanceof FolderItem) allItems[d].remove(); } catch (_) {}
    }

    // 3) Consolidate All Footage
    proj.consolidateFootage();

    // 4) Reduce Project по выделенным композициям
    proj.reduceProject(selectedComps);

    // 5) Создание иерархии папок и сортировка — каждая композиция в свою <LANG>/<WxH>
    organizeProjectForCollect(proj, compLangs);
  } catch (e: any) {
    alert("Error: " + e.toString());
    app.endUndoGroup();
    return;
  }
  app.endUndoGroup();

  // Обычный клик — только чистка проекта (переименование, сортировка по
  // папкам, consolidate, reduce), без шага 6. Ctrl+Click — то же самое,
  // плюс шаг 6 (нативный Collect Files).
  if (!ctrlKey) return;

  // 6) Сам сбор файлов — через РОДНУЮ команду AE "Collect Files", а не своим кодом.
  // У скриптового API нет способа переподключить многослойный PSD/AI с сохранением
  // привязки к конкретному слою: item.replace()/replaceWithSequence() всегда
  // подставляют файл целиком (смёрженным). У нативной команды этой проблемы нет —
  // она использует внутренний, не публикуемый механизм AE. Откроется её обычный
  // диалог — подтвердите папку и нажмите Collect, как обычно; "тихо" (без диалога)
  // эту команду со скриптовым путём назначения запустить нельзя.
  var collectCmdId = app.findMenuCommandId("Collect Files...");
  if (!collectCmdId) collectCmdId = 2482; // запасной ID, если поиск по имени не сработал в этой версии/локали AE
  try {
    app.executeCommand(collectCmdId);
  } catch (e2: any) {
    alert("Error: " + e2.toString());
  }
}
