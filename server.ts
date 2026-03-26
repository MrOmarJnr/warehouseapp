import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import cors from "cors";
import Database from "better-sqlite3";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("database.sqlite");

// Initialize database schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    companyId TEXT,
    role TEXT,
    firstName TEXT,
    lastName TEXT,
    email TEXT,
    username TEXT UNIQUE,
    password TEXT,
    phone TEXT,
    jobTitle TEXT,
    isActive INTEGER DEFAULT 1,
    lastLoginAt TEXT,
    createdAt TEXT
  );

  CREATE TABLE IF NOT EXISTS workOrders (
    id TEXT PRIMARY KEY,
    woNumber TEXT UNIQUE,
    createdBy TEXT,
    requesterCompanyId TEXT,
    serviceCompanyId TEXT,
    title TEXT,
    description TEXT,
    priority TEXT,
    category TEXT,
    currentStatus TEXT,
    serialNumber TEXT,
    pickupLocation TEXT,
    labLocation TEXT,
    returnLocation TEXT,
    assignedTo TEXT,
    requestedPickupDate TEXT,
    actualPickupDate TEXT,
    dispatchDate TEXT,
    deliveredDate TEXT,
    closedAt TEXT,
    rejectionCount INTEGER DEFAULT 0,
    isReworkRequired INTEGER DEFAULT 0,
    diagnosisInfo TEXT,
    repairInfo TEXT,
    dispatchAgentName TEXT,
    dispatchAgentPhone TEXT,
    dispatchDescription TEXT,
    acceptanceRemarks TEXT,
    rejectionReason TEXT,
    createdAt TEXT,
    updatedAt TEXT
  );

  CREATE TABLE IF NOT EXISTS workOrderItems (
    id TEXT PRIMARY KEY,
    workOrderId TEXT,
    itemName TEXT,
    itemCode TEXT,
    serialNumber TEXT,
    quantity INTEGER,
    unit TEXT,
    itemCondition TEXT,
    itemDescription TEXT,
    FOREIGN KEY(workOrderId) REFERENCES workOrders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workOrderComments (
    id TEXT PRIMARY KEY,
    workOrderId TEXT,
    userId TEXT,
    commentType TEXT,
    commentText TEXT,
    isInternal INTEGER,
    createdAt TEXT,
    FOREIGN KEY(workOrderId) REFERENCES workOrders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workOrderAttachments (
    id TEXT PRIMARY KEY,
    workOrderId TEXT,
    uploadedBy TEXT,
    attachmentType TEXT,
    fileName TEXT,
    filePath TEXT,
    mimeType TEXT,
    fileSize INTEGER,
    description TEXT,
    createdAt TEXT,
    FOREIGN KEY(workOrderId) REFERENCES workOrders(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS workOrderStatusHistory (
    id TEXT PRIMARY KEY,
    workOrderId TEXT,
    previousStatus TEXT,
    newStatus TEXT,
    changedBy TEXT,
    userName TEXT,
    changeNote TEXT,
    changedAt TEXT,
    additionalData TEXT,
    FOREIGN KEY(workOrderId) REFERENCES workOrders(id) ON DELETE CASCADE
  );
`);

// Bootstrap default admin if not exists
const adminExists = db.prepare("SELECT id FROM users WHERE username = ?").get("admin");
if (!adminExists) {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, username, password, role, firstName, lastName, email, companyId, isActive, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("admin-id", "admin", "Password123!", "SUPER_ADMIN", "Super", "Admin", "admin@logistics.com", "SYSTEM", 1, now);
  
  // Add some other roles for testing
  db.prepare(`
    INSERT INTO users (id, username, password, role, firstName, lastName, email, companyId, isActive, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("lef-admin-id", "lefadmin", "Password123!", "LEF_ADMIN", "LEF", "Admin", "lefadmin@app.local", "LEF", 1, now);
  
  db.prepare(`
    INSERT INTO users (id, username, password, role, firstName, lastName, email, companyId, isActive, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run("at-admin-id", "atadmin", "Password123!", "AT_ADMIN", "AT", "Admin", "atadmin@app.local", "AT", 1, now);
}

async function startServer() {
  const app = express();
  const PORT = process.env.PORT || 3000;

  app.use(cors());
  app.use(express.json({ limit: '50mb' }));

  // Auth Middleware (Simplified for demo)
  const authMiddleware = (req: any, res: any, next: any) => {
    const userId = req.headers['x-user-id'];
    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(userId);
    if (!user) return res.status(401).json({ error: "Unauthorized" });
    req.user = user;
    next();
  };

  // API Routes
  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (user) {
      const { password, ...userWithoutPassword } = user as any;
      res.json(userWithoutPassword);
    } else {
      res.status(401).json({ error: "Invalid username or password" });
    }
  });

  app.get("/api/users", authMiddleware, (req, res) => {
    const users = db.prepare("SELECT id, companyId, role, firstName, lastName, email, username, phone, jobTitle, isActive, lastLoginAt, createdAt FROM users").all();
    res.json(users);
  });

  app.post("/api/users", authMiddleware, (req, res) => {
    const { username, password, ...userData } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    try {
      db.prepare(`
        INSERT INTO users (id, username, password, companyId, role, firstName, lastName, email, phone, jobTitle, isActive, createdAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, 
        username, 
        password || "Password123!", 
        userData.companyId, 
        userData.role, 
        userData.firstName, 
        userData.lastName, 
        userData.email, 
        userData.phone, 
        userData.jobTitle, 
        1, 
        now
      );
      res.json({ id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Work Orders
  app.get("/api/work-orders", authMiddleware, (req, res) => {
    const workOrders = db.prepare("SELECT * FROM workOrders ORDER BY createdAt DESC").all();
    res.json(workOrders);
  });

  app.get("/api/work-orders/:id", authMiddleware, (req, res) => {
    const workOrder = db.prepare("SELECT * FROM workOrders WHERE id = ?").get(req.params.id);
    if (!workOrder) return res.status(404).json({ error: "Work order not found" });
    res.json(workOrder);
  });

  app.post("/api/work-orders", authMiddleware, (req: any, res) => {
    const { items, ...woData } = req.body;
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    
    const insertWO = db.prepare(`
      INSERT INTO workOrders (
        id, woNumber, createdBy, requesterCompanyId, serviceCompanyId, title, description, 
        priority, category, currentStatus, serialNumber, pickupLocation, labLocation, 
        returnLocation, rejectionCount, isReworkRequired, createdAt, updatedAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertItem = db.prepare(`
      INSERT INTO workOrderItems (
        id, workOrderId, itemName, itemCode, serialNumber, quantity, unit, itemCondition, itemDescription
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = db.transaction(() => {
      insertWO.run(
        id, woData.woNumber, req.user.id, woData.requesterCompanyId, woData.serviceCompanyId, 
        woData.title, woData.description, woData.priority, woData.category, 'CREATED', 
        woData.serialNumber, woData.pickupLocation, woData.labLocation, woData.returnLocation, 
        0, 0, now, now
      );

      for (const item of items) {
        insertItem.run(
          Math.random().toString(36).substr(2, 9), id, item.itemName, item.itemCode, 
          item.serialNumber, item.quantity, item.unit, item.itemCondition, item.itemDescription
        );
      }
    });

    try {
      transaction();
      res.json({ id });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  app.patch("/api/work-orders/:id", authMiddleware, (req: any, res) => {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    
    const fields = Object.keys(updates).filter(k => k !== 'id' && k !== 'items');
    if (fields.length === 0) return res.json({ success: true });

    const setClause = fields.map(f => `${f} = ?`).join(", ");
    const values = fields.map(f => updates[f]);
    values.push(now);
    values.push(id);

    try {
      db.prepare(`UPDATE workOrders SET ${setClause}, updatedAt = ? WHERE id = ?`).run(...values);
      res.json({ success: true });
    } catch (err: any) {
      res.status(400).json({ error: err.message });
    }
  });

  // Items, Comments, Attachments, History
  app.get("/api/work-orders/:id/items", authMiddleware, (req, res) => {
    const items = db.prepare("SELECT * FROM workOrderItems WHERE workOrderId = ?").all(req.params.id);
    res.json(items);
  });

  app.get("/api/work-orders/:id/comments", authMiddleware, (req, res) => {
    const comments = db.prepare("SELECT * FROM workOrderComments WHERE workOrderId = ? ORDER BY createdAt ASC").all(req.params.id);
    res.json(comments);
  });

  app.post("/api/work-orders/:id/comments", authMiddleware, (req: any, res) => {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const { commentText, commentType, isInternal } = req.body;
    
    db.prepare(`
      INSERT INTO workOrderComments (id, workOrderId, userId, commentType, commentText, isInternal, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, req.user.id, commentType, commentText, isInternal ? 1 : 0, now);
    
    res.json({ id });
  });

  app.get("/api/work-orders/:id/attachments", authMiddleware, (req, res) => {
    const attachments = db.prepare("SELECT * FROM workOrderAttachments WHERE workOrderId = ? ORDER BY createdAt DESC").all(req.params.id);
    res.json(attachments);
  });

  app.post("/api/work-orders/:id/attachments", authMiddleware, (req: any, res) => {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const { fileName, filePath, attachmentType, fileSize, mimeType, description } = req.body;
    
    db.prepare(`
      INSERT INTO workOrderAttachments (id, workOrderId, uploadedBy, attachmentType, fileName, filePath, fileSize, mimeType, description, createdAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, req.user.id, attachmentType, fileName, filePath, fileSize, mimeType, description, now);
    
    res.json({ id });
  });

  app.get("/api/work-orders/:id/history", authMiddleware, (req, res) => {
    const history = db.prepare("SELECT * FROM workOrderStatusHistory WHERE workOrderId = ? ORDER BY changedAt ASC").all(req.params.id);
    // Parse additionalData JSON
    const parsedHistory = history.map((h: any) => ({
      ...h,
      additionalData: h.additionalData ? JSON.parse(h.additionalData) : null
    }));
    res.json(parsedHistory);
  });

  app.post("/api/work-orders/:id/history", authMiddleware, (req: any, res) => {
    const id = Math.random().toString(36).substr(2, 9);
    const now = new Date().toISOString();
    const { previousStatus, newStatus, changeNote, userName, additionalData } = req.body;
    
    db.prepare(`
      INSERT INTO workOrderStatusHistory (id, workOrderId, previousStatus, newStatus, changedBy, userName, changeNote, changedAt, additionalData)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.params.id, previousStatus, newStatus, req.user.id, userName || req.user.firstName, changeNote, now, additionalData ? JSON.stringify(additionalData) : null);
    
    res.json({ id });
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
