import React from "react";
import ReactDOM from "react-dom/client";

// Гайд — "Modeless"-окно, открывается программно через requestOpenExtension.
// При самом первом (за сессию AE) таком открытии нативный мост CEP
// (window.__adobe_cep__) иногда ещё не готов в момент выполнения этого
// скрипта: импорт GuideApp тянет за собой конструктор CSInterface() внутри
// bolt.ts, который в такой момент падает синхронно — React вообще не успевает
// отрисоваться, и окно остаётся пустым белым. Ждём готовности моста (с
// ограничением по попыткам, чтобы не зависнуть навсегда) и только потом
// монтируем приложение.
const MAX_ATTEMPTS = 40; // 40 * 50мс = 2 секунды

function tryMount(attempt = 0) {
  const cepReady = !!(window as any).__adobe_cep__;
  if (!cepReady && attempt < MAX_ATTEMPTS) {
    setTimeout(() => tryMount(attempt + 1), 50);
    return;
  }
  import("./GuideApp").then(({ GuideApp }) => {
    ReactDOM.createRoot(document.getElementById("app") as HTMLElement).render(
      <React.StrictMode>
        <GuideApp />
      </React.StrictMode>
    );
  });
}

tryMount();
