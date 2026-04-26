export default function Home() {
  return (
    <main>
      <h1>kilog Next.js (Pages Router) example</h1>
      <button onClick={() => console.log("button clicked: log")}>console.log</button>
      <button onClick={() => console.warn("button clicked: warn")}>console.warn</button>
      <button onClick={() => console.error("button clicked: error")}>console.error</button>
      <button
        onClick={async () => {
          const res = await fetch("https://httpbin.org/ip");
          console.log("fetched:", await res.json());
        }}
      >
        fetch
      </button>
      <button
        onClick={() => {
          throw new Error("intentional uncaught error");
        }}
      >
        throw
      </button>
    </main>
  );
}
