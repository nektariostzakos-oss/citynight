/**
 * template3 — barrel of public page components (the day spa skin).
 *
 * One export per public route. The admin, API, data layer and booking engine
 * are shared with every template; only these public pages differ. The dispatch
 * that picks template3 over the salon is wired in the `demo/src/app/*` routes.
 */
export { default as Template3Home } from "./home";
export { default as Template3Services } from "./services";
export { default as Template3Gallery } from "./gallery";
export { default as Template3About } from "./about";
export { default as Template3Book } from "./book";
export { default as Template3Shop } from "./shop";
export { default as Template3Cart } from "./cart";
export { default as Template3Blog } from "./blog";
export { default as Template3Contact } from "./contact";
