import * as path from "node:path";
import pick from "lodash/pick";
import invariant from "../invariant";

let appDirectory: string;

export function setAppDirectory(directory: string) {
  appDirectory = directory;
}

export function getAppDirectory() {
  invariant(appDirectory);
  return appDirectory;
}

export interface RouteManifestEntry {
  /**
   * The path this route uses to match on the URL pathname.
   */
  path?: string;

  /**
   * Should be `true` if it is an index route. This disallows child routes.
   */
  index?: boolean;

  /**
   * Should be `true` if the `path` is case-sensitive. Defaults to `false`.
   */
  caseSensitive?: boolean;

  /**
   * The unique id for this route, named like its `file` but without the
   * extension. So `app/routes/gists/$username.tsx` will have an `id` of
   * `routes/gists/$username`.
   */
  id: string;

  /**
   * The unique `id` for this route's parent route, if there is one.
   */
  parentId?: string;

  /**
   * The path to the entry point for this route, relative to
   * `config.appDirectory`.
   */
  file: string;
}

export interface RouteManifest {
  [routeId: string]: RouteManifestEntry;
}

export type RoutesConfig = RoutesConfigEntry[] | Promise<RoutesConfigEntry[]>;

/**
 * A route exported from the routes config file
 */
export interface RoutesConfigEntry {
  /**
   * The unique id for this route.
   */
  id?: string;

  /**
   * The path this route uses to match on the URL pathname.
   */
  path?: string;

  /**
   * Should be `true` if it is an index route. This disallows child routes.
   */
  index?: boolean;

  /**
   * Should be `true` if the `path` is case-sensitive. Defaults to `false`.
   */
  caseSensitive?: boolean;

  /**
   * The path to the entry point for this route, relative to
   * `config.appDirectory`.
   */
  file: string;

  /**
   * The child routes.
   */
  children?: RoutesConfigEntry[];
}

type CreateRoutePath = string | null | undefined;

type RequireAtLeastOne<T> = {
  [K in keyof T]-?: Required<Pick<T, K>> &
    Partial<Pick<T, Exclude<keyof T, K>>>;
}[keyof T];

const createConfigRouteOptionKeys = [
  "id",
  "index",
  "caseSensitive",
] as const satisfies Array<keyof RoutesConfigEntry>;
type CreateRouteOptions = Pick<
  RoutesConfigEntry,
  (typeof createConfigRouteOptionKeys)[number]
>;
function createRoute(
  path: CreateRoutePath,
  file: string,
  children?: RoutesConfigEntry[]
): RoutesConfigEntry;
function createRoute(
  path: CreateRoutePath,
  file: string,
  options: RequireAtLeastOne<CreateRouteOptions>,
  children?: RoutesConfigEntry[]
): RoutesConfigEntry;
function createRoute(
  path: CreateRoutePath,
  file: string,
  optionsOrChildren: CreateRouteOptions | RoutesConfigEntry[] | undefined,
  children?: RoutesConfigEntry[]
): RoutesConfigEntry {
  let options: CreateRouteOptions = {};

  if (Array.isArray(optionsOrChildren) || !optionsOrChildren) {
    children = optionsOrChildren;
  } else {
    options = optionsOrChildren;
  }

  return {
    file,
    children,
    path: path ?? undefined,
    ...pick(options, createConfigRouteOptionKeys),
  };
}

const createIndexOptionKeys = ["id"] as const satisfies Array<
  keyof RoutesConfigEntry
>;
type CreateIndexOptions = Pick<
  RoutesConfigEntry,
  (typeof createIndexOptionKeys)[number]
>;
function createIndex(
  file: string,
  options?: RequireAtLeastOne<CreateIndexOptions>
): RoutesConfigEntry {
  return {
    file,
    index: true,
    ...pick(options, createIndexOptionKeys),
  };
}

const createLayoutOptionKeys = ["id"] as const satisfies Array<
  keyof RoutesConfigEntry
>;
type CreateLayoutOptions = Pick<
  RoutesConfigEntry,
  (typeof createLayoutOptionKeys)[number]
>;
function createLayout(
  file: string,
  children?: RoutesConfigEntry[]
): RoutesConfigEntry;
function createLayout(
  file: string,
  options: RequireAtLeastOne<CreateLayoutOptions>,
  children?: RoutesConfigEntry[]
): RoutesConfigEntry;
function createLayout(
  file: string,
  optionsOrChildren: CreateLayoutOptions | RoutesConfigEntry[] | undefined,
  children?: RoutesConfigEntry[]
): RoutesConfigEntry {
  let options: CreateLayoutOptions = {};

  if (Array.isArray(optionsOrChildren) || !optionsOrChildren) {
    children = optionsOrChildren;
  } else {
    options = optionsOrChildren;
  }

  return {
    file,
    children,
    ...pick(options, createLayoutOptionKeys),
  };
}

export const route = createRoute;
export const index = createIndex;
export const layout = createLayout;

export function configRoutesToRouteManifest(
  routes: RoutesConfigEntry[],
  rootId = "root"
): RouteManifest {
  let routeManifest: RouteManifest = {};

  function walk(route: RoutesConfigEntry, parentId: string) {
    let id = route.id || createRouteId(route.file);
    let manifestItem: RouteManifestEntry = {
      id,
      parentId,
      file: route.file,
      path: route.path,
      index: route.index,
      caseSensitive: route.caseSensitive,
    };

    if (routeManifest.hasOwnProperty(id)) {
      throw new Error(
        `Unable to define routes with duplicate route id: "${id}"`
      );
    }
    routeManifest[id] = manifestItem;

    if (route.children) {
      for (let child of route.children) {
        walk(child, id);
      }
    }
  }

  for (let route of routes) {
    walk(route, rootId);
  }

  return routeManifest;
}

function createRouteId(file: string) {
  return normalizeSlashes(stripFileExtension(file));
}

function normalizeSlashes(file: string) {
  return file.split(path.win32.sep).join("/");
}

function stripFileExtension(file: string) {
  return file.replace(/\.[a-z0-9]+$/i, "");
}