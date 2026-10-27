import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for large JSON payloads (since books and covers are base64 encoded)
  app.use(express.json({ limit: "150mb" }));
  app.use(express.urlencoded({ limit: "150mb", extended: true }));

  const userDataDirRoot = path.join(process.cwd(), "UserData");

  // Safe atomic file write helper to prevent 0-byte corrupted JSON files
  function safeWriteFileSync(filePath: string, content: string | Buffer): void {
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tempPath = path.join(dir, `.tmp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
    try {
      fs.writeFileSync(tempPath, content);
      fs.renameSync(tempPath, filePath);
    } catch (err) {
      if (fs.existsSync(tempPath)) {
        try { 
          fs.unlinkSync(tempPath); 
        } catch (_cleanupErr) {
          /* ignore unlink error */
        }
      }
      throw err;
    }
  }

  // Strict username sanitization preventing path traversal and forbidden characters
  function sanitizeUsername(raw: any): string {
    if (!raw || typeof raw !== "string") return "default";
    const trimmed = raw.trim();
    // Strip traversal tokens and illegal filesystem characters
    const cleaned = trimmed
      .replace(/(\.\.[/\\]*)+/g, "_")
      .replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, "_")
      .slice(0, 64);
    if (!cleaned || cleaned === ".." || cleaned === "." || cleaned.replace(/_/g, "").length === 0) {
      return "default";
    }
    return cleaned;
  }

  // Strict book ID sanitization
  function sanitizeBookId(raw: any): string {
    return String(raw || "").replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128) || "book";
  }

  // System reserved folder/user names that must NEVER be treated as user profiles
  const SYSTEM_RESERVED_DIRS = new Set([
    "covers",
    "books",
    "shared_books",
    "shared_covers",
    "default",
    "userdata",
    "_shared_storage"
  ]);

  function isReservedProfile(name: string): boolean {
    if (!name) return true;
    const lower = name.trim().toLowerCase();
    return SYSTEM_RESERVED_DIRS.has(lower) || lower.startsWith(".");
  }

  // Strict filename sanitization preventing directory traversal
  function sanitizeFilename(raw: any): string {
    const base = path.basename(String(raw || "file"));
    return base.replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 128) || "file";
  }

  // Backward compatibility migration: if legacy files exist in Root, move them to 'default'
  const legacyUserDataFile = path.join(userDataDirRoot, "userdata.json");
  const legacyBooksDir = path.join(userDataDirRoot, "books");
  const legacyCoversDir = path.join(userDataDirRoot, "covers");
  const defaultDir = path.join(userDataDirRoot, "default");
  
  if (fs.existsSync(legacyUserDataFile) && !fs.existsSync(defaultDir)) {
    console.log("Migrating legacy single-user data to 'default' user folder...");
    try {
      fs.mkdirSync(defaultDir, { recursive: true });
      fs.renameSync(legacyUserDataFile, path.join(defaultDir, "userdata.json"));
      if (fs.existsSync(legacyBooksDir)) {
        fs.renameSync(legacyBooksDir, path.join(defaultDir, "books"));
      }
      if (fs.existsSync(legacyCoversDir)) {
        fs.renameSync(legacyCoversDir, path.join(defaultDir, "covers"));
      }
      console.log("Legacy data migration to 'default' completed successfully!");
    } catch (migError) {
      console.error("Failed to migrate legacy single-user data:", migError);
    }
  }

  // Ensure Root directory exists
  if (!fs.existsSync(userDataDirRoot)) {
    fs.mkdirSync(userDataDirRoot, { recursive: true });
  }

  // Automatic Migration: Ensure every user folder in UserData has dedicated bookmarks.json and notes.json
  try {
    const existingUserDirs = fs.readdirSync(userDataDirRoot, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(n => !isReservedProfile(n));
    
    for (const u of existingUserDirs) {
      const uDir = path.join(userDataDirRoot, u);
      const uDataFile = path.join(uDir, "userdata.json");
      const bmFile = path.join(uDir, "bookmarks.json");
      const ntFile = path.join(uDir, "notes.json");
      const cfgFile = path.join(uDir, "userconfig.json");

      if (fs.existsSync(uDataFile)) {
        try {
          const uData = JSON.parse(fs.readFileSync(uDataFile, "utf-8"));
          if (!fs.existsSync(bmFile) && uData.database?.bookmarks && Array.isArray(uData.database.bookmarks)) {
            safeWriteFileSync(bmFile, JSON.stringify(uData.database.bookmarks, null, 2));
            console.log(`Auto-created dedicated bookmarks.json for user "${u}"`);
          }
          if (!fs.existsSync(ntFile)) {
            const rawNotes = uData.notes || uData.localStorage?.[`novel_reader_notes_${u}`] || uData.localStorage?.['novel_reader_notes'];
            if (rawNotes) {
              const parsedNotes = typeof rawNotes === 'string' ? JSON.parse(rawNotes) : rawNotes;
              if (Array.isArray(parsedNotes)) {
                safeWriteFileSync(ntFile, JSON.stringify(parsedNotes, null, 2));
                console.log(`Auto-created dedicated notes.json for user "${u}"`);
              }
            }
          }
          if (!fs.existsSync(cfgFile) && uData.database?.preferences && Array.isArray(uData.database.preferences)) {
            const defaultPref = uData.database.preferences.find((p: any) => p && p.id === 'default') || uData.database.preferences[0];
            if (defaultPref) {
              safeWriteFileSync(cfgFile, JSON.stringify({ preferences: defaultPref }, null, 2));
              console.log(`Auto-created userconfig.json for user "${u}"`);
            }
          }
        } catch (e) {
          console.warn(`Could not parse userdata for user ${u} during migration:`, e);
        }
      }
    }
  } catch (migErr) {
    console.warn("Could not check user folder migrations on start:", migErr);
  }

  // Helper to resolve directory paths for a specific user safely and dynamically
  function getUserDirs(req: express.Request) {
    let rawUsername = "default";
    
    if (req.headers["x-username"]) {
      rawUsername = String(req.headers["x-username"]);
    } else if (req.query.username) {
      rawUsername = String(req.query.username);
    } else if (req.body && req.body.username) {
      rawUsername = String(req.body.username);
    }
    
    // Strict sanitization preventing path traversal
    let username = sanitizeUsername(rawUsername);
    if (!username || (isReservedProfile(username) && username.toLowerCase() !== "default")) {
      username = "default";
    }
    const resolvedRoot = path.resolve(userDataDirRoot);
    const userDir = path.resolve(userDataDirRoot, username);

    // Hard containment check
    if (!userDir.startsWith(resolvedRoot + path.sep) && userDir !== resolvedRoot) {
      throw new Error("Access denied: Invalid profile path traversal attempt");
    }
    
    const userBooksDir = path.join(userDir, "books");
    const userCoversDir = path.join(userDir, "covers");
    const userDataFile = path.join(userDir, "userdata.json");
    const userConfigFile = path.join(userDir, "userconfig.json");
    const userBookmarksFile = path.join(userDir, "bookmarks.json");
    const userNotesFile = path.join(userDir, "notes.json");
    
    // Ensure user-specific directories exist dynamically
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    if (!fs.existsSync(userBooksDir)) {
      fs.mkdirSync(userBooksDir, { recursive: true });
    }
    if (!fs.existsSync(userCoversDir)) {
      fs.mkdirSync(userCoversDir, { recursive: true });
    }
    
    return {
      username,
      userDir,
      userBooksDir,
      userCoversDir,
      userDataFile,
      userConfigFile,
      userBookmarksFile,
      userNotesFile
    };
  }

  // Get standard default payload
  function getDefaultsPayload() {
    return {
      version: 1,
      exportedAt: new Date().toISOString(),
      localStorage: {},
      database: {
        books: [],
        preferences: [
          {
            id: "default",
            fontSize: 18,
            lineHeight: 1.6,
            fontFamily: "serif",
            theme: "light",
            selectedColorTheme: "light",
            interfaceTheme: "light",
            selectedInterfaceTheme: "light",
            marginSize: "normal",
            paragraphSpacing: 1.2,
            useThemeBasedColors: true,
            brightness: 100,
            fixedTopBar: true,
            colors: {
              background: "#fdfdfd",
              text: "#1a1a1a",
              accent: "#2563eb",
              selection: "rgba(37, 99, 235, 0.2)",
              secondaryText: "#4b5563"
            },
            interfaceColors: {
              background: "#ffffff",
              text: "#1f2937",
              accent: "#2563eb",
              accentHover: "#1d4ed8",
              border: "#e5e7eb",
              secondaryText: "#6b7280",
              buttonBg: "#f3f4f6",
              buttonBgHover: "#e5e7eb"
            }
          }
        ],
        bookmarks: [],
        stats: {
          id: "default",
          totalReadingTime: 0,
          booksRead: 0,
          chaptersRead: 0,
          currentStreak: 0,
          longestStreak: 0,
          lastReadDate: null,
          history: []
        },
        chapters: [],
        covers: [],
        navigation: [],
        readingSessions: []
      }
    };
  }

  // API Route: Get UserData
  app.get("/api/userdata", (req, res) => {
    try {
      const { username, userDataFile, userBookmarksFile, userNotesFile } = getUserDirs(req);
      let data: any = null;

      if (fs.existsSync(userDataFile)) {
        const fileContent = fs.readFileSync(userDataFile, "utf-8");
        if (fileContent.trim()) {
          try {
            data = JSON.parse(fileContent);
          } catch (jsonErr) {
            console.error(`Invalid JSON in userdata.json for user ${username}, will attempt recovery:`, jsonErr);
          }
        }
      }

      // If userdata.json wasn't present or was empty, check if dedicated files exist
      if (!data) {
        if (fs.existsSync(userBookmarksFile) || fs.existsSync(userNotesFile)) {
          data = getDefaultsPayload();
        }
      }

      if (data) {
        // Synchronize bookmarks from dedicated bookmarks.json if present
        if (fs.existsSync(userBookmarksFile)) {
          try {
            const bmContent = fs.readFileSync(userBookmarksFile, "utf-8");
            if (bmContent.trim()) {
              const bmParsed = JSON.parse(bmContent);
              if (Array.isArray(bmParsed)) {
                if (!data.database) data.database = {};
                data.database.bookmarks = bmParsed;
              }
            }
          } catch (e) {
            console.warn(`Could not read bookmarks.json for user ${username}:`, e);
          }
        }

        // Synchronize notes from dedicated notes.json if present
        if (fs.existsSync(userNotesFile)) {
          try {
            const ntContent = fs.readFileSync(userNotesFile, "utf-8");
            if (ntContent.trim()) {
              const ntParsed = JSON.parse(ntContent);
              if (Array.isArray(ntParsed)) {
                data.notes = ntParsed;
                if (!data.localStorage) data.localStorage = {};
                data.localStorage[`novel_reader_notes_${username}`] = JSON.stringify(ntParsed);
                data.localStorage['novel_reader_notes'] = JSON.stringify(ntParsed);
              }
            }
          } catch (e) {
            console.warn(`Could not read notes.json for user ${username}:`, e);
          }
        }

        return res.json(data);
      }
      
      // Return empty status so client knows this user has no server backup yet
      // NEVER write blank defaults with books: [] as that would prune local books!
      return res.json({ status: "empty", database: null });
    } catch (error: any) {
      console.error("Error reading userdata:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Save UserData
  app.post("/api/userdata", (req, res) => {
    try {
      const { username, userDataFile, userBookmarksFile, userNotesFile } = getUserDirs(req);
      const data = req.body;
      
      // STRIP OUT heavy book contents (fileData) from userdata.json to keep it lightweight, high-performance, and save space
      if (data && data.database && Array.isArray(data.database.books)) {
        data.database.books = data.database.books.map((b: any) => {
          const { fileData, file, ...rest } = b;
          return rest;
        });
      }

      // Save main userdata.json
      safeWriteFileSync(userDataFile, JSON.stringify(data, null, 2));
      console.log(`Saved automatic user data backup for user "${username}" to ${userDataFile}`);

      // Save dedicated bookmarks.json for clean organization
      if (data && data.database && Array.isArray(data.database.bookmarks)) {
        try {
          safeWriteFileSync(userBookmarksFile, JSON.stringify(data.database.bookmarks, null, 2));
          console.log(`Saved dedicated bookmarks.json for user "${username}"`);
        } catch (bmErr) {
          console.error(`Failed to save bookmarks.json for user ${username}:`, bmErr);
        }
      }

      // Save dedicated notes.json for clean organization
      let notesToSave: any[] | null = null;
      if (Array.isArray(data?.notes)) {
        notesToSave = data.notes;
      } else if (data?.localStorage) {
        const userKey = `novel_reader_notes_${username}`;
        const raw = data.localStorage[userKey] || data.localStorage['novel_reader_notes'];
        if (raw) {
          try {
            const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
            if (Array.isArray(parsed)) notesToSave = parsed;
          } catch (e) {
            /* ignore malformed notes */
          }
        }
      }
      if (Array.isArray(notesToSave)) {
        try {
          safeWriteFileSync(userNotesFile, JSON.stringify(notesToSave, null, 2));
          console.log(`Saved dedicated notes.json for user "${username}"`);
        } catch (ntErr) {
          console.error(`Failed to save notes.json for user ${username}:`, ntErr);
        }
      }

      return res.json({ status: "success" });
    } catch (error: any) {
      console.error("Error saving userdata:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get Bookmarks directly
  app.get("/api/bookmarks", (req, res) => {
    try {
      const { userBookmarksFile, userDataFile } = getUserDirs(req);
      if (fs.existsSync(userBookmarksFile)) {
        const content = fs.readFileSync(userBookmarksFile, "utf-8");
        if (content.trim()) {
          try {
            return res.json({ bookmarks: JSON.parse(content) });
          } catch (e) {
            /* ignore parse error */
          }
        }
      }
      if (fs.existsSync(userDataFile)) {
        const content = fs.readFileSync(userDataFile, "utf-8");
        if (content.trim()) {
          try {
            const uData = JSON.parse(content);
            return res.json({ bookmarks: uData.database?.bookmarks || [] });
          } catch (e) {
            /* ignore parse error */
          }
        }
      }
      return res.json({ bookmarks: [] });
    } catch (e: any) {
      console.error("Error fetching bookmarks:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // API Route: Save Bookmarks directly
  app.post("/api/bookmarks", (req, res) => {
    try {
      const { username, userBookmarksFile, userDataFile } = getUserDirs(req);
      const { bookmarks } = req.body;
      if (Array.isArray(bookmarks)) {
        safeWriteFileSync(userBookmarksFile, JSON.stringify(bookmarks, null, 2));
        if (fs.existsSync(userDataFile)) {
          try {
            const uData = JSON.parse(fs.readFileSync(userDataFile, "utf-8"));
            if (!uData.database) uData.database = {};
            uData.database.bookmarks = bookmarks;
            safeWriteFileSync(userDataFile, JSON.stringify(uData, null, 2));
          } catch (err) {
            /* ignore parse error */
          }
        }
        console.log(`Updated bookmarks.json for user "${username}" (${bookmarks.length} bookmarks)`);
      }
      return res.json({ status: "success" });
    } catch (e: any) {
      console.error("Error saving bookmarks:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // API Route: Get Notes directly
  app.get("/api/notes", (req, res) => {
    try {
      const { username, userNotesFile, userDataFile } = getUserDirs(req);
      if (fs.existsSync(userNotesFile)) {
        const content = fs.readFileSync(userNotesFile, "utf-8");
        if (content.trim()) {
          try {
            return res.json({ notes: JSON.parse(content) });
          } catch (e) {
            /* ignore parse error */
          }
        }
      }
      if (fs.existsSync(userDataFile)) {
        const content = fs.readFileSync(userDataFile, "utf-8");
        if (content.trim()) {
          try {
            const uData = JSON.parse(content);
            const raw = uData.notes || uData.localStorage?.[`novel_reader_notes_${username}`] || uData.localStorage?.['novel_reader_notes'];
            if (raw) {
              const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
              if (Array.isArray(parsed)) return res.json({ notes: parsed });
            }
          } catch (e) {
            /* ignore parse error */
          }
        }
      }
      return res.json({ notes: [] });
    } catch (e: any) {
      console.error("Error fetching notes:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // API Route: Save Notes directly
  app.post("/api/notes", (req, res) => {
    try {
      const { username, userNotesFile, userDataFile } = getUserDirs(req);
      const { notes } = req.body;
      if (Array.isArray(notes)) {
        safeWriteFileSync(userNotesFile, JSON.stringify(notes, null, 2));
        if (fs.existsSync(userDataFile)) {
          try {
            const uData = JSON.parse(fs.readFileSync(userDataFile, "utf-8"));
            if (!uData.localStorage) uData.localStorage = {};
            uData.localStorage[`novel_reader_notes_${username}`] = JSON.stringify(notes);
            uData.notes = notes;
            safeWriteFileSync(userDataFile, JSON.stringify(uData, null, 2));
          } catch (err) {
            /* ignore parse error */
          }
        }
        console.log(`Updated notes.json for user "${username}" (${notes.length} notes)`);
      }
      return res.json({ status: "success" });
    } catch (e: any) {
      console.error("Error saving notes:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // API Route: Get UserConfig
  app.get("/api/userconfig", (req, res) => {
    try {
      const { username, userConfigFile } = getUserDirs(req);
      if (fs.existsSync(userConfigFile)) {
        const fileContent = fs.readFileSync(userConfigFile, "utf-8");
        if (fileContent.trim()) {
          try {
            return res.json(JSON.parse(fileContent));
          } catch (jsonErr) {
            console.error(`Invalid JSON in userconfig.json for user ${username}:`, jsonErr);
          }
        }
      }
      return res.json({ preferences: null });
    } catch (error: any) {
      console.error("Error reading userconfig:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Save UserConfig
  app.post("/api/userconfig", (req, res) => {
    try {
      const { username, userConfigFile } = getUserDirs(req);
      const data = req.body;
      safeWriteFileSync(userConfigFile, JSON.stringify(data, null, 2));
      return res.json({ status: "success" });
    } catch (error: any) {
      console.error("Error saving userconfig:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Get Profiles
  app.get("/api/profiles", (req, res) => {
    try {
      if (!fs.existsSync(userDataDirRoot)) {
        fs.mkdirSync(userDataDirRoot, { recursive: true });
      }
      const files = fs.readdirSync(userDataDirRoot, { withFileTypes: true });
      const directories = files
        .filter(f => f.isDirectory())
        .map(f => f.name)
        .filter(name => !isReservedProfile(name));
      return res.json({ profiles: directories });
    } catch (err: any) {
      console.error("Error loading profiles:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route: Rename Profile Directory
  app.post("/api/rename-profile", (req, res) => {
    try {
      const { oldName, newName } = req.body;
      if (!oldName || !newName) {
        return res.status(400).json({ error: "Missing required oldName or newName fields" });
      }

      const cleanOldName = sanitizeUsername(oldName);
      const cleanNewName = sanitizeUsername(newName);

      if (isReservedProfile(cleanOldName) || isReservedProfile(cleanNewName)) {
        return res.status(400).json({ error: "Cannot use reserved system profile name" });
      }

      if (cleanOldName === cleanNewName) {
        return res.json({ status: "success", newName: cleanNewName });
      }

      const resolvedRoot = path.resolve(userDataDirRoot);
      const oldPath = path.resolve(userDataDirRoot, cleanOldName);
      const newPath = path.resolve(userDataDirRoot, cleanNewName);

      // Hard containment check on both paths
      if (!oldPath.startsWith(resolvedRoot + path.sep) || !newPath.startsWith(resolvedRoot + path.sep)) {
        return res.status(403).json({ error: "Access denied: Invalid profile path traversal attempt" });
      }

      if (!fs.existsSync(oldPath)) {
        fs.mkdirSync(oldPath, { recursive: true });
      }

      if (fs.existsSync(newPath)) {
        // Merge books, covers, userdata, and userconfig from oldPath to newPath
        const oldBooksDir = path.join(oldPath, "books");
        const newBooksDir = path.join(newPath, "books");
        const oldCoversDir = path.join(oldPath, "covers");
        const newCoversDir = path.join(newPath, "covers");

        if (fs.existsSync(oldBooksDir)) {
          if (!fs.existsSync(newBooksDir)) fs.mkdirSync(newBooksDir, { recursive: true });
          const oldBooks = fs.readdirSync(oldBooksDir);
          for (const file of oldBooks) {
            const src = path.join(oldBooksDir, file);
            const dst = path.join(newBooksDir, file);
            if (!fs.existsSync(dst)) {
              fs.copyFileSync(src, dst);
            }
          }
        }

        if (fs.existsSync(oldCoversDir)) {
          if (!fs.existsSync(newCoversDir)) fs.mkdirSync(newCoversDir, { recursive: true });
          const oldCovers = fs.readdirSync(oldCoversDir);
          for (const file of oldCovers) {
            const src = path.join(oldCoversDir, file);
            const dst = path.join(newCoversDir, file);
            if (!fs.existsSync(dst)) {
              fs.copyFileSync(src, dst);
            }
          }
        }

        const oldUserDataFile = path.join(oldPath, "userdata.json");
        const newUserDataFile = path.join(newPath, "userdata.json");

        let oldData: any = null;
        let newData: any = null;
        if (fs.existsSync(oldUserDataFile)) {
          try {
            oldData = JSON.parse(fs.readFileSync(oldUserDataFile, "utf-8"));
          } catch (e) {
            /* ignore malformed json */
          }
        }
        if (fs.existsSync(newUserDataFile)) {
          try {
            newData = JSON.parse(fs.readFileSync(newUserDataFile, "utf-8"));
          } catch (e) {
            /* ignore malformed json */
          }
        }

        let mergedData: any = null;
        if (oldData && newData) {
          mergedData = { ...newData, ...oldData };
          mergedData.database = { ...(newData.database || {}), ...(oldData.database || {}) };

          // Merge books by ID: ensure old user books are kept and ownership migrated
          const booksMap = new Map();
          (newData.database?.books || []).forEach((b: any) => { if (b && b.id) booksMap.set(b.id, b); });
          (oldData.database?.books || []).forEach((b: any) => { 
            if (b && b.id) {
              if (!b.metadata) b.metadata = {};
              if (!b.metadata.uploadedBy || b.metadata.uploadedBy.toLowerCase() === cleanOldName.toLowerCase()) {
                b.metadata.uploadedBy = cleanNewName;
              }
              booksMap.set(b.id, b);
            }
          });
          mergedData.database.books = Array.from(booksMap.values());

          // Merge bookmarks
          const bookmarksMap = new Map();
          (newData.database?.bookmarks || []).forEach((bm: any) => { if (bm && bm.id) bookmarksMap.set(bm.id, bm); });
          (oldData.database?.bookmarks || []).forEach((bm: any) => { if (bm && bm.id) bookmarksMap.set(bm.id, bm); });
          mergedData.database.bookmarks = Array.from(bookmarksMap.values());

          mergedData.localStorage = { ...(newData.localStorage || {}), ...(oldData.localStorage || {}) };
        } else {
          mergedData = oldData || newData || getDefaultsPayload();
        }

        // CRITICAL: Update novel_reader_username and migrate scoped localStorage keys
        if (!mergedData.localStorage) mergedData.localStorage = {};
        mergedData.localStorage.novel_reader_username = cleanNewName;

        for (const k of Object.keys(mergedData.localStorage)) {
          if (k.endsWith(`_${cleanOldName}`)) {
            const updatedKey = k.replace(new RegExp(`_${cleanOldName}$`), `_${cleanNewName}`);
            mergedData.localStorage[updatedKey] = mergedData.localStorage[k];
            delete mergedData.localStorage[k];
          }
        }

        let usedList: string[] = [];
        try {
          usedList = JSON.parse(mergedData.localStorage.novel_reader_used_usernames || "[]");
        } catch (e) {
          /* ignore parse error */
        }
        if (!Array.isArray(usedList)) usedList = [];
        usedList = usedList.filter((u: string) => u && u !== cleanOldName);
        if (!usedList.includes(cleanNewName)) usedList.push(cleanNewName);
        mergedData.localStorage.novel_reader_used_usernames = JSON.stringify(usedList);

        safeWriteFileSync(newUserDataFile, JSON.stringify(mergedData, null, 2));

        const oldConfigFile = path.join(oldPath, "userconfig.json");
        const newConfigFile = path.join(newPath, "userconfig.json");
        if (fs.existsSync(oldConfigFile) && !fs.existsSync(newConfigFile)) {
          fs.copyFileSync(oldConfigFile, newConfigFile);
        }

        const oldBmFile = path.join(oldPath, "bookmarks.json");
        const newBmFile = path.join(newPath, "bookmarks.json");
        if (fs.existsSync(oldBmFile)) {
          if (!fs.existsSync(newBmFile)) {
            fs.copyFileSync(oldBmFile, newBmFile);
          } else if (mergedData.database?.bookmarks) {
            safeWriteFileSync(newBmFile, JSON.stringify(mergedData.database.bookmarks, null, 2));
          }
        }

        const oldNotesFile = path.join(oldPath, "notes.json");
        const newNotesFile = path.join(newPath, "notes.json");
        if (fs.existsSync(oldNotesFile) && !fs.existsSync(newNotesFile)) {
          fs.copyFileSync(oldNotesFile, newNotesFile);
        }

        fs.rmSync(oldPath, { recursive: true, force: true });
        console.log(`Merged and renamed profile directory from "${cleanOldName}" into "${cleanNewName}"`);
      } else {
        fs.renameSync(oldPath, newPath);

        // Update newPath/userdata.json with cleanNewName
        const newUserDataFile = path.join(newPath, "userdata.json");
        if (fs.existsSync(newUserDataFile)) {
          try {
            const uData = JSON.parse(fs.readFileSync(newUserDataFile, "utf-8"));
            if (!uData.localStorage) uData.localStorage = {};
            uData.localStorage.novel_reader_username = cleanNewName;

            for (const k of Object.keys(uData.localStorage)) {
              if (k.endsWith(`_${cleanOldName}`)) {
                const updatedKey = k.replace(new RegExp(`_${cleanOldName}$`), `_${cleanNewName}`);
                uData.localStorage[updatedKey] = uData.localStorage[k];
                delete uData.localStorage[k];
              }
            }

            let usedList: string[] = [];
            try {
              usedList = JSON.parse(uData.localStorage.novel_reader_used_usernames || "[]");
            } catch (e) {
              /* ignore parse error */
            }
            if (!Array.isArray(usedList)) usedList = [];
            usedList = usedList.filter((u: string) => u && u !== cleanOldName);
            if (!usedList.includes(cleanNewName)) usedList.push(cleanNewName);
            uData.localStorage.novel_reader_used_usernames = JSON.stringify(usedList);

            if (uData.database?.books && Array.isArray(uData.database.books)) {
              for (const b of uData.database.books) {
                if (b) {
                  if (!b.metadata) b.metadata = {};
                  if (!b.metadata.uploadedBy || b.metadata.uploadedBy.toLowerCase() === cleanOldName.toLowerCase()) {
                    b.metadata.uploadedBy = cleanNewName;
                  }
                }
              }
            }

            safeWriteFileSync(newUserDataFile, JSON.stringify(uData, null, 2));
          } catch (err) {
            console.error("Error updating renamed userdata.json:", err);
          }
        }
        console.log(`Successfully renamed profile directory from "${cleanOldName}" to "${cleanNewName}"`);
      }

      return res.json({ status: "success", newName: cleanNewName });
    } catch (err: any) {
      console.error("Error renaming profile:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route: Delete Profile Directory
  app.post("/api/delete-profile", (req, res) => {
    try {
      const { username } = req.body;
      if (!username) return res.status(400).json({ error: "Missing username" });
      const clean = sanitizeUsername(username);
      if (isReservedProfile(clean)) return res.status(400).json({ error: "Cannot delete reserved system profile" });

      const resolvedRoot = path.resolve(userDataDirRoot);
      const targetDir = path.resolve(userDataDirRoot, clean);

      // Hard containment check: must be strictly inside userDataDirRoot and not equal to it
      if (!targetDir.startsWith(resolvedRoot + path.sep)) {
        return res.status(403).json({ error: "Access denied: Invalid profile path traversal attempt" });
      }

      if (fs.existsSync(targetDir)) {
        fs.rmSync(targetDir, { recursive: true, force: true });
        console.log(`Deleted profile directory for "${clean}"`);
      }
      return res.json({ status: "success" });
    } catch (e: any) {
      console.error("Error deleting profile:", e);
      return res.status(500).json({ error: e.message });
    }
  });

  // API Route: Get books uploaded by other users for cross-profile reading
  app.get("/api/other-users-books", (req, res) => {
    try {
      const { username: currentUsername, userDataFile: currentUserDataFile, userBooksDir: currentUserBooksDir } = getUserDirs(req);
      if (!fs.existsSync(userDataDirRoot)) {
        return res.json({ books: [] });
      }

      const currentLower = (currentUsername || "default").toLowerCase();

      // Collect all book IDs owned/uploaded by current user so they NEVER appear in other users books
      const currentOwnedBookIds = new Set<string>();
      if (fs.existsSync(currentUserDataFile)) {
        try {
          const curData = JSON.parse(fs.readFileSync(currentUserDataFile, "utf-8"));
          if (curData?.database?.books && Array.isArray(curData.database.books)) {
            for (const b of curData.database.books) {
              if (b && b.id) {
                currentOwnedBookIds.add(b.id);
              }
            }
          }
        } catch (e) {
          /* ignore */
        }
      }

      if (fs.existsSync(currentUserBooksDir)) {
        try {
          const curFiles = fs.readdirSync(currentUserBooksDir);
          for (const f of curFiles) {
            const m = f.match(/^([a-zA-Z0-9_-]+)-/);
            if (m) currentOwnedBookIds.add(m[1]);
          }
        } catch (e) {
          /* ignore */
        }
      }

      const userDirs = fs.readdirSync(userDataDirRoot, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => !isReservedProfile(name) && name.toLowerCase() !== currentLower);

      const otherBooks: any[] = [];
      const seenBookIds = new Set<string>();
      const sharedBooksDir = path.join(userDataDirRoot, "shared_books");

      for (const otherUser of userDirs) {
        if (otherUser.toLowerCase() === currentLower) continue;

        const otherBooksDir = path.join(userDataDirRoot, otherUser, "books");
        const otherUserDataPath = path.join(userDataDirRoot, otherUser, "userdata.json");

        // Helper to check if book file exists on disk (either in user's books dir, shared_books dir, or anywhere)
        const hasBookFile = (bookId: string) => {
          const searchDirs = [otherBooksDir, sharedBooksDir];
          for (const dir of searchDirs) {
            if (fs.existsSync(dir)) {
              try {
                const files = fs.readdirSync(dir);
                if (files.some(f => f === bookId || f.startsWith(`${bookId}-`) || f.startsWith(`${bookId}.`) || f.includes(bookId))) {
                  return true;
                }
              } catch {
                // ignore
              }
            }
          }
          return false;
        };

        if (fs.existsSync(otherUserDataPath)) {
          try {
            const data = JSON.parse(fs.readFileSync(otherUserDataPath, "utf-8"));
            if (data?.database?.books && Array.isArray(data.database.books)) {
              for (const book of data.database.books) {
                if (book && book.id) {
                  // Verify physical book file exists on server disk
                  if (!hasBookFile(book.id)) continue;

                  const actualUploader = book.metadata?.uploadedBy || otherUser;
                  if (actualUploader.toLowerCase() === currentLower) continue;
                  if (currentOwnedBookIds.has(book.id)) continue;
                  if (seenBookIds.has(book.id)) continue;
                  seenBookIds.add(book.id);

                  otherBooks.push({
                    id: book.id,
                    title: book.title || "Untitled Book",
                    author: book.author || "Unknown Author",
                    description: book.description || "",
                    fileType: book.fileType || "epub",
                    totalChapters: book.totalChapters || 0,
                    uploadedBy: actualUploader,
                    coverUrl: `/api/cover-image/${encodeURIComponent(book.id)}?username=${encodeURIComponent(actualUploader)}`
                  });
                }
              }
            }
          } catch (e) {
            /* ignore corrupted userdata */
          }
        }
      }

      return res.json({ books: otherBooks });
    } catch (err: any) {
      console.error("Error fetching other users books:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route: Get all user data across all profiles for comprehensive multi-user export
  app.get("/api/all-userdata", (req, res) => {
    try {
      if (!fs.existsSync(userDataDirRoot)) {
        return res.json({ profiles: {} });
      }
      const dirs = fs.readdirSync(userDataDirRoot, { withFileTypes: true })
        .filter(d => d.isDirectory())
        .map(d => d.name)
        .filter(name => !isReservedProfile(name));

      const allProfiles: Record<string, any> = {};
      for (const u of dirs) {
        const uDataFile = path.join(userDataDirRoot, u, "userdata.json");
        const uConfigFile = path.join(userDataDirRoot, u, "userconfig.json");
        const uBmFile = path.join(userDataDirRoot, u, "bookmarks.json");
        const uNtFile = path.join(userDataDirRoot, u, "notes.json");
        let uData = null;
        let uConfig = null;
        let uBookmarks = null;
        let uNotes = null;
        if (fs.existsSync(uDataFile)) {
          try {
            uData = JSON.parse(fs.readFileSync(uDataFile, "utf-8"));
          } catch (e) {
            /* ignore corrupted json */
          }
        }
        if (fs.existsSync(uConfigFile)) {
          try {
            uConfig = JSON.parse(fs.readFileSync(uConfigFile, "utf-8"));
          } catch (e) {
            /* ignore corrupted json */
          }
        }
        if (fs.existsSync(uBmFile)) {
          try {
            uBookmarks = JSON.parse(fs.readFileSync(uBmFile, "utf-8"));
          } catch (e) {
            /* ignore parse error */
          }
        }
        if (fs.existsSync(uNtFile)) {
          try {
            uNotes = JSON.parse(fs.readFileSync(uNtFile, "utf-8"));
          } catch (e) {
            /* ignore parse error */
          }
        }
        allProfiles[u] = {
          userdata: uData,
          userconfig: uConfig,
          bookmarks: uBookmarks,
          notes: uNotes
        };
      }

      return res.json({ profiles: allProfiles });
    } catch (err: any) {
      console.error("Error reading all userdata:", err);
      return res.status(500).json({ error: err.message });
    }
  });

  // API Route: Save Book File Copy
  app.post("/api/upload-book", (req, res) => {
    try {
      const { username, userBooksDir } = getUserDirs(req);
      const { bookId, filename, fileData } = req.body;
      if (!bookId || !filename || !fileData) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const cleanBookId = sanitizeBookId(bookId);
      const sanitizedFilename = sanitizeFilename(filename);
      const bookPath = path.join(userBooksDir, `${cleanBookId}-${sanitizedFilename}`);
      const buffer = Buffer.from(fileData, "base64");
      safeWriteFileSync(bookPath, buffer);

      // Also save permanently to global shared_books folder so book is never lost if user deletes profile
      const sharedBooksDir = path.join(userDataDirRoot, "shared_books");
      if (!fs.existsSync(sharedBooksDir)) {
        fs.mkdirSync(sharedBooksDir, { recursive: true });
      }
      const sharedBookPath = path.join(sharedBooksDir, `${cleanBookId}-${sanitizedFilename}`);
      safeWriteFileSync(sharedBookPath, buffer);

      console.log(`Saved permanent copy of book to UserData/${username}/books/ and shared_books/`);
      return res.json({ status: "success", path: bookPath });
    } catch (error: any) {
      console.error("Error saving book copy:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Save Cover Copy
  app.post("/api/upload-cover", (req, res) => {
    try {
      const { username, userCoversDir } = getUserDirs(req);
      const { bookId, fileData } = req.body;
      if (!bookId || !fileData) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const cleanBookId = sanitizeBookId(bookId);
      const coverPath = path.join(userCoversDir, `${cleanBookId}.png`);
      const buffer = Buffer.from(fileData, "base64");
      safeWriteFileSync(coverPath, buffer);

      // Also save permanently to global shared_covers folder so cover is never lost if user deletes book
      const sharedCoversDir = path.join(userDataDirRoot, "shared_covers");
      if (!fs.existsSync(sharedCoversDir)) {
        fs.mkdirSync(sharedCoversDir, { recursive: true });
      }
      const sharedCoverPath = path.join(sharedCoversDir, `${cleanBookId}.png`);
      safeWriteFileSync(sharedCoverPath, buffer);

      console.log(`Saved permanent copy of cover to UserData/${username}/covers/ and shared_covers/`);
      return res.json({ status: "success", path: coverPath });
    } catch (error: any) {
      console.error("Error saving cover copy:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Serve Cover Copy with global UserData fallback
  app.get("/api/cover-image/:bookId", (req, res) => {
    try {
      const cleanBookId = sanitizeBookId(req.params.bookId);

      const findCoverInDir = (dir: string): string | null => {
        if (!fs.existsSync(dir)) return null;
        try {
          const files = fs.readdirSync(dir);
          const match = files.find(f => 
            f === `${cleanBookId}.png` || 
            f === `${cleanBookId}.jpg` || 
            f === `${cleanBookId}.jpeg` || 
            f === `${cleanBookId}.webp` || 
            f.startsWith(`${cleanBookId}.`) || 
            f.startsWith(`${cleanBookId}-`) || 
            f.includes(cleanBookId)
          );
          return match ? path.join(dir, match) : null;
        } catch {
          return null;
        }
      };

      // 1. Check user-specific covers folder first
      const { userCoversDir } = getUserDirs(req);
      const userCover = findCoverInDir(userCoversDir);
      if (userCover) return res.sendFile(userCover);

      // 2. Check requested username in query if specified
      if (req.query.username) {
        const u = sanitizeUsername(String(req.query.username));
        const qCover = findCoverInDir(path.join(userDataDirRoot, u, "covers"));
        if (qCover) return res.sendFile(qCover);
      }

      // 3. Check shared global covers folder
      const sharedCoversDir = path.join(userDataDirRoot, "shared_covers");
      const sharedCover = findCoverInDir(sharedCoversDir);
      if (sharedCover) return res.sendFile(sharedCover);

      // 4. Global fallback: check all user cover folders
      if (fs.existsSync(userDataDirRoot)) {
        const userDirs = fs.readdirSync(userDataDirRoot, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => path.join(userDataDirRoot, d.name, "covers"));
        for (const dir of userDirs) {
          const fallbackPath = findCoverInDir(dir);
          if (fallbackPath) return res.sendFile(fallbackPath);
        }
      }

      return res.status(404).json({ error: "Cover image copy not found on server" });
    } catch (error: any) {
      console.error("Error serving cover copy:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Delete Book File Copy
  app.post("/api/delete-book", (req, res) => {
    try {
      const { userBooksDir, userCoversDir } = getUserDirs(req);
      const { bookId } = req.body;
      if (!bookId) {
        return res.status(400).json({ error: "Missing bookId" });
      }

      const cleanBookId = sanitizeBookId(bookId);

      if (fs.existsSync(userBooksDir)) {
        const files = fs.readdirSync(userBooksDir);
        for (const file of files) {
          if (file.startsWith(`${cleanBookId}-`) || file.startsWith(`${cleanBookId}.`) || file === cleanBookId) {
            const filePath = path.join(userBooksDir, file);
            if (fs.existsSync(filePath)) {
              fs.unlinkSync(filePath);
              console.log(`Deleted copy of book from user folder: ${file}`);
            }
          }
        }
      }

      if (fs.existsSync(userCoversDir)) {
        const files = fs.readdirSync(userCoversDir);
        for (const file of files) {
          if (file.startsWith(`${cleanBookId}.`) || file.startsWith(`${cleanBookId}-`) || file === cleanBookId) {
            const coverPath = path.join(userCoversDir, file);
            if (fs.existsSync(coverPath)) {
              fs.unlinkSync(coverPath);
              console.log(`Deleted copy of cover from user folder: ${file}`);
            }
          }
        }
      }

      return res.json({ status: "success" });
    } catch (error: any) {
      console.error("Error deleting book copy:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Serve Book File Copy with shared global fallback
  app.get("/api/book-file/:bookId", (req, res) => {
    try {
      const cleanBookId = sanitizeBookId(req.params.bookId);

      const findBookInDir = (dir: string): string | null => {
        if (!fs.existsSync(dir)) return null;
        try {
          const files = fs.readdirSync(dir);
          const file = files.find(f => 
            f === cleanBookId || 
            f.startsWith(`${cleanBookId}-`) || 
            f.startsWith(`${cleanBookId}.`) || 
            f.includes(cleanBookId)
          );
          return file ? path.join(dir, file) : null;
        } catch {
          return null;
        }
      };

      // 1. Check shared global books folder first
      const sharedBooksDir = path.join(userDataDirRoot, "shared_books");
      const sharedBook = findBookInDir(sharedBooksDir);
      if (sharedBook) return res.sendFile(sharedBook);

      // 2. Check requested username in query if specified
      if (req.query.username) {
        const u = sanitizeUsername(String(req.query.username));
        const qBook = findBookInDir(path.join(userDataDirRoot, u, "books"));
        if (qBook) return res.sendFile(qBook);
      }

      // 3. Check current user books folder
      const { userBooksDir } = getUserDirs(req);
      const userBook = findBookInDir(userBooksDir);
      if (userBook) return res.sendFile(userBook);

      // 4. Global fallback: check all user book folders
      if (fs.existsSync(userDataDirRoot)) {
        const userDirs = fs.readdirSync(userDataDirRoot, { withFileTypes: true })
          .filter(d => d.isDirectory())
          .map(d => path.join(userDataDirRoot, d.name, "books"));
        for (const dir of userDirs) {
          const fb = findBookInDir(dir);
          if (fb) return res.sendFile(fb);
        }
      }

      return res.status(404).json({ error: "Book file copy not found on server" });
    } catch (error: any) {
      console.error("Error serving book file copy:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // API Route: Full System Reset - Completely wipes all profiles, user data, books and covers
  app.post("/api/reset", (req, res) => {
    try {
      console.log("Initiating 100% full system reset of all profiles, books, and UserData...");
      if (fs.existsSync(userDataDirRoot)) {
        try {
          fs.rmSync(userDataDirRoot, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
        } catch (rmErr) {
          console.warn("rmSync warning, performing manual entry removal:", rmErr);
          const entries = fs.readdirSync(userDataDirRoot, { withFileTypes: true });
          for (const entry of entries) {
            try {
              fs.rmSync(path.join(userDataDirRoot, entry.name), { recursive: true, force: true, maxRetries: 3, retryDelay: 100 });
            } catch (e) {
              console.error(`Failed to remove ${entry.name}:`, e);
            }
          }
        }
        fs.mkdirSync(userDataDirRoot, { recursive: true });
        console.log("Successfully wiped and recreated UserData root directory.");
      }
      return res.json({ status: "success", message: "All profiles and data wiped successfully." });
    } catch (error: any) {
      console.error("Error performing full reset:", error);
      return res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
