import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { createGunzip } from "node:zlib";

const applicationFilePattern = /^application-(\d{4}-\d{2}-\d{2})\.log(?:\.(\d+))?(\.gz)?$/;

/** DailyRotateFile uses local filename dates unless its utc option is enabled. */
export function formatLogDate(date = new Date()) {
  if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
    throw new RangeError("Cannot format an invalid log date");
  }
  return [date.getFullYear().toString().padStart(4, "0"),
    (date.getMonth() + 1).toString().padStart(2, "0"),
    date.getDate().toString().padStart(2, "0")].join("-");
}

/** Calendar validation also prevents a query date from becoming a filesystem path. */
export function isValidLogDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

async function applicationFiles(logDir) {
  let entries;
  try {
    entries = await fs.promises.readdir(logDir, { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") return [];
    throw error;
  }
  return entries.flatMap(entry => {
    if (!entry.isFile()) return [];
    const match = applicationFilePattern.exec(entry.name);
    if (!match || !isValidLogDate(match[1])) return [];
    return [{ name: entry.name, date: match[1], part: match[2] == null ? null : BigInt(match[2]), gzip: Boolean(match[3]) }];
  });
}

export async function listLogDates(logDir) {
  const files = await applicationFiles(logDir);
  return [...new Set(files.map(file => file.date))].sort().reverse();
}

/** A rotation can replace a selected plain source with its archive after discovery. */
async function openLogSource(logDir, selected) {
  const counterpart = selected.gzip ? selected.name.slice(0, -3) : `${selected.name}.gz`;
  for (const name of [selected.name, counterpart]) {
    try {
      const handle = await fs.promises.open(path.join(logDir, name), "r");
      return { handle, name, gzip: name.endsWith(".gz") };
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
  }
  return null;
}

async function closeStream(stream) {
  if (!stream || stream.closed) return;
  const closed = new Promise(resolve => stream.once("close", resolve));
  stream.destroy();
  await closed;
}

/**
 * Stream one day's application log without buffering the file or archive.
 * File handles are owned here so early consumer returns also release resources.
 */
export async function* readLogLines(logDir, date) {
  if (!isValidLogDate(date)) throw new RangeError("Invalid log date. Use YYYY-MM-DD");
  const files = (await applicationFiles(logDir)).filter(file => file.date === date);
  const parts = new Map();
  for (const file of files.sort((a, b) => a.name.localeCompare(b.name))) {
    const key = file.part == null ? "base" : file.part.toString();
    const existing = parts.get(key);
    if (!existing || (existing.gzip && !file.gzip)) parts.set(key, file);
  }
  const sources = [...parts.values()].sort((a, b) => {
    if (a.part == null) return b.part == null ? 0 : -1;
    if (b.part == null) return 1;
    return a.part < b.part ? -1 : a.part > b.part ? 1 : 0;
  });

  for (const selected of sources) {
    const opened = await openLogSource(logDir, selected);
    if (!opened) continue;
    let source;
    let input;
    let lines;
    let failure;
    try {
      source = opened.handle.createReadStream({ autoClose: true });
      input = opened.gzip ? createGunzip() : source;
      const onError = error => {
        failure ??= error;
        lines?.close();
        if (input !== source) input.destroy();
        source.destroy();
      };
      source.on("error", onError);
      if (input !== source) {
        input.on("error", onError);
        source.pipe(input);
      }
      lines = readline.createInterface({ input, crlfDelay: Infinity });
      // readline forwards input errors; handle both emitters to avoid an
      // unhandled exception while retaining the original I/O/decompression error.
      lines.on("error", onError);
      let lineNumber = 0;
      for await (const line of lines) {
        if (failure) throw failure;
        yield { line, file: opened.name, lineNumber: ++lineNumber };
      }
      if (failure) throw failure;
    } catch (error) {
      failure ??= error;
      throw failure;
    } finally {
      lines?.close();
      try {
        await Promise.all([
          input && input !== source ? closeStream(input) : Promise.resolve(),
          closeStream(source),
        ]);
        // createReadStream normally owns the handle; this also covers a stream
        // construction failure before ownership was transferred.
        if (opened.handle.fd !== -1) await opened.handle.close();
      } catch (error) {
        if (!failure) throw error;
      }
    }
  }
}
