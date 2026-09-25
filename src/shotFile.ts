import { Directory, File, Paths } from "expo-file-system";

export function keepShot(uri: string): string {
  const shots = new Directory(Paths.document, "shots");
  if (!shots.exists) {
    shots.create();
  }
  const dest = new File(shots, `${Date.now()}.jpg`);
  new File(uri).copySync(dest);
  return dest.uri;
}

export function discardShot(uri: string): void {
  const file = new File(uri);
  if (file.exists) {
    file.delete();
  }
}

export function discardShotsExcept(kept: readonly (string | null)[]): void {
  try {
    const shots = new Directory(Paths.document, "shots");
    if (!shots.exists) {
      return;
    }
    const keep = new Set(kept.filter((uri): uri is string => uri !== null));
    for (const item of shots.list()) {
      if (!(item instanceof File) || keep.has(item.uri)) {
        continue;
      }
      item.delete();
    }
  } catch {
    return;
  }
}
