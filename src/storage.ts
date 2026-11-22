import type { AppData } from "./types";
import { defaultTutorLogin } from "./security";
const DB = "sky-numeracy-v1";
let connection: Promise<IDBDatabase> | undefined;
function open() {
  return (connection ??= new Promise((resolve, reject) => {
    const r = indexedDB.open(DB, 1);
    r.onupgradeneeded = () => r.result.createObjectStore("local");
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => reject(r.error);
  }));
}
export const emptyData = (): AppData => ({
  version: 1,
  profiles: [],
  selected: "",
  settings: {
    ...defaultTutorLogin,
    sessionLength: 45,
    readAloud: false,
    music: 0.25,
    sound: 0.5,
    reducedMotion: false,
    textSize: 1,
    tutorial: false,
  },
  attempts: [],
  sessions: [],
  checkpoints: {},
});
export async function readData(): Promise<AppData> {
  const db = await open();
  const data = await new Promise<AppData>((resolve, reject) => {
    const r = db.transaction("local").objectStore("local").get("app");
    r.onsuccess = () => resolve(r.result ?? emptyData());
    r.onerror = () => reject(r.error);
  });
  if (
    data.settings.tutorCredentialRevision !==
    defaultTutorLogin.tutorCredentialRevision
  ) {
    Object.assign(data.settings, defaultTutorLogin);
    await saveData(data);
  }
  return data;
}
let queue = Promise.resolve();
export function saveData(data: AppData) {
  const snapshot = structuredClone(data);
  queue = queue
    .catch(() => {})
    .then(async () => {
      const db = await open();
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction("local", "readwrite");
        tx.objectStore("local").put(snapshot, "app");
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error);
      });
    });
  return queue;
}
export function deleteStudent(data: AppData, id: string) {
  data.profiles = data.profiles.filter((p) => p.id !== id);
  data.attempts = data.attempts.filter((a) => a.studentId !== id);
  data.sessions = data.sessions.filter((s) => s.studentId !== id);
  for (const key of Object.keys(data.checkpoints))
    if (key.startsWith(id + ":")) delete data.checkpoints[key];
  if (data.selected === id) data.selected = data.profiles[0]?.id || "";
}
