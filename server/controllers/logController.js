import path from "node:path";
import { fileURLToPath } from "node:url";
import AppError from "../utils/appError.js";
import { logger } from "../middleware/logger.js";
import {
  formatLogDate,
  isValidLogDate,
  listLogDates,
  readLogLines,
} from "../utils/logFiles.js";

const LOG_DIR = process.env.LOG_DIR || fileURLToPath(new URL("../../logs", import.meta.url));
const logTimezone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const sanitizeLogEntry = (logEntry) => {
  if (!logEntry || typeof logEntry !== "object") return logEntry;
  const { body, userAgent, ip, password, authorization, cookie, ...entry } = logEntry;
  if (entry.meta && typeof entry.meta === "object") {
    const { body: metaBody, headers, ...meta } = entry.meta;
    entry.meta = meta;
  }
  return entry;
};

// All endpoints read the same local day as the rotating logger, including archives.
async function* readEntries(date) {
  for await (const { line, file, lineNumber } of readLogLines(LOG_DIR, date)) {
    if (!line.trim()) continue;
    let entry;
    try {
      entry = JSON.parse(line);
    } catch (error) {
      logger.warn("Failed to parse log line", {
        line: lineNumber,
        error: error.message,
        file: path.basename(file),
      });
      continue;
    }
    if (entry && typeof entry === "object" && !Array.isArray(entry)) yield entry;
  }
}

function readDate(req, next) {
  const date = req.query.date ?? formatLogDate();
  if (!isValidLogDate(date)) {
    next(new AppError("Invalid date. Use a valid YYYY-MM-DD date", 400));
    return null;
  }
  return date;
}

/** Paginated, newest-first application events. An empty log day is a valid result. */
export const getAllLogs = async (req, res, next) => {
  try {
    const date = readDate(req, next);
    if (!date) return;
    const { page = 1, limit = 100, level, userId, search } = req.query;
    if (
      !/^\d+$/.test(String(page)) || !/^\d+$/.test(String(limit)) ||
      !Number.isSafeInteger(Number(page)) || !Number.isSafeInteger(Number(limit)) ||
      Number(page) < 1 || Number(limit) < 1 ||
      [level, userId, search].some((value) => value !== undefined && typeof value !== "string")
    ) {
      return next(new AppError("Invalid log pagination or filters", 400));
    }
    const pageNum = Number(page);
    const limitNum = Math.min(500, Number(limit));
    const offset = (pageNum - 1) * limitNum;
    // Retain only the newest requested window rather than loading the whole file.
    const capacity = offset + limitNum;
    const entries = [];
    let cursor = 0;
    let total = 0;
    const searchText = search?.toLowerCase();
    for await (const entry of readEntries(date)) {
      if (level && entry.level !== level) continue;
      if (userId && entry.userId !== userId) continue;
      if (searchText && !JSON.stringify(entry).toLowerCase().includes(searchText)) continue;
      const sanitized = sanitizeLogEntry(entry);
      if (entries.length < capacity) entries.push(sanitized);
      else {
        entries[cursor] = sanitized;
        cursor = (cursor + 1) % capacity;
      }
      total++;
    }
    const chronological = entries.length === capacity
      ? [...entries.slice(cursor), ...entries.slice(0, cursor)]
      : entries;
    const data = chronological.reverse().slice(offset, offset + limitNum);
    res.status(200).json({
      status: "success",
      timezone: logTimezone(),
      pagination: { page: pageNum, limit: limitNum, total, pages: Math.max(1, Math.ceil(total / limitNum)) },
      filters: { level, userId, search, date },
      results: data.length,
      data,
    });
  } catch (error) {
    next(new AppError("Error reading logs: " + error.message, 500));
  }
};

/** A missing individual event remains a 404, unlike an empty collection. */
export const getLogById = async (req, res, next) => {
  try {
    const date = readDate(req, next);
    if (!date) return;
    for await (const entry of readEntries(date)) {
      if (entry.requestId === req.params.id) {
        return res.status(200).json({ status: "success", data: sanitizeLogEntry(entry) });
      }
    }
    next(new AppError(`Log with ID ${req.params.id} not found for date ${date}`, 404));
  } catch (error) {
    next(new AppError("Error reading logs: " + error.message, 500));
  }
};

/** Available application days, including compressed and size-rotated files. */
export const getAvailableLogDates = async (req, res, next) => {
  try {
    const data = await listLogDates(LOG_DIR);
    res.status(200).json({ status: "success", results: data.length, data });
  } catch (error) {
    next(new AppError("Error reading log dates: " + error.message, 500));
  }
};

/** Summary for the same day and sources used by the event stream. */
export const getLogStats = async (req, res, next) => {
  try {
    const date = readDate(req, next);
    if (!date) return;
    const data = {
      total: 0,
      byLevel: {},
      byRoute: {},
      errorCount: 0,
      averageResponseTime: 0,
      uniqueUsers: 0,
    };
    const uniqueUsers = new Set();
    let totalResponseTime = 0;
    let responseTimeCount = 0;
    for await (const entry of readEntries(date)) {
      data.total++;
      if (typeof entry.level === "string") data.byLevel[entry.level] = (data.byLevel[entry.level] || 0) + 1;
      if (typeof entry.route === "string") {
        const route = entry.route.split("?")[0];
        data.byRoute[route] = (data.byRoute[route] || 0) + 1;
      }
      if (entry.level === "error") data.errorCount++;
      if (typeof entry.responseTime === "number" && Number.isFinite(entry.responseTime) && entry.responseTime >= 0) {
        totalResponseTime += entry.responseTime;
        responseTimeCount++;
      }
      if (entry.userId && entry.userId !== "anonymous") uniqueUsers.add(entry.userId);
    }
    data.uniqueUsers = uniqueUsers.size;
    data.averageResponseTime = responseTimeCount ? Math.round(totalResponseTime / responseTimeCount) : 0;
    res.status(200).json({ status: "success", date, timezone: logTimezone(), data });
  } catch (error) {
    next(new AppError("Error calculating log statistics: " + error.message, 500));
  }
};
