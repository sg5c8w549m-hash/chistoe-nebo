// mobile_app/src/components/YandexMap.tsx

import React, { useEffect, useRef } from "react";

interface YandexMapProps {
  address: string;
}

const YandexMap: React.FC<YandexMapProps> = ({ address }) => {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const apiKey = import.meta.env.VITE_YANDEX_MAPS_API_KEY;

  useEffect(() => {
    if (!apiKey) {
      console.warn("VITE_YANDEX_MAPS_API_KEY не задан");
      return;
    }

    const ymapsGlobal = (window as any).ymaps;

    // ищем ЛЮБОЙ уже подключённый скрипт Яндекс.Карт
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src*="api-maps.yandex.ru/2.1"]'
    );

    const loadScript = () =>
      new Promise<void>((resolve, reject) => {
        // если API уже есть в window — ничего не грузим, просто используем
        if (ymapsGlobal) {
          resolve();
          return;
        }

        // если скрипт есть, но ymaps ещё не готов — навесим обработчики
        if (existingScript) {
          existingScript.addEventListener("load", () => resolve());
          existingScript.addEventListener("error", () =>
            reject(new Error("Yandex Maps load error"))
          );
          return;
        }

        // иначе создаём новый скрипт с ключом
        const script = document.createElement("script");
        script.type = "text/javascript";
        script.src = `https://api-maps.yandex.ru/2.1/?apikey=${apiKey}&lang=ru_RU`;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error("Yandex Maps load error"));
        document.body.appendChild(script);
      });

    loadScript()
      .then(() => {
        const ymaps = (window as any).ymaps;
        if (!ymaps || !mapContainerRef.current) return;

        ymaps.ready(() => {
          const container = mapContainerRef.current!;
          container.innerHTML = "";

          const map = new ymaps.Map(container, {
            center: [49.948, 82.615], // Усть-Каменогорск по умолчанию
            zoom: 11,
          });

          ymaps.geocode(address).then((res: any) => {
            const firstGeoObject = res.geoObjects.get(0);
            if (!firstGeoObject) return;

            const coords = firstGeoObject.geometry.getCoordinates();
            map.setCenter(coords, 15, { checkZoomRange: true });

            const placemark = new ymaps.Placemark(coords, {
              balloonContent: address,
            });

            map.geoObjects.add(placemark);
          });
        });
      })
      .catch((err) => {
        console.error("Ошибка загрузки Яндекс.Карт:", err);
      });
  }, [address, apiKey]);

  if (!apiKey) {
    return (
      <div className="text-xs text-red-600">
        Карта недоступна: не задан API-ключ Яндекс.Карт.
      </div>
    );
  }

  return (
    <div
      ref={mapContainerRef}
      style={{ width: "100%", height: "240px", borderRadius: "0.75rem" }}
    />
  );
};

export default YandexMap;
