import { useState } from "react";
import { version } from "../../shared/shared";
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
  previewInput?: boolean;
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
    previewDropdown: true,
    title: "дубликат папки",
    bullets: [
      "Выберите папку в панели project и создайте независимый дубликат для локализации."
    ]
  },
  {
    previewInput: true,
    title: "поле имени",
    bullets: [
      "Name — ваш ник.",
      "Запоминается между запусками."
    ]
  },
  {
    previewLabels: ["render"],
    title: "отправка в очередь",
    bullets: [
      "проект должен быть назван по формуле MM.YY_AA_TaskName,",
      "создает все нужные папки на рабочем столе и отправляет на Render."
    ]
  },
  {
    previewLabels: ["collect"],
    title: "сборка и наведение порядка одной кнопкой",
    bullets: [
      "Переименовывает выбранные композиции,",
      "удаляет лишние папки и файлы,",
      "объединяет одинаковые файлы,",
      "создает нужные папки и сортирует все по ним."
    ]
  }
];

export const GuideApp = () => {
  const [openIndex, setOpenIndex] = useState(-1);

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
                <>
                  <span className="guide-preview-lang">EN</span>
                  <span className="guide-preview-box guide-preview-chevron">⌄</span>
                </>
              )}
              {section.previewInput && (
                <span className="guide-preview-box">Name</span>
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
      <div className="guide-version">версия плагина: {version}</div>
      <button className="guide-update-btn">Обновить</button>
    </div>
  );
};
