import { useState } from "react";

// Три состояния иконки — обычная / hover (_1) / нажатая (_2), как в старом
// ScriptUI-скрипте (wireIconStates: mouseover -> hover, mouseout -> default,
// mousedown -> pressed, mouseup -> hover).
type IconButtonProps = {
  base: string;
  hover: string;
  pressed: string;
  label: string;
  useIcons: boolean;
  title?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const IconButton = ({ base, hover, pressed, label, useIcons, title, onClick }: IconButtonProps) => {
  const [src, setSrc] = useState(base);

  // Тумблер в гайде: стандартная текстовая кнопка вместо PNG-иконки — как в
  // старом ScriptUI-скрипте, если бы файл иконки не был найден.
  if (!useIcons) {
    return (
      <button className="rrr-std-btn" title={title} onClick={onClick}>
        {label}
      </button>
    );
  }

  return (
    <button
      className="rrr-icon-btn"
      title={title}
      onClick={onClick}
      onMouseEnter={() => setSrc(hover)}
      onMouseLeave={() => setSrc(base)}
      onMouseDown={() => setSrc(pressed)}
      onMouseUp={() => setSrc(hover)}
    >
      <img src={src} />
    </button>
  );
};
