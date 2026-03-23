import { buildTelegramOrder } from "../utils/telegram";

export default function ProductCard({ item }: any) {
  const orderText = `Ordine:\n- ${item.name}`;

  return (
    <div className="border rounded-xl p-4 shadow-sm">
      <h3 className="text-lg font-bold">{item.name}</h3>

      <p className="text-sm text-gray-600">
        {item.ingredients}
      </p>

      <p className="mt-2 font-semibold">€ {item.price}</p>

      <a
        href={buildTelegramOrder(orderText)}
        className="mt-3 inline-block bg-purple-600 text-white px-4 py-2 rounded-lg"
      >
        Ordina
      </a>
    </div>
  );
}
