const output = document.getElementById("output") as HTMLPreElement;

function appendOutput(message: string): void {
  output.textContent += message + "\n";
}

document.getElementById("btn-log")!.addEventListener("click", () => {
  console.log("button clicked: log");
  appendOutput("[log] button clicked");
});

document.getElementById("btn-warn")!.addEventListener("click", () => {
  console.warn("button clicked: warn");
  appendOutput("[warn] button clicked");
});

document.getElementById("btn-error")!.addEventListener("click", () => {
  console.error("button clicked: error");
  appendOutput("[error] button clicked");
});

document.getElementById("btn-fetch")!.addEventListener("click", async () => {
  const res = await fetch("https://httpbin.org/ip");
  const data = (await res.json()) as Record<string, unknown>;
  console.log("fetched:", data);
  appendOutput(`[fetch] ${JSON.stringify(data)}`);
});

document.getElementById("btn-throw")!.addEventListener("click", () => {
  appendOutput("[throw] throwing error...");
  throw new Error("intentional uncaught error");
});
