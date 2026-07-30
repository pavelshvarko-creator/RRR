import { useEffect, useState } from "react";
import { csi, subscribeBackgroundColor, evalTS } from "../lib/utils/bolt";
import { ns } from "../../shared/shared";
import { IconButton } from "./IconButton";
import { checkAndAutoInstallUpdate } from "../lib/utils/update";
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

const LANG_CODES = ["EN", "AR", "DA", "DE", "ES", "FI", "FR", "IT", "JA", "KO", "NL", "SV", "TH"];

export const App = () => {
  const [bgColor, setBgColor] = useState("#282c34");
  const [lang, setLang] = useState("EN");
  const [name, setName] = useState("");
  const [customLangMode, setCustomLangMode] = useState(false);
  const [customLangValue, setCustomLangValue] = useState("");

  useEffect(() => {
    if (window.cep) {
      subscribeBackgroundColor(setBgColor);
    }
    // Поле Name в интерфейсе не показываем — имя один раз запрашивается при
    // первом запуске панели (если ещё не сохранено) и дальше используется
    // молча из app.settings. Возможности изменить его позже нет.
    evalTS("getSavedCreatorName").then((saved) => {
      if (saved) {
        setName(saved);
        return;
      }
      var entered = window.prompt("Введите ваше имя (для имени файлов рендера):");
      if (entered) {
        setName(entered);
        evalTS("saveCreatorName", entered, lang);
      }
    });

    // Тихая автопроверка обновлений при каждом запуске панели (AE запущен/
    // перезапущен). Если есть новая версия — скачивается и ставится сама;
    // ошибки самой проверки (например нет интернета) не показываем, чтобы
    // не мешать открытию панели.
    checkAndAutoInstallUpdate()
      .then((res) => {
        if (res.installed) {
          alert(
            "✅ Установлено обновление до версии " + res.version + ".\n" +
            "Перезапустите After Effects, чтобы изменения вступили в силу."
          );
        }
      })
      .catch((e) => console.error("Автообновление: проверка не удалась", e));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCropClick = (key: string, e: React.MouseEvent) => {
    evalTS("cropButtonClick", key, e.ctrlKey, e.altKey);
  };

  const handleSpecialBuildClick = (targetKey: string) => {
    evalTS("specialBuildButtonClick", targetKey);
  };

  const handleCtrlClick = (e: React.MouseEvent) => {
    evalTS("ctrlButtonClick", e.ctrlKey);
  };

  const handleRenderClick = () => {
    evalTS("renderButtonClick", lang, name);
  };

  const handleCollectClick = (e: React.MouseEvent) => {
    evalTS("collectButtonClick", lang, e.ctrlKey);
  };

  const handleLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newLang = e.target.value;
    if (newLang === "CUSTOM") {
      setCustomLangValue("");
      setCustomLangMode(true);
      return;
    }
    evalTS("onLanguageChange", newLang, lang, name).then((success) => {
      if (success) setLang(newLang);
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

  const handleInfoClick = () => {
    // Самый первый вызов requestOpenExtension за сессию AE (пока окно гайда
    // ни разу не открывалось) иногда "холодно стартует" и не показывает
    // окно с первого раза — повторный вызов чуть позже уже отрабатывает
    // надёжно. Поэтому дублируем вызов с небольшой задержкой "на всякий
    // случай": если окно уже открылось с первого раза, повторный вызов
    // просто ничего не меняет (окно уже видно).
    csi.requestOpenExtension(`${ns}.guide`, "");
    setTimeout(() => csi.requestOpenExtension(`${ns}.guide`, ""), 400);
  };

  return (
    <div className="app" style={{ backgroundColor: bgColor }}>
      <div className="rrr-panel">
        <IconButton
          base={icon9x16}
          hover={icon9x16Hover}
          pressed={icon9x16Pressed}
          title="1080x1920&#10;&#10;Клик — ресайз в Project&#10;Ctrl+Клик — ресайз на Timeline&#10;Alt+Клик — новая композиция"
          onClick={(e) => handleCropClick("9x16", e)}
        />
        <IconButton
          base={icon4x3}
          hover={icon4x3Hover}
          pressed={icon4x3Pressed}
          title="1080x1350&#10;&#10;Клик — ресайз в Project&#10;Ctrl+Клик — ресайз на Timeline&#10;Alt+Клик — новая композиция"
          onClick={(e) => handleCropClick("4x3", e)}
        />
        <IconButton
          base={icon1x1}
          hover={icon1x1Hover}
          pressed={icon1x1Pressed}
          title="1080x1080&#10;Выделите комп 3:4 в Project"
          onClick={() => handleSpecialBuildClick("1x1")}
        />
        <IconButton
          base={icon16x9}
          hover={icon16x9Hover}
          pressed={icon16x9Pressed}
          title="1920x1080&#10;Выделите комп 3:4 в Project"
          onClick={() => handleSpecialBuildClick("16x9")}
        />
        <IconButton
          base={iconCtrl}
          hover={iconCtrlHover}
          pressed={iconCtrlPressed}
          title="Клик — &quot;достает&quot; ключи через Essential Graphics&#10;Ctrl+Клик — &quot;достает&quot; Scale и Position"
          onClick={handleCtrlClick}
        />

        <IconButton
          base={iconCollect}
          hover={iconCollectHover}
          pressed={iconCollectPressed}
          title="Клик — чистка проекта&#10;Ctrl+Клик — чистка и сборка коллекта"
          onClick={handleCollectClick}
        />
        <IconButton base={iconRender} hover={iconRenderHover} pressed={iconRenderPressed} onClick={handleRenderClick} />

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
          <span className="rrr-lang-select-wrap">
            <select className="rrr-lang-select" value={lang} onChange={handleLangChange} title="Выделите папку в Project">
              {LANG_CODES.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
              {LANG_CODES.indexOf(lang) === -1 && <option value={lang}>{lang}</option>}
              <option value="CUSTOM">other</option>
            </select>
            <span className="rrr-lang-select-arrow" />
          </span>
        )}

        <button className="rrr-info-btn" title="info" onClick={handleInfoClick}>
          i
        </button>
      </div>
    </div>
  );
};
