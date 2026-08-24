import { useEffect, useState } from "react";
import { evalTS } from "../lib/utils/bolt";
import type { CustomButtonDef, CustomButtonAction, ButtonHistoryEntry } from "../../shared/customButtons";
import { readFileAsText, readImageAsDataURL, loadAndScaleIcon } from "../lib/buttons/icon";
import { extractProgramIconAsFile } from "../lib/buttons/programIcon";
import { listScriptUIPanels, listCepExtensions, type InstalledItem } from "../lib/buttons/installedItems";
import { ButtonHistoryGrid } from "./ButtonHistoryGrid";
import { IconPickerModal } from "./IconPickerModal";

type ActionKind = CustomButtonAction["kind"];

const ACTION_LABELS: Record<ActionKind, string> = {
  script: "Скрипт",
  expression: "Expression",
  link: "Ссылка",
  program: "Программа на ПК",
  folder: "Открыть папку",
  installed: "CEP & ScriptUI",
};

const CODE_FILE_HINT = "Можно загрузить файлом или ввести/вставить код вручную ниже.";

function makeId(): string {
  return `${Date.now()}_${Math.random().toString(36).slice(2)}`;
}

function actionFromDef(action: CustomButtonAction) {
  return {
    actionKind: action.kind,
    code: action.kind === "script" || action.kind === "expression" ? action.code : "",
    linkUrl: action.kind === "link" ? action.url : "",
    programPath: action.kind === "program" ? action.path : "",
    folderPath: action.kind === "folder" ? action.path : "",
    installedValue: action.kind === "installed" ? action.label : "",
  };
}

export const AddButtonDialog = ({
  editingDef,
  onClose,
  onSave,
  onImportFromHistory,
}: {
  editingDef?: CustomButtonDef;
  onClose: () => void;
  onSave: (def: CustomButtonDef, isEdit: boolean) => void;
  onImportFromHistory: (entry: ButtonHistoryEntry) => void;
}) => {
  const seed = editingDef ? actionFromDef(editingDef.action) : null;

  const [tooltip, setTooltip] = useState(editingDef?.tooltip || "");
  const [description, setDescription] = useState(editingDef?.description || "");
  const [descriptionGifDataUrl, setDescriptionGifDataUrl] = useState<string | null>(editingDef?.descriptionGifDataUrl ?? null);
  const [actionKind, setActionKind] = useState<ActionKind>(seed?.actionKind || "script");
  const [code, setCode] = useState(seed?.code || "");
  const [linkUrl, setLinkUrl] = useState(seed?.linkUrl || "");
  const [programPath, setProgramPath] = useState(seed?.programPath || "");
  const [folderPath, setFolderPath] = useState(seed?.folderPath || "");
  const [installedValue, setInstalledValue] = useState(seed?.installedValue || "");
  const [scriptUIPanels, setScriptUIPanels] = useState<InstalledItem[]>([]);
  const [cepExtensions, setCepExtensions] = useState<InstalledItem[]>([]);
  const [iconDataUrl, setIconDataUrl] = useState<string | null>(editingDef?.iconDataUrl ?? null);
  const [iconWidth, setIconWidth] = useState(editingDef?.iconWidth ?? 56);
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [pickingProgram, setPickingProgram] = useState(false);
  const [pickingFolder, setPickingFolder] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Списки для типа "CEP & ScriptUI" — грузим один раз при открытии
  // диалога (не только при выборе этого типа), чтобы переключение на него
  // не показывало пустой дропдаун с задержкой.
  useEffect(() => {
    listScriptUIPanels().then(setScriptUIPanels).catch((e) => {
      console.error("listScriptUIPanels", e);
      setError((prev) => prev || `Не удалось получить список ScriptUI-скриптов: ${e?.message || e}`);
    });
    listCepExtensions().then(setCepExtensions).catch((e) => {
      console.error("listCepExtensions", e);
      setError((prev) => prev || `Не удалось получить список CEP-расширений: ${e?.message || e}`);
    });
  }, []);

  const handleInstalledChange = (value: string) => {
    setInstalledValue(value);
    if (!tooltip.trim() && value) setTooltip(value.replace(/\.(jsx|jsxbin)$/i, ""));
  };

  const handleDescriptionGifChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      const dataUrl = await readImageAsDataURL(file);
      setDescriptionGifDataUrl(dataUrl);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  // Ctrl+V в поле "Описание" — единственный способ добавить гифку (кнопки
  // загрузки файлом больше нет). Два случая клипборда: скопирован сам ФАЙЛ
  // (например Ctrl+C по .gif в проводнике) — тогда clipboardData.files несёт
  // оригинальные байты, анимация сохранится в точности как при выборе файла;
  // либо скопировано "изображение" (например через "Копировать картинку" в
  // браузере) — тогда в clipboardData.items лежит уже растровый снимок, и
  // большинство приложений/ОС на этом этапе сворачивают гифку до одного
  // кадра — это ограничение самого системного буфера обмена, а не наше.
  const handleDescriptionPaste = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const files = e.clipboardData?.files;
    if (files && files.length > 0) {
      const fileArr = Array.from(files);
      const file = fileArr.find((f) => f.type.startsWith("image/")) || fileArr[0];
      e.preventDefault();
      handleDescriptionGifChange(file);
      return;
    }
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const blob = items[i].getAsFile();
          if (blob) {
            e.preventDefault();
            handleDescriptionGifChange(blob);
            return;
          }
        }
      }
    }
  };

  const handleCodeFileChange = async (file: File | undefined) => {
    if (!file) return;
    try {
      const text = await readFileAsText(file);
      setCode(text);
    } catch (e: any) {
      setError(e?.message || String(e));
    }
  };

  // Выбор программы — через родной диалог ExtendScript (File.openDialog), а
  // не HTML <input type="file">: нужен гарантированный абсолютный путь
  // (запускать позже нужно по пути, не по содержимому файла), а полагаться
  // на недокументированное поведение File.path в CEP надёжно не получится.
  // Принимает и .exe, и .lnk (ярлык) — сразу после выбора пытаемся вытащить
  // иконку (для ярлыка так тянется его собственная, возможно кастомная,
  // иконка, не только у самого exe); не получилось — молча оставляем как
  // было, отдельного ручного выбора иконки для этого типа кнопки нет.
  const handlePickProgram = async () => {
    setPickingProgram(true);
    setError(null);
    try {
      const path = await evalTS("pickExecutableFile");
      if (!path) return;
      setProgramPath(path);
      if (!tooltip.trim()) {
        const base = path.split(/[\\/]/).pop() || path;
        setTooltip(base.replace(/\.(exe|lnk)$/i, ""));
      }
      const iconFile = await extractProgramIconAsFile(path);
      if (iconFile) {
        const { dataUrl, width } = await loadAndScaleIcon(iconFile);
        setIconDataUrl(dataUrl);
        setIconWidth(width);
      }
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setPickingProgram(false);
    }
  };

  // Название кнопки тянется от имени папки (последний сегмент пути) — как
  // при вводе/вставке пути вручную в поле, так и при выборе через диалог
  // ниже. Не перезатирает уже введённое название, если оно есть.
  const handleFolderPathChange = (value: string) => {
    setFolderPath(value);
    if (!tooltip.trim() && value.trim()) {
      const base = value.trim().split(/[\\/]/).filter(Boolean).pop();
      if (base) setTooltip(base);
    }
  };

  const handlePickFolder = async () => {
    setPickingFolder(true);
    setError(null);
    try {
      const path = await evalTS("pickFolder");
      if (!path) return;
      handleFolderPathChange(path);
    } catch (e: any) {
      setError(e?.message || String(e));
    } finally {
      setPickingFolder(false);
    }
  };

  const handleSave = () => {
    if (!tooltip.trim()) {
      setError("Укажите название (подсказку) кнопки.");
      return;
    }
    let action: CustomButtonAction;
    if (actionKind === "script" || actionKind === "expression") {
      if (!code.trim()) {
        setError("Введите код.");
        return;
      }
      action = { kind: actionKind, code };
    } else if (actionKind === "link") {
      if (!linkUrl.trim()) {
        setError("Введите ссылку.");
        return;
      }
      action = { kind: "link", url: linkUrl.trim() };
    } else if (actionKind === "folder") {
      if (!folderPath.trim()) {
        setError("Выберите папку.");
        return;
      }
      action = { kind: "folder", path: folderPath.trim() };
    } else if (actionKind === "installed") {
      if (!installedValue) {
        setError("Выберите скрипт или расширение из списка.");
        return;
      }
      action = { kind: "installed", label: installedValue };
    } else {
      if (!programPath.trim()) {
        setError("Выберите программу.");
        return;
      }
      action = { kind: "program", path: programPath.trim() };
    }

    const def: CustomButtonDef = {
      id: editingDef?.id || makeId(),
      tooltip: tooltip.trim(),
      // Типы "программа" и "папка" — без описания/гифки (см. разметку
      // ниже), поле не показывается вообще, поэтому явно не тащим
      // случайно оставшееся значение из другого типа при переключении
      // дропдауна.
      description: !showDescriptionFields ? "" : description.trim(),
      descriptionGifDataUrl: !showDescriptionFields ? null : descriptionGifDataUrl,
      action,
      iconDataUrl,
      iconWidth,
    };
    onSave(def, !!editingDef);
  };

  const isCodeKind = actionKind === "script" || actionKind === "expression";
  const showDescriptionFields = actionKind !== "program" && actionKind !== "folder" && actionKind !== "installed";

  return (
    <div className="rrr-modal-overlay" onClick={onClose}>
      <div className="rrr-modal rrr-modal--wide" onClick={(e) => e.stopPropagation()}>
        <div className="rrr-modal-columns">
          <div className="rrr-modal-form">
            <div className="rrr-modal-title">{editingDef ? "Редактировать кнопку" : "Новая кнопка"}</div>

            <label className="rrr-modal-field">
              {actionKind === "folder" ? "Название папки" : "Название (подсказка при наведении)"}
              <input type="text" value={tooltip} onChange={(e) => setTooltip(e.target.value)} />
            </label>

            <label className="rrr-modal-field">
              Тип действия
              <select value={actionKind} onChange={(e) => setActionKind(e.target.value as ActionKind)}>
                {(Object.keys(ACTION_LABELS) as ActionKind[]).map((k) => (
                  <option key={k} value={k}>
                    {ACTION_LABELS[k]}
                  </option>
                ))}
              </select>
            </label>

            {isCodeKind && (
              <div className="rrr-modal-field">
                <div className="rrr-icon-choose-row rrr-icon-choose-row--split">
                  <label className="rrr-std-btn" title={CODE_FILE_HINT}>
                    Выбрать файл
                    <input
                      type="file"
                      hidden
                      accept=".jsx,.jsxbin,.js,.txt"
                      onChange={(e) => {
                        handleCodeFileChange(e.target.files?.[0]);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <button type="button" className="rrr-std-btn" onClick={() => setShowIconPicker(true)}>
                    Выбрать иконку
                  </button>
                  {iconDataUrl && <img src={iconDataUrl} alt="" className="rrr-modal-icon-preview" />}
                </div>
                <textarea
                  rows={6}
                  title={CODE_FILE_HINT}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder={actionKind === "script" ? "// ExtendScript" : "// Expression"}
                />
              </div>
            )}

            {actionKind === "link" && (
              <label className="rrr-modal-field">
                <input type="text" value={linkUrl} onChange={(e) => setLinkUrl(e.target.value)} placeholder="https://..." />
              </label>
            )}

            {actionKind === "program" && (
              <div className="rrr-modal-field">
                <button type="button" className="rrr-std-btn rrr-wide-btn" onClick={handlePickProgram} disabled={pickingProgram}>
                  {pickingProgram ? "..." : "Выбрать программу"}
                </button>
                {programPath && <span className="rrr-modal-hint">{programPath}</span>}
              </div>
            )}

            {actionKind === "folder" && (
              <div className="rrr-modal-field">
                <div className="rrr-icon-choose-row rrr-icon-choose-row--split">
                  <button type="button" className="rrr-std-btn" onClick={handlePickFolder} disabled={pickingFolder}>
                    {pickingFolder ? "..." : "Выбрать папку"}
                  </button>
                  <button type="button" className="rrr-std-btn" onClick={() => setShowIconPicker(true)}>
                    Выбрать иконку
                  </button>
                  {iconDataUrl && <img src={iconDataUrl} alt="" className="rrr-modal-icon-preview" />}
                </div>
                {folderPath && <span className="rrr-modal-hint">{folderPath}</span>}
              </div>
            )}

            {actionKind === "installed" && (
              <label className="rrr-modal-field">
                Скрипт или расширение
                <select value={installedValue} onChange={(e) => handleInstalledChange(e.target.value)}>
                  <option value="" disabled>Выберите из списка…</option>
                  {scriptUIPanels.length > 0 && (
                    <optgroup label="ScriptUI-скрипты">
                      {scriptUIPanels.map((item) => (
                        <option key={item.label} value={item.label}>
                          {item.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                  {cepExtensions.length > 0 && (
                    <optgroup label="CEP-расширения">
                      {cepExtensions.map((item) => (
                        <option key={item.label} value={item.label}>
                          {item.label}
                        </option>
                      ))}
                    </optgroup>
                  )}
                </select>
              </label>
            )}

            {(actionKind === "link" || actionKind === "installed") && (
              <div className="rrr-modal-field">
                <div className="rrr-icon-choose-row">
                  <button type="button" className="rrr-std-btn rrr-wide-btn" onClick={() => setShowIconPicker(true)}>
                    Выбрать иконку
                  </button>
                  {iconDataUrl && <img src={iconDataUrl} alt="" className="rrr-modal-icon-preview" />}
                </div>
              </div>
            )}

            {showIconPicker && (
              <IconPickerModal
                onClose={() => setShowIconPicker(false)}
                onPick={(dataUrl, width) => {
                  setIconDataUrl(dataUrl);
                  setIconWidth(width);
                  setShowIconPicker(false);
                }}
              />
            )}

            {showDescriptionFields && (
              <label className="rrr-modal-field">
                <textarea
                  rows={3}
                  placeholder="Описание или гифка"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  onPaste={handleDescriptionPaste}
                />
                {descriptionGifDataUrl && (
                  <span className="rrr-modal-gif-preview-wrap">
                    <img src={descriptionGifDataUrl} alt="" className="rrr-modal-gif-preview" />
                    <button type="button" className="rrr-modal-gif-remove" onClick={() => setDescriptionGifDataUrl(null)}>
                      ✕
                    </button>
                  </span>
                )}
              </label>
            )}

            {error && <div className="rrr-form-status rrr-form-status--error">{error}</div>}

            <div className="rrr-modal-actions">
              <button className="rrr-std-btn" onClick={onClose}>
                Отмена
              </button>
              <button className="rrr-std-btn" onClick={handleSave}>
                {editingDef ? "Сохранить" : "Добавить"}
              </button>
            </div>
          </div>

          <div className="rrr-modal-history">
            <div className="rrr-modal-title">История<br />кнопок</div>
            <ButtonHistoryGrid onImport={onImportFromHistory} />
          </div>
        </div>
      </div>
    </div>
  );
};
