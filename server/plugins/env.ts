export default function (nitroApp) {
  nitroApp.hooks.hook("request", (event) => {
    if (event.context.cloudflare?.env) {
      globalThis.__env__ = event.context.cloudflare.env;
    }
  });
}
