import { useState } from "react";
import { version } from "../../shared/shared";
import { checkForUpdate, downloadAndInstallUpdate } from "../lib/utils/update";
import "./guide.scss";

// Содержимое гайда — аккордеон: заголовок с превью-«кнопками» + стрелочка, под ней текст.
// Развёрнуто одновременно может быть только одно описание. Текст и группировка —
// как в старом ScriptUI-скрипте (RRR.jsx, GUIDE_SECTIONS): 1:1 перенесены к 16:9 —
// обе кнопки используют одну и ту же механику (блюр-фон), Render/Collect — в новом порядке.
// Превью — чёрные прямоугольники с подписью (как в оригинальном addBlackPreviewBox),
// а не настоящие PNG-иконки.
type GuideSection = {
  previewLabels?: string[];
  previewDropdown?: boolean;
  title: string;
  bullets: string[];
};

const GUIDE_SECTIONS: GuideSection[] = [
  {
    previewLabels: ["9:16", "4:3"],
    title: "кроп/дубликат",
    bullets: [
      "Click — создаёт копию нужного разрешения, выделенной в панели project композиции.",
      "Ctrl+Click — заменяет выделенную на timeline композицию, дубликатом нужного разрешения.",
      "Alt+Click — создаёт пустую композицию с сейф-зонами."
    ]
  },
  {
    previewLabels: ["1:1", "16:9"],
    title: "форматы с размытым фоном",
    bullets: [
      "Выберите в панели project композицию 1080x1350."
    ]
  },
  {
    previewLabels: ["ctrl"],
    title: "внешние контроллеры прекомпа",
    bullets: [
      "Click — \"достает\" все ключи через Essential Graphics.",
      "Ctrl+Click — \"достает\" position и scale всех непривязанных слоёв."
    ]
  },
  {
    previewLabels: ["collect"],
    title: "сборка и/или наведение порядка одной кнопкой",
    bullets: [
      "Переименовывает выбранные композиции,",
      "удаляет лишние папки и файлы,",
      "объединяет одинаковые файлы,",
      "создает нужные папки и сортирует все по ним.",
      "+ctrl запускает коллект"
    ]
  },
  {
    previewLabels: ["render"],
    title: "отправка в очередь",
    bullets: [
      "проект должен быть назван по формуле MM.YY_AA_TaskName,",
      "выберите композиции/папки для рендера",
      "создает все нужные папки на рабочем столе и отправляет на Render."
    ]
  },
  {
    previewDropdown: true,
    title: "дубликат папки",
    bullets: [
      "Выберите папку в панели project и создайте независимый дубликат для локализации."
    ]
  }
];

export const GuideApp = () => {
  const [openIndex, setOpenIndex] = useState(-1);
  const [updating, setUpdating] = useState(false);

  const handleUpdateClick = async () => {
    if (updating) return;
    setUpdating(true);
    try {
      const result = await checkForUpdate();
      if (!result.hasUpdate) {
        alert("У вас уже установлена последняя версия (" + version + ").");
        return;
      }
      if (!result.downloadUrl) {
        alert("Найдена версия " + result.latestVersion + ", но в релизе нет .zip-файла для установки.");
        return;
      }
      await downloadAndInstallUpdate(result.downloadUrl);
      alert(
        "✅ Обновление до версии " + result.latestVersion + " установлено.\n" +
        "Перезапустите After Effects, чтобы изменения вступили в силу."
      );
    } catch (e: any) {
      alert("Ошибка обновления: " + (e && e.message ? e.message : String(e)));
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="guide-window">
      <div className="guide-heading">RRR — Resize · Rename · Render</div>
      {GUIDE_SECTIONS.map((section, index) => {
        const isOpen = index === openIndex;
        return (
          <div className="guide-card" key={index}>
            <div
              className="guide-header"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
            >
              <span className="guide-arrow">{isOpen ? "▾" : "▸"}</span>
              {section.previewLabels &&
                section.previewLabels.map((label, i) => (
                  <span className="guide-preview-box" key={i}>{label}</span>
                ))}
              {section.previewDropdown && (
                <span className="guide-preview-box guide-preview-dropdown">
                  <span>EN</span>
                  <span className="guide-preview-chevron" />
                </span>
              )}
              <span className="guide-title">{section.title}</span>
            </div>
            {isOpen && (
              <div className="guide-body">
                {section.bullets.map((bullet, i) => (
                  <div className="guide-bullet" key={i}>• {bullet}</div>
                ))}
              </div>
            )}
          </div>
        );
      })}
      <div className="guide-version">{version}</div>
      <button className="guide-update-btn" onClick={handleUpdateClick} disabled={updating}>
        {updating ? "Проверка..." : "Обновить"}
      </button>
    </div>
  );
};
