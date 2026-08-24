export type CustomButtonAction =
  | { kind: "script"; code: string }
  | { kind: "expression"; code: string }
  | { kind: "link"; url: string }
  | { kind: "program"; path: string }
  | { kind: "folder"; path: string }
  // label — точный текст пункта меню Window в AE (имя файла для ScriptUI-
  // скрипта, название из <Menu> манифеста для CEP-расширения). Запускается
  // через findMenuCommandId/executeCommand — та же системная команда,
  // что стоит за самим пунктом меню Window, поэтому кнопка не просто
  // открывает, а ПЕРЕКЛЮЧАЕТ панель (открыть/закрыть), как в самом AE —
  // для обоих видов одинаково, без разделения на подтипы.
  | { kind: "installed"; label: string };

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
