import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

export async function* files(path: string): AsyncGenerator<string> {
  if (!existsSync(path)) {
    return;
  }

  const files = await fs.readdir(path);
  for (const file of files) {
    yield file;
  }

  return;
}

export function* mapBasePaths(
  basePath: string,
  source: string,
  targetLocales: string[]
) {
  const root = process.cwd();
  const sourcePath = path.resolve(root, `${basePath}/${source}`);

  console.log('test')
  for (const target of targetLocales) {
    const targetPath = path.resolve(root, `${basePath}/${target}`);

    yield {
      sourcePath,
      targetPath,
    };
  }

  return;
}

export async function* mapFullPaths(
  paths: Generator<MappedPath>,
  files: AsyncGenerator<string>
): AsyncGenerator<MappedPath> {
  for (const { sourcePath, targetPath } of paths) {
    for await (const file of files) {
      const sourceFullPath = `${sourcePath}/${file}`;
      const targetFullPath = `${targetPath}/${file}`;

      yield {
        sourcePath: existsSync(sourceFullPath) ? sourceFullPath : undefined,
        targetPath: existsSync(targetFullPath) ? targetFullPath : undefined,
      };
    }
  }
}

export async function* readMappedJson(
  paths: AsyncGenerator<MappedPath>
): AsyncGenerator<MappedJson> {
  for await (const { sourcePath, targetPath } of paths) {
    const result: MappedJson = {
      source: {
        path: sourcePath,
        json: sourcePath ? await fs.readFile(sourcePath, "utf-8") : undefined,
      },
      target: {
        path: targetPath,
        json: targetPath ? await fs.readFile(targetPath, "utf-8") : undefined,
      },
    };
    yield result;
  }

  return;
}

export async function* mapJsonToObject(
  mappedJsonList: AsyncGenerator<MappedJson>
): AsyncGenerator<MappedLocaleObj> {
  for await (const { source, target } of mappedJsonList) {
    yield {
      source: {
        path: source.path,
        data:
          typeof source.json === "string" ? JSON.parse(source.json) : undefined,
      },
      target: {
        path: target.path,
        data:
          typeof target.json === "string" ? JSON.parse(target.json) : undefined,
      },
    };
  }

  return;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function compareKey(source: any, target: any) {
  if (typeof source !== typeof target) {
    return false;
  }

  for (const key of Object.keys(source)) {
    if (!Object.prototype.hasOwnProperty.call(target, key)) {
      return false;
    }

    if (
      typeof source[key] === "object" &&
      typeof target[key] === "object" &&
      !compareKey(source[key], target[key])
    ) {
      return false;
    }
  }

  for (const key of Object.keys(target)) {
    if (!Object.prototype.hasOwnProperty.call(source, key)) {
      return false;
    }
  }

  return true;
}

export async function inspect(
  mappedLocaleObjList: AsyncGenerator<MappedLocaleObj>
): Promise<Success | Fail> {
  for await (const { source, target } of mappedLocaleObjList) {
    const isMatching = compareKey(source.data, target.data);

    if (isMatching === false) {
      return {
        type: "FAIL",
        cause: {
          sourcePath: source.path,
          targetPath: target.path,
        },
      };
    }
  }

  return {
    type: "SUCCESS",
  };
}
