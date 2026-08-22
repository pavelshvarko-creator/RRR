import { useEffect, useRef, useState } from "react";
import { csi, subscribeBackgroundColor, evalTS } from "../lib/utils/bolt";
import { ns } from "../../shared/shared";
import { IconButton } from "./IconButton";
import { ButtonSlot } from "./ButtonSlot";
import { CustomButtonView } from "./CustomButtonView";
import { AddButtonDialog } from "./AddButtonDialog";
import { runCustomButtonAction } from "../lib/buttons/runAction";
import { publishButtonToHistory } from "../lib/buttons/history";
import type { CustomButtonDef, ButtonHistoryEntry } from "../../shared/customButtons";
import "./main.scss";

import icon9x16 from "../assets/RRR/9x16.png";
import icon9x16Hover from "../assets/RRR/9x16_1.png";
import icon9x16Pressed from "../assets/RRR/9x16_2.png";
import icon4x3 from "../assets/RRR/4x3.png";
import icon4x3Hover from "../assets/RRR/4x3_1.png";
import icon4x3Pressed from "../assets/RRR/4x3_2.png";
import icon1x1 from "../assets/RRR/1x1.png";
import icon1x1Hover from "../assets/RRR/1x1_1.png";
import icon1x1Pressed from "../assets/RRR/1x1_2.png";
import icon16x9 from "../assets/RRR/16x9.png";
import icon16x9Hover from "../assets/RRR/16x9_1.png";
import icon16x9Pressed from "../assets/RRR/16x9_2.png";
import iconCtrl from "../assets/RRR/ctrl.png";
import iconCtrlHover from "../assets/RRR/ctrl_1.png";
import iconCtrlPressed from "../assets/RRR/ctrl_2.png";
import iconRender from "../assets/RRR/Render.png";
import iconRenderHover from "../assets/RRR/Render_1.png";
import iconRenderPressed from "../assets/RRR/Render_2.png";
import iconCollect from "../assets/RRR/Collect.png";
import iconCollectHover from "../assets/RRR/Collect_1.png";
import iconCollectPressed from "../assets/RRR/Collect_2.png";
import iconPlus from "../assets/RRR/+.png";
import iconPlusHover from "../assets/RRR/+_1.png";
import iconPlusPressed from "../assets/RRR/+_2.png";

const LANG_CODES = ["EN", "AR", "DA", "DE", "ES", "FI", "FR", "IT", "JA", "KO", "NL", "SV", "TH"];

export const App = () => {
  const [bgColor, setBgColor] = useState("#282c34");
  const [lang, setLang] = useState("EN");
  const [name, setName] = useState("");
  const [customLangMode, setCustomLangMode] = useState(false);
  const [customLangValue, setCustomLangValue] = useState("");
  const [useIcons, setUseIcons] = useState(true);
  const [langDropdownOpen, setLangDropdownOpen] = useState(false);
  const langDropdownRef = useRef<HTMLSpanElement>(null);

  // Пользовательские кнопки (кнопка «+»): порядок в аккордеоне + сами
  // определения — персистятся отдельно (тот же принцип, что и для
  // остальных настроек панели). customPanelOpen не персистится — аккордеон
  // всегда стартует свёрнутым при открытии панели.
  const [customButtonOrder, setCustomButtonOrder] = useState<string[]>([]);
  const [customButtons, setCustomButtons] = useState<Record<string, CustomButtonDef>>({});
  const [customButtonsLoaded, setCustomButtonsLoaded] = useState(false);
  const [customPanelOpen, setCustomPanelOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // При естественном (компактном, по размеру иконки) размере добавленных
  // кнопок несколько узких иконок всегда помещаются в один ряд даже там,
  // где одна обычная 56px-кнопка уже сложена в свой единственный столбец —
  // так и должно быть в обычном случае (это отдельный, самостоятельно
  // адаптивный блок). Но при действительно экстремальном сужении (порог
  // задан явно, а не выведен из общей механики) весь блок добавленных
  // кнопок принудительно встаёт в один столбец.
  const NARROW_PANEL_THRESHOLD = 100;
  const [panelNarrow, setPanelNarrow] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  // null — пока не проверили app.settings (не мигаем диалогом раньше
  // времени); true — имя ещё не сохранено, показываем блокирующий (без
  // клика по фону) диалог первого запуска вместо window.prompt; false —
  // имя уже есть, диалог не нужен.
  const [nameSetupNeeded, setNameSetupNeeded] = useState<boolean | null>(null);
  const [nameSetupValue, setNameSetupValue] = useState("");

  useEffect(() => {
    if (window.cep) {
      subscribeBackgroundColor(setBgColor);
    }
    // Поле Name в интерфейсе не показываем — имя один раз запрашивается при
    // первом запуске панели (если ещё не сохранено) и дальше используется
    // молча из app.settings. Раньше это был блокирующий window.prompt прямо
    // при монтировании; теперь — неблокирующий флаг и свой диалог (см.
    // NameSetupDialog ниже), чтобы панель успевала нормально отрисоваться
    // независимо от того, ответит ли пользователь на запрос сразу.
    evalTS("getSavedCreatorName").then((saved) => {
      if (saved) {
        setName(saved);
        setNameSetupNeeded(false);
        return;
      }
      setNameSetupNeeded(true);
    });

    // Тумблер "иконки / стандартные кнопки" переключается в гайде, но
    // применяется здесь, в основной панели — читаем сохранённое значение
    // при каждом открытии панели.
    evalTS("getIconModeSetting").then((saved) => setUseIcons(saved !== false));

    // Пользовательские кнопки — порядок и определения из app.settings; при
    // отсутствии/повреждении сохранённого JSON тихо откатываемся к дефолту
    // (пустой аккордеон), не мешая открытию панели.
    Promise.all([evalTS("getCustomButtonOrder"), evalTS("getCustomButtons")]).then(([orderJson, buttonsJson]) => {
      try {
        if (orderJson) {
          const parsed = JSON.parse(orderJson);
          if (Array.isArray(parsed)) setCustomButtonOrder(parsed);
        }
      } catch (_) {}
      try {
        if (buttonsJson) {
          const parsed = JSON.parse(buttonsJson);
          if (parsed && typeof parsed === "object") setCustomButtons(parsed);
        }
      } catch (_) {}
      setCustomButtonsLoaded(true);
    });

    // Тихая автопроверка обновлений при каждом запуске панели (AE запущен/
    // перезапущен). Модуль с обновлением подключаем динамически (не в
    // самом верху файла), чтобы его код (доступ к Node.js fs/path) не мог
    // сломать самую первую отрисовку панели, если что-то пойдёт не так.
    // Ошибки самой проверки (например нет интернета) не показываем, чтобы
    // не мешать открытию панели.
    import("../lib/utils/update")
      // allowElevation: false — тихая проверка никогда не должна сама
      // всплывать системным запросом прав администратора (UAC).
      .then(({ checkAndAutoInstallUpdate }) => checkAndAutoInstallUpdate(false))
      .then((res) => {
        if (res.installed) {
          alert(
            "✅ Установлено обновление до версии " + res.version + ".\n" +
            "Перезапустите After Effects, чтобы изменения вступили в силу."
          );
        }
      })
      .catch((e) => {
        // Тихая автопроверка — при неудаче (нет интернета, файл временно занят
        // открытым окном гайда и т.п.) молча логируем и просто повторим при
        // следующем открытии панели, а не дёргаем пользователя алертом на
        // каждый запуск AE. Явную ошибку показываем только по кнопке
        // "Обновить" в гайде (см. GuideApp.tsx) — там это осознанное действие.
        console.error("Автообновление: проверка не удалась", e);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Порог по явному числу пикселей (см. NARROW_PANEL_THRESHOLD выше) —
  // ResizeObserver следит за настоящей шириной .rrr-panel и переключает
  // panelNarrow, когда она пересекает порог.
  useEffect(() => {
    const el = panelRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (typeof width === "number") setPanelNarrow(width <= NARROW_PANEL_THRESHOLD);
    });
    ro.observe(el);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Закрытие кастомного дропдауна языка по клику снаружи — сам дропдаун
  // не нативный select (см. комментарий у handleLangPick), поэтому клики
  // вне него не закрывают его сами по себе.
  useEffect(() => {
    if (!langDropdownOpen) return;
    const onDocMouseDown = (e: MouseEvent) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(e.target as Node)) {
        setLangDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [langDropdownOpen]);

  // Сохраняем порядок/определения пользовательских кнопок при каждом
  // изменении — но только после того, как первичная загрузка из настроек
  // уже случилась, иначе пустой дефолт успел бы затереть сохранённое до
  // того, как оно подгрузится.
  useEffect(() => {
    if (!customButtonsLoaded) return;
    evalTS("saveCustomButtonOrder", JSON.stringify(customButtonOrder));
  }, [customButtonOrder, customButtonsLoaded]);

  useEffect(() => {
    if (!customButtonsLoaded) return;
    evalTS("saveCustomButtons", JSON.stringify(customButtons));
  }, [customButtons, customButtonsLoaded]);

  const handleCropClick = (key: string, e: React.MouseEvent) => {
    evalTS("cropButtonClick", key, e.ctrlKey, e.altKey);
  };

  const handleCtrlClick = (e: React.MouseEvent) => {
    evalTS("ctrlButtonClick", e.ctrlKey);
  };

  const handleRenderClick = (e: React.MouseEvent) => {
    // При первом клике renderButtonClick сам покажет ScriptUI-диалог с
    // выбором Output Module Template из уже существующих у пользователя в
    // AE — и сохранит выбор навсегда (app.settings), без каких-либо
    // зашитых в расширение шаблонов. Ctrl+Клик — те же render-queue items
    // дополнительно отправляются в Adobe Media Encoder (см. renderButtonClick).
    evalTS("renderButtonClick", lang, name, e.ctrlKey);
  };

  const handleCollectClick = (e: React.MouseEvent) => {
    evalTS("collectButtonClick", lang, e.ctrlKey);
  };

  // Свой (не нативный select) дропдаун языка: клик по строке в
  // выпадающем списке всегда порождает обычное onClick-событие, даже если
  // выбранный язык совпадает с уже показанным (например EN сразу после
  // EN — дефолт при старте панели). Нативный <select> внутри CEP-панели,
  // встроенной в AE, не давал надёжного onChange на реальный клик мышью в
  // самой панели (подтверждено: то же действие через удалённый DevTools —
  // localhost:8860 — срабатывало, а напрямую в AE — нет), поэтому от него
  // отказались в пользу обычных кликабельных элементов, как у всех
  // остальных кнопок панели.
  const handleLangPick = (code: string) => {
    setLangDropdownOpen(false);
    if (code === "CUSTOM") {
      setCustomLangValue("");
      setCustomLangMode(true);
      return;
    }
    evalTS("onLanguageChange", code, lang, name).then((success) => {
      if (success) setLang(code);
    });
  };

  const commitCustomLang = () => {
    const code = customLangValue.toUpperCase();
    setCustomLangMode(false);
    if (code.length !== 2) return;
    evalTS("onLanguageChange", code, lang, name).then((success) => {
      if (success) setLang(code);
    });
  };

  // Убрать с панели — НЕ безвозвратное удаление: определение убирается из
  // аккордеона (customButtonOrder/customButtons), но сама кнопка навсегда
  // остаётся в локальной истории (она туда публикуется при каждом
  // сохранении, см. handleSaveCustomButton) — вернуть её на панель можно
  // оттуда же в один клик. Безвозвратное "Удалить" — только из самой
  // истории (см. ButtonHistoryGrid).
  const handleRemoveCustomButton = (id: string) => {
    setCustomButtonOrder((prev) => prev.filter((existingId) => existingId !== id));
    setCustomButtons((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const handleEditCustomButton = (id: string) => {
    setEditingId(id);
    setDialogOpen(true);
  };

  // И создание, и редактирование публикуются в локальную историю — она
  // хранит все версии, ничего не перезаписывая (см. history.ts).
  const handleSaveCustomButton = (def: CustomButtonDef, isEdit: boolean) => {
    setCustomButtons((prev) => ({ ...prev, [def.id]: def }));
    if (!isEdit) setCustomButtonOrder((prev) => [...prev, def.id]);
    setDialogOpen(false);
    setEditingId(null);

    const entry: ButtonHistoryEntry = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      tooltip: def.tooltip,
      description: def.description,
      descriptionGifDataUrl: def.descriptionGifDataUrl,
      action: def.action,
      iconDataUrl: def.iconDataUrl,
      iconWidth: def.iconWidth,
      addedAt: Date.now(),
    };
    publishButtonToHistory(entry).catch((e: any) => {
      console.error("Не удалось сохранить кнопку в локальную историю", e);
    });
  };

  // Клик по плитке в Истории — независимая копия (свой новый id), чтобы
  // повторный импорт той же записи истории на панель не путал слоты между
  // собой (то же самое, с чем свежесозданная кнопка получает id заново).
  const handleImportFromHistory = (entry: ButtonHistoryEntry) => {
    const def: CustomButtonDef = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      tooltip: entry.tooltip,
      description: entry.description,
      descriptionGifDataUrl: entry.descriptionGifDataUrl,
      action: entry.action,
      iconDataUrl: entry.iconDataUrl,
      iconWidth: entry.iconWidth,
    };
    setCustomButtons((prev) => ({ ...prev, [def.id]: def }));
    setCustomButtonOrder((prev) => [...prev, def.id]);
  };

  const handleNameSetupSubmit = () => {
    const entered = nameSetupValue.trim();
    if (!entered) return;
    setName(entered);
    evalTS("saveCreatorName", entered, lang);
    setNameSetupNeeded(false);
  };

  const handleInfoClick = () => {
    // Возврат к rrr.requestOpenExtension — это единственный способ открытия,
    // при котором гайд реально отрисовывался (проверено). Открытие через
    // app.executeCommand (нативная команда меню) рендерит пустое окно —
    // рабочая причина не найдена, но эмпирически он ломает рендер здесь.
    // autoVisible: true у панели гайда (cep.config.ts) гарантирует, что
    // экземпляр панели уже существует к моменту клика — так что "не может
    // создать с нуля" ограничение requestOpenExtension больше не мешает.
    csi.requestOpenExtension(`${ns}.guide`, "");
  };

  return (
    <div className="app" style={{ backgroundColor: bgColor }}>
      <div className={"rrr-panel" + (panelNarrow ? " rrr-panel--narrow" : "")} ref={panelRef}>
        <IconButton
          base={icon9x16}
          hover={icon9x16Hover}
          pressed={icon9x16Pressed}
          label="9:16"
          useIcons={useIcons}
          title="1080x1920&#10;&#10;Клик — ресайз в Project&#10;Ctrl+Клик — ресайз на Timeline&#10;Alt+Клик — новая композиция"
          onClick={(e) => handleCropClick("9x16", e)}
        />
        <IconButton
          base={icon4x3}
          hover={icon4x3Hover}
          pressed={icon4x3Pressed}
          label="4:3"
          useIcons={useIcons}
          title="1080x1350&#10;&#10;Клик — ресайз в Project&#10;Ctrl+Клик — ресайз на Timeline&#10;Alt+Клик — новая композиция"
          onClick={(e) => handleCropClick("4x3", e)}
        />
        <IconButton
          base={icon1x1}
          hover={icon1x1Hover}
          pressed={icon1x1Pressed}
          label="1:1"
          useIcons={useIcons}
          title="1080x1080&#10;&#10;Клик — ресайз в Project&#10;Ctrl+Клик — ресайз на Timeline&#10;Alt+Клик — блюр-фон билд (источник 1080x1350)"
          onClick={(e) => handleCropClick("1x1", e)}
        />
        <IconButton
          base={icon16x9}
          hover={icon16x9Hover}
          pressed={icon16x9Pressed}
          label="16:9"
          useIcons={useIcons}
          title="1920x1080&#10;&#10;Клик — ресайз в Project&#10;Ctrl+Клик — ресайз на Timeline&#10;Alt+Клик — блюр-фон билд (источник 1080x1350)"
          onClick={(e) => handleCropClick("16x9", e)}
        />
        <IconButton
          base={iconCtrl}
          hover={iconCtrlHover}
          pressed={iconCtrlPressed}
          label="ctrl"
          useIcons={useIcons}
          title="Клик — &quot;достает&quot; ключи через Essential Graphics&#10;Ctrl+Клик — &quot;достает&quot; Scale и Position"
          onClick={handleCtrlClick}
        />

        <IconButton
          base={iconCollect}
          hover={iconCollectHover}
          pressed={iconCollectPressed}
          label="collect"
          useIcons={useIcons}
          title="Выделите композиции&#10;&#10;Клик — чистка проекта&#10;Ctrl+Клик — чистка и сборка коллекта"
          onClick={handleCollectClick}
        />
        <IconButton
          base={iconRender}
          hover={iconRenderHover}
          pressed={iconRenderPressed}
          label="render"
          useIcons={useIcons}
          title="Клик — рендер в очередь After Effects&#10;Ctrl+Клик — отправка в Adobe Media Encoder"
          onClick={handleRenderClick}
        />

        <IconButton
          base={iconPlus}
          hover={iconPlusHover}
          pressed={iconPlusPressed}
          label="+"
          useIcons={useIcons}
          title="Добавить кнопку"
          onClick={() => setDialogOpen(true)}
        />

        {customLangMode ? (
          <input
            className="rrr-lang-select rrr-lang-custom-input"
            autoFocus
            maxLength={2}
            value={customLangValue}
            onChange={(e) => setCustomLangValue(e.target.value.toUpperCase())}
            onBlur={commitCustomLang}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitCustomLang();
              if (e.key === "Escape") setCustomLangMode(false);
            }}
          />
        ) : (
          <span className="rrr-lang-select-wrap" ref={langDropdownRef}>
            <button
              type="button"
              className="rrr-lang-select rrr-lang-select-btn"
              title="Выделите папку в Project"
              onClick={() => setLangDropdownOpen((open) => !open)}
            >
              <span>{lang}</span>
              <span className="rrr-lang-select-chevron" />
            </button>
            {langDropdownOpen && (
              <div className="rrr-lang-dropdown">
                {LANG_CODES.map((code) => (
                  <div key={code} className="rrr-lang-dropdown-item" onClick={() => handleLangPick(code)}>
                    {code}
                  </div>
                ))}
                {LANG_CODES.indexOf(lang) === -1 && (
                  <div className="rrr-lang-dropdown-item" onClick={() => handleLangPick(lang)}>
                    {lang}
                  </div>
                )}
                <div className="rrr-lang-dropdown-item" onClick={() => handleLangPick("CUSTOM")}>
                  other
                </div>
              </div>
            )}
          </span>
        )}

        {nameSetupNeeded === false && (
          <span className="rrr-info-btn-slot">
            <button className="rrr-info-btn" title="info" onClick={handleInfoClick}>
              i
            </button>
          </span>
        )}

        <div className="rrr-custom-divider">
          {/* Стрелочка — первой (слева), линия — после (заполняет всё
              оставшееся место справа). Не наоборот: у правого края узкой
              панели даже небольшая погрешность между рассчитанной
              раскладкой и тем, что реально видно на экране, могла подрезать
              то, что там стоит — а стрелочку (кликабельную, важную) нельзя
              подрезать, в отличие от чисто декоративной линии. */}
          <button
            type="button"
            className={"rrr-custom-divider-arrow" + (customPanelOpen ? " rrr-custom-divider-arrow--open" : "")}
            title={customPanelOpen ? "Свернуть добавленные кнопки" : "Показать добавленные кнопки"}
            onClick={() => setCustomPanelOpen((open) => !open)}
          />
          <div className="rrr-custom-divider-line" />
        </div>

        {customPanelOpen &&
          customButtonOrder.map((id) => {
            const def = customButtons[id];
            if (!def) return null;
            return (
              <ButtonSlot key={id} slotId={id} onRemove={handleRemoveCustomButton} onEdit={handleEditCustomButton}>
                <CustomButtonView def={def} onRun={runCustomButtonAction} />
              </ButtonSlot>
            );
          })}
      </div>

      {nameSetupNeeded === true && (
        <div className="rrr-modal-overlay">
          <div className="rrr-modal">
            <div className="rrr-modal-title">Первый запуск</div>
            <label className="rrr-modal-field">
              Ваше имя (для имени файлов рендера)
              <input
                type="text"
                autoFocus
                value={nameSetupValue}
                onChange={(e) => setNameSetupValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleNameSetupSubmit();
                }}
              />
            </label>
            <div className="rrr-modal-actions">
              <button className="rrr-std-btn" onClick={handleNameSetupSubmit}>
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}

      {dialogOpen && (
        <AddButtonDialog
          editingDef={editingId ? customButtons[editingId] : undefined}
          onClose={() => {
            setDialogOpen(false);
            setEditingId(null);
          }}
          onSave={handleSaveCustomButton}
          onImportFromHistory={handleImportFromHistory}
        />
      )}
    </div>
  );
};
