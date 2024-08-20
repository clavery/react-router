import { route } from "@react-router/dev/routes";

import { routeManifestToRoutesConfig } from "../manifest";
import { defineRoutes } from "../defineRoutes";

const clean = (obj: any) => cleanUndefined(cleanIds(obj));

const cleanUndefined = (obj: any) => JSON.parse(JSON.stringify(obj));

const cleanIds = (obj: any) =>
  JSON.parse(
    JSON.stringify(obj, function replacer(key, value) {
      return key === "id" ? undefined : value;
    })
  );

describe("routeManifestToRoutesConfig", () => {
  test("creates routes config", () => {
    let remixRoutes = routeManifestToRoutesConfig(
      defineRoutes((route) => {
        route("/", "routes/home.js");
        route("inbox", "routes/inbox.js", () => {
          route("/", "routes/inbox/index.js", { index: true });
          route(":messageId", "routes/inbox/$messageId.js", {
            caseSensitive: true,
          });
        });
      })
    );
    let routesConfig = [
      route("/", "routes/home.js"),
      route("inbox", "routes/inbox.js", [
        route("/", "routes/inbox/index.js", { index: true }),
        route(":messageId", "routes/inbox/$messageId.js", {
          caseSensitive: true,
        }),
      ]),
    ];

    expect(clean(remixRoutes)).toEqual(clean(routesConfig));

    expect(cleanUndefined(remixRoutes)).toMatchInlineSnapshot(`
      [
        {
          "file": "routes/home.js",
          "id": "routes/home",
          "path": "/",
        },
        {
          "children": [
            {
              "file": "routes/inbox/index.js",
              "id": "routes/inbox/index",
              "index": true,
              "path": "/",
            },
            {
              "caseSensitive": true,
              "file": "routes/inbox/$messageId.js",
              "id": "routes/inbox/$messageId",
              "path": ":messageId",
            },
          ],
          "file": "routes/inbox.js",
          "id": "routes/inbox",
          "path": "inbox",
        },
      ]
    `);
  });

  test("creates routes config with IDs", () => {
    let configRoutes = routeManifestToRoutesConfig(
      defineRoutes((route) => {
        route("/", "routes/home.js", { id: "home" });
      })
    );

    expect(configRoutes[0].id).toEqual("home");
  });
});
