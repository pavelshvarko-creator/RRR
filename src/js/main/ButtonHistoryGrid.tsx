import { useEffect, useRef, useState } from "react";
import { loadButtonHistory, deleteButtonFromHistory } from "../lib/buttons/history";
import type { ButtonHistoryEntry } from "../../shared/customButtons";

const PREVIEW_MAX_WIDTH = 260;

// Сеткой плиток (а не списком, как в исходной версии) — каждая плитка
// выглядит как обычная кнопка (иконка или текстовый фолбэк). Клик — добавить
// на панель (onImport). ПКМ — безвозвратное удаление из истории (в отличие
// от снятия с панели через ButtonSlot — это НЕ то же самое действие).
export const ButtonHistoryGrid = ({ onImport }: { onImport: (entry: ButtonHistoryEntry) => void }) => {
  const [entries, setEntries] = useState<ButtonHistoryEntry[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Всплывающее окно с описанием/гифкой — не title (тот умеет только текст и
  // не покажет картинку), а свой position:fixed попап, спозиционированный по
  // курсору. fixed, а не абсолютно внутри сетки — сама сетка скроллится
  // (overflow-y: auto), и позиционирование внутри неё обрезало бы попап
  // границами сетки.
  // maxRight — правый край самого диалога (.rrr-modal), измеренный в
  // момент наведения, а не window.innerWidth: у CEP-панели, докнутой уже,
  // чем её исходный размер, реальный рендер-вьюпорт браузера может
  // оставаться шире видимой области (та же причина, что и у
  // "не до конца складывающихся" в столбик кнопок панели) — из-за этого
  // window.innerWidth даёт значение больше видимого, и попап "улетает"
  // далеко за пределы того, что пользователь на самом деле видит.
  // Замеряя сам диалог, а не окно, попап не выйдет за его собственные,
  // явно заданные границы, даже если общий вьюпорт "врёт".
  const [preview, setPreview] = useState<{ x: number; y: number; entry: ButtonHistoryEntry; maxRight?: number } | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        setEntries(await loadButtonHistory());
      } catch (e: any) {
        setError(e?.message || String(e));
      }
      setLoading(false);
    })();
  }, []);

  const hasPreview = (entry: ButtonHistoryEntry) => !!(entry.description || entry.descriptionGifDataUrl || entry.tooltip);

  const handleDelete = async (id: string) => {
    setMenuId(null);
    await deleteButtonFromHistory(id);
    setEntries((prev) => (prev ? prev.filter((e) => e.id !== id) : prev));
  };

  const handleTileHover = (e: React.MouseEvent, entry: ButtonHistoryEntry) => {
    if (!hasPreview(entry)) return;
    const modalRect = gridRef.current?.closest(".rrr-modal")?.getBoundingClientRect();
    setPreview({ x: e.clientX, y: e.clientY, entry, maxRight: modalRect?.right });
  };

  return (
    <div className="rrr-button-history-grid" ref={gridRef}>
      {loading && <div className="rrr-form-status">Загрузка…</div>}
      {error && <div className="rrr-form-status rrr-form-status--error">{error}</div>}
      {entries &&
        entries.map((entry) => (
          <div key={entry.id} className="rrr-button-slot">
            {entry.iconDataUrl ? (
              <button
                type="button"
                className="rrr-custom-icon-btn"
                style={{ width: entry.iconWidth }}
                onClick={() => onImport(entry)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuId(entry.id);
                }}
                onMouseEnter={(e) => handleTileHover(e, entry)}
                onMouseLeave={() => setPreview((p) => (p?.entry.id === entry.id ? null : p))}
              >
                <img src={entry.iconDataUrl} alt="" />
              </button>
            ) : (
              <button
                type="button"
                className="rrr-std-btn"
                onClick={() => onImport(entry)}
                onContextMenu={(e) => {
                  e.preventDefault();
                  setMenuId(entry.id);
                }}
                onMouseEnter={(e) => handleTileHover(e, entry)}
                onMouseLeave={() => setPreview((p) => (p?.entry.id === entry.id ? null : p))}
              >
                {entry.tooltip.slice(0, 2)}
              </button>
            )}

            {menuId === entry.id && (
              <>
                <div
                  className="rrr-context-menu-backdrop"
                  onClick={() => setMenuId(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setMenuId(null);
                  }}
                />
                <div className="rrr-context-menu">
                  <div className="rrr-context-menu-item rrr-context-menu-item--danger" onClick={() => handleDelete(entry.id)}>
                    Удалить
                  </div>
                </div>
              </>
            )}
          </div>
        ))}

      {preview &&
        (() => {
          // Только горизонтальный зажим (попап не должен вылезти за правый
          // край диалога) — по вертикали панель обычно достаточно высокая,
          // а сам попап ограничен max-height со скроллом на случай длинного
          // описания. rightBound — правый край самого .rrr-modal (см.
          // handleTileHover), а не window.innerWidth.
          const rightBound = preview.maxRight ?? window.innerWidth;
          const left = Math.min(preview.x + 16, Math.max(8, rightBound - PREVIEW_MAX_WIDTH - 8));
          const showDescription = preview.entry.description || preview.entry.descriptionGifDataUrl;
          return (
            <div className="rrr-button-history-preview" style={{ left, top: preview.y + 12, maxWidth: PREVIEW_MAX_WIDTH }}>
              {preview.entry.descriptionGifDataUrl && <img src={preview.entry.descriptionGifDataUrl} alt="" />}
              {preview.entry.description && <div className="rrr-button-history-preview-text">{preview.entry.description}</div>}
              {!showDescription && <div className="rrr-button-history-preview-text">{preview.entry.tooltip}</div>}
            </div>
          );
        })()}
    </div>
  );
};
