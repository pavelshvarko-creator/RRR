import React from "react";
import ReactDOM from "react-dom/client";
import { GuideApp } from "./GuideApp";

ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
  <React.StrictMode>
    <GuideApp />
  </React.StrictMode>
);

// Известный баг CEP: окно, открытое программно через requestOpenExtension
// ("холодный старт"), иногда не получает от CEF первый paint в нативное
// окно — страница внутри полностью готова (DOM и CSS в порядке, проверено
// через удалённый DevTools), но на экране остаётся белый прямоугольник,
// пока размер окна не поменяется хоть на пиксель. Форсируем это сами.
function kickRepaint() {
  try {
    const w = window.outerWidth || window.innerWidth;
    const h = window.outerHeight || window.innerHeight;
    if (!w || !h) return;
    window.resizeTo(w, h + 1);
    window.resizeTo(w, h);
  } catch (e) {
    // resizeTo может быть недоступен для этого типа окна — не критично,
    // тогда просто полагаемся на обычную перерисовку CEF.
  }
}

window.addEventListener("load", () => {
  setTimeout(kickRepaint, 60);
  setTimeout(kickRepaint, 300);
});
