import { dirname } from "node:path";
import { TrustResolver } from "../resolver/trustResolver.js";
import { normalizePath, TrustStorage } from "../storage/trustStorage.js";
import type { TrustDatabase, TrustState } from "../types/trust.js";

export class TrustManager {
  private readonly storage = new TrustStorage();
  private readonly resolver = new TrustResolver();

  async state(cwd = process.cwd()): Promise<TrustState> {
    return this.resolver.resolve(cwd, await this.storage.read());
  }

  async trustProject(cwd = process.cwd()): Promise<TrustState> {
    const database = await this.storage.read();
    const projectRoot = await this.resolver.projectRoot(cwd);
    await this.storage.write(addUnique(database, "trustedProjects", projectRoot));
    return this.state(cwd);
  }

  async trustFolder(cwd = process.cwd()): Promise<TrustState> {
    const database = await this.storage.read();
    const projectRoot = await this.resolver.projectRoot(cwd);
    const folder = dirname(projectRoot);
    await this.storage.write(addUnique(database, "trustedFolders", folder));
    return this.state(cwd);
  }

  async remove(cwd = process.cwd()): Promise<TrustState> {
    const state = await this.state(cwd);
    const database = await this.storage.read();
    const paths = [state.projectRoot, state.cwd, state.trustedPath].filter(Boolean).map(String);

    await this.storage.write({
      trustedProjects: database.trustedProjects.filter(
        (path) => !paths.includes(normalizePath(path))
      ),
      trustedFolders: database.trustedFolders.filter((path) => !paths.includes(normalizePath(path)))
    });
    return this.state(cwd);
  }

  async reset(): Promise<void> {
    await this.storage.write({ trustedProjects: [], trustedFolders: [] });
  }

  async list(): Promise<TrustDatabase> {
    return this.storage.read();
  }

  async storagePath(): Promise<string> {
    return this.storage.path();
  }
}

function addUnique(database: TrustDatabase, key: keyof TrustDatabase, path: string): TrustDatabase {
  return {
    ...database,
    [key]: [...new Set([...database[key], normalizePath(path)])]
  };
}
