export type CustomButtonAction =
  | { kind: "script"; code: string }
  | { kind: "expression"; code: string }
  | { kind: "link"; url: string }
  | { kind: "program"; path: string }
  | { kind: "folder"; path: string };

export type CustomButtonDef = {
  id: string;
  tooltip: string; // подсказка на самой кнопке (и в основной панели, и в истории)
  description: string; // отдельный текст — виден во всплывающем окне при наведении на плитку в Истории
  descriptionGifDataUrl: string | null; // гифка (как есть, без пересжатия — иначе слетит анимация), вместо описания или вместе с ним
  action: CustomButtonAction;
  iconDataUrl: string | null; // уменьшенная (высота <= 32px) PNG data URL загруженного файла/иконки программы ИЛИ SVG data URL иконки из библиотеки; null — текстовый фолбэк как у остальных кнопок
  iconWidth: number; // натуральная ширина иконки после масштабирования, px
};

export type ButtonHistoryEntry = {
  id: string;
  tooltip: string;
  description: string;
  descriptionGifDataUrl: string | null;
  action: CustomButtonAction;
  iconDataUrl: string | null;
  iconWidth: number;
  addedAt: number;
};
