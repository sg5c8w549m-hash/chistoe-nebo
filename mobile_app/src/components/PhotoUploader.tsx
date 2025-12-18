// src/components/PhotoUploader.tsx
import { useState } from "react";

const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string | undefined) ||
  "http://localhost:4000";

interface PhotoUploaderProps {
  orderId: string;
  onUploaded: (photos: string[]) => void;
}

export function PhotoUploader({ orderId, onUploaded }: PhotoUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFilesChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append("photos", file);
    });

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `${API_BASE_URL}/api/orders/${orderId}/photos`,
        {
          method: "POST",
          body: formData,
        }
      );

      if (!res.ok) {
        const text = await res.text();
        throw new Error(text || `Ошибка загрузки фото (код ${res.status})`);
      }

      const data = (await res.json()) as { photos?: string[] };

      if (Array.isArray(data.photos)) {
        onUploaded(data.photos);
      } else {
        throw new Error("Сервер не вернул список фотографий");
      }

      e.target.value = "";
    } catch (err) {
      const msg =
        err instanceof Error
          ? err.message
          : "Неизвестная ошибка при загрузке фото";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mt-2 space-y-1">
      <label className="inline-flex items-center gap-2 text-xs cursor-pointer">
        <span className="px-3 py-1 rounded-md bg-slate-100 border border-slate-300 hover:bg-slate-200">
          {loading ? "Загрузка..." : "Добавить фото"}
        </span>
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleFilesChange}
          disabled={loading}
          className="hidden"
        />
      </label>
      {error && (
        <div className="text-[11px] text-red-500">
          Ошибка загрузки: {error}
        </div>
      )}
    </div>
  );
}
