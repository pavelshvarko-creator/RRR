import { useState } from "react";

// Три состояния иконки — обычная / hover (_1) / нажатая (_2), как в старом
// ScriptUI-скрипте (wireIconStates: mouseover -> hover, mouseout -> default,
// mousedown -> pressed, mouseup -> hover).
type IconButtonProps = {
  base: string;
  hover: string;
  pressed: string;
  title?: string;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
};

export const IconButton = ({ base, hover, pressed, title, onClick }: IconButtonProps) => {
  const [src, setSrc] = useState(base);

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
