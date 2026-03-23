"use client";

export default function Hero() {
  return (
    <div className="bg-purple-600 text-white p-10 text-center">
      <h1 className="text-4xl font-bold">La Piazzetta</h1>

      <p className="mt-2">
        Pizzeria da asporto e consegna a domicilio
      </p>

      <button
        onClick={() => {
          const el = document.getElementById("menu");
          if (el) {
            el.scrollIntoView({ behavior: "smooth" });
          }
        }}
        className="mt-4 bg-white text-purple-700 px-5 py-2 rounded-lg"
      >
        Ordina ora
      </button>
    </div>
  );
}
