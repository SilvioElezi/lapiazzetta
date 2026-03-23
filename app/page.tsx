import Hero from "../components/Hero";
import Menu from "../components/Menu";

export default function Page() {
  return (
    <main>
      <Hero />
      <div id="menu">
        <Menu />
      </div>
    </main>
  );
}
