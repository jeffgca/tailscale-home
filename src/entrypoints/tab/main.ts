import "./app.css";
import App from "./Tab.svelte";

const app = new App({
  target: document.getElementById("app")!,
});

export default app;
