import { useEffect, useState } from "react";

type Feedback = {
  _id: string;
  name: string;
  message: string;
  rating?: number;
};

type FeedbackListProps = {
  refreshKey: number;
};

const FeedbackList: React.FC<FeedbackListProps> = ({ refreshKey }) => {
  const [list, setList] = useState<Feedback[]>([]);
  const [avg, setAvg] = useState<number | null>(null);

  useEffect(() => {
    fetch("/api/feedback")
      .then(res => res.json())
      .then((data: Feedback[]) => {
        setList(data);

        const rated = data.filter(f => typeof f.rating === "number");
        if (rated.length === 0) {
          setAvg(null);
        } else {
          const sum = rated.reduce((a, b) => a + (b.rating ?? 0), 0);
          setAvg(Number((sum / rated.length).toFixed(1)));
        }
      });
  }, [refreshKey]); // 🔥 ключ обновления

  return (
    <div style={{ marginTop: 40 }}>
      <h2>Отзывы</h2>

      {avg !== null ? (
        <p>Средний рейтинг: ⭐ {avg}</p>
      ) : (
        <p>Средний рейтинг: —</p>
      )}

      {list.map(f => (
        <div
          key={f._id}
          style={{ border: "1px solid #ccc", padding: 10, marginBottom: 10 }}
        >
          <strong>{f.name}</strong>
          {typeof f.rating === "number" && <> — ⭐ {f.rating}</>}
          <p>{f.message}</p>
        </div>
      ))}
    </div>
  );
};

export default FeedbackList;
