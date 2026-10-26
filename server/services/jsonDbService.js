import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';
import { autoCategorize } from './aiService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME
  ? path.join(os.tmpdir(), 'spendx_db.json')
  : path.join(__dirname, '../data/db.json');

let memoryDbCache = null;

function emptyDbData() {
  return {
    transactions: [],
    budgets: [],
    subscriptions: [],
    goals: [],
    users: []
  };
}

function normalizeDbData(data = {}) {
  return {
    ...data,
    transactions: Array.isArray(data.transactions) ? data.transactions : [],
    budgets: Array.isArray(data.budgets) ? data.budgets : [],
    subscriptions: Array.isArray(data.subscriptions) ? data.subscriptions : [],
    goals: Array.isArray(data.goals) ? data.goals : [],
    users: Array.isArray(data.users) ? data.users : []
  };
}

function requireUserId(userId) {
  if (typeof userId !== 'string' || userId.length === 0) {
    throw new Error('Authenticated user is required for personal data access');
  }
  return userId;
}

/**
 * Initialize local database file
 */
function initDb() {
  if (memoryDbCache) return;

  const dir = path.dirname(dbFilePath);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // Ignore directory creation error in serverless
    }
  }

  if (fs.existsSync(dbFilePath)) return;

  try {
    const data = emptyDbData();
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
    memoryDbCache = data;
  } catch (error) {
    console.warn('JSON DB Service: Using empty in-memory database (disk write unavailable):', error.message);
    memoryDbCache = emptyDbData();
  }
}

/**
 * Read raw data
 */
export function readRawData() {
  if (memoryDbCache) return memoryDbCache;
  initDb();
  try {
    if (fs.existsSync(dbFilePath)) {
      const raw = fs.readFileSync(dbFilePath, 'utf-8');
      const parsed = normalizeDbData(JSON.parse(raw));
      memoryDbCache = parsed;
      return parsed;
    }
  } catch (error) {
    console.error('JSON DB Service: Failed to read local db.json; using an empty in-memory database.', error.message);
  }
  if (!memoryDbCache) memoryDbCache = emptyDbData();
  return memoryDbCache;
}

/**
 * Write raw data
 */
export function writeRawData(data) {
  memoryDbCache = data;
  try {
    fs.writeFileSync(dbFilePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    console.warn('JSON DB Service: Saved to in-memory cache (disk write unavailable):', error.message);
  }
}

export const jsonDb = {
  getTransactions: async (userId, filters = {}) => {
    const ownerId = requireUserId(userId);
    const { category, search, month, sortBy } = filters;
    const data = readRawData();
    let list = data.transactions.filter((transaction) => transaction.userId === ownerId);

    if (category) {
      list = list.filter(t => t.category === category);
    }

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(t => 
        (t.description && t.description.toLowerCase().includes(s)) ||
        (t.merchant && t.merchant.toLowerCase().includes(s)) ||
        (t.notes && t.notes.toLowerCase().includes(s))
      );
    }

    if (month) {
      list = list.filter(t => t.date && t.date.slice(0, 7) === month);
    }

    const sortComparators = {
      createdAt: (a, b) => new Date(b.createdAt || b.date) - new Date(a.createdAt || a.date),
      dateAsc: (a, b) => new Date(a.date) - new Date(b.date),
      amountDesc: (a, b) => b.amount - a.amount,
      amountAsc: (a, b) => a.amount - b.amount
    };
    const compare = sortComparators[sortBy] || ((a, b) => new Date(b.date) - new Date(a.date));
    return list.sort(compare);
  },

  createTransaction: async (userId, txData) => {
    const ownerId = requireUserId(userId);
    const { description, amount, date, paymentMethod, merchant, tags, notes, category, receiptUrl } = txData;
    const data = readRawData();

    let finalCategory = category;
    let isAuto = false;

    if (!finalCategory || finalCategory === 'Other' || finalCategory === 'Miscellaneous') {
      const aiResult = await autoCategorize(description);
      finalCategory = aiResult.category;
      isAuto = true;
    }

    let finalMerchant = merchant;
    if (!finalMerchant) {
      const aiResult = await autoCategorize(description);
      finalMerchant = aiResult.merchant;
    }

    const newTx = {
      _id: 'mock-tx-' + Date.now(),
      userId: ownerId,
      description,
      amount: parseFloat(amount),
      date: date || new Date().toISOString(),
      paymentMethod: paymentMethod || 'Cash',
      category: finalCategory,
      merchant: finalMerchant,
      receiptUrl: receiptUrl || '',
      tags: tags || [],
      notes: notes || '',
      isAutoCategorized: isAuto,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    data.transactions.push(newTx);
    writeRawData(data);
    return newTx;
  },

  updateTransaction: async (userId, id, updates) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    const idx = data.transactions.findIndex(t => t._id === id && t.userId === ownerId);
    if (idx === -1) return null;

    const original = data.transactions[idx];
    const updated = {
      ...original,
      ...updates,
      _id: original._id,
      userId: ownerId,
      amount: updates.amount ? parseFloat(updates.amount) : original.amount,
      updatedAt: new Date().toISOString()
    };

    data.transactions[idx] = updated;
    writeRawData(data);
    return updated;
  },

  deleteTransaction: async (userId, id) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    const idx = data.transactions.findIndex(t => t._id === id && t.userId === ownerId);
    if (idx === -1) return null;

    data.transactions.splice(idx, 1);
    writeRawData(data);
    return { success: true };
  },

  getBudgets: async (userId, month) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    return data.budgets.filter(b => b.userId === ownerId && b.month === month);
  },

  updateBudget: async (userId, budgetData) => {
    const ownerId = requireUserId(userId);
    const { category, limit, month } = budgetData;
    const data = readRawData();
    
    const idx = data.budgets.findIndex(b => b.userId === ownerId && b.category === category && b.month === month);
    const limitNum = parseFloat(limit);

    let updatedBudget;
    if (idx !== -1) {
      data.budgets[idx].limit = limitNum;
      updatedBudget = data.budgets[idx];
    } else {
      updatedBudget = {
        _id: 'mock-b-' + Date.now(),
        userId: ownerId,
        category,
        limit: limitNum,
        month,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      data.budgets.push(updatedBudget);
    }

    writeRawData(data);
    return updatedBudget;
  },

  getDashboardStats: async (userId, month) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    
    // Filter transactions for this month
    const thisMonthTransactions = data.transactions.filter(t => t.userId === ownerId && t.date && t.date.slice(0, 7) === month);
    
    // Filter budgets for this month
    const thisMonthBudgets = data.budgets.filter(b => b.userId === ownerId && b.month === month);

    let totalSpent = 0;
    const spendingByCategory = {};

    thisMonthTransactions.forEach(t => {
      totalSpent += t.amount;
      spendingByCategory[t.category] = (spendingByCategory[t.category] || 0) + t.amount;
    });

    const budgetLimits = {};
    thisMonthBudgets.forEach(b => {
      budgetLimits[b.category] = b.limit;
    });

    const categoriesData = Object.keys(spendingByCategory).map(cat => ({
      category: cat,
      spent: spendingByCategory[cat],
      limit: budgetLimits[cat] || 0,
      percentage: budgetLimits[cat] ? Math.round((spendingByCategory[cat] / budgetLimits[cat]) * 100) : 0
    }));

    thisMonthBudgets.forEach(b => {
      if (!spendingByCategory[b.category]) {
        categoriesData.push({
          category: b.category,
          spent: 0,
          limit: b.limit,
          percentage: 0
        });
      }
    });

    // Sort transactions by date desc and limit to 5
    const recent = [...thisMonthTransactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 5);

    return {
      totalSpent,
      categoriesData,
      recentTransactions: recent,
      transactionCount: thisMonthTransactions.length
    };
  },

  getHistoryStats: async (userId) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    const now = new Date();
    const history = [];

    // Calculate for the last 12 months
    for (let m = 11; m >= 0; m--) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() - m, 15);
      const year = targetDate.getFullYear();
      const monthIndex = targetDate.getMonth();
      const monthStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}`;

      // Sum spent
      const monthTxs = data.transactions.filter(t => t.userId === ownerId && t.date && t.date.slice(0, 7) === monthStr);
      const spent = monthTxs.reduce((sum, t) => sum + t.amount, 0);

      // Sum budget limits
      const monthBudgets = data.budgets.filter(b => b.userId === ownerId && b.month === monthStr);
      const budgetLimit = monthBudgets.reduce((sum, b) => sum + b.limit, 0);

      // Get month label (e.g. "Jul 25")
      const monthLabel = targetDate.toLocaleString('default', { month: 'short', year: '2-digit' });

      history.push({
        month: monthStr,
        label: monthLabel,
        spent: Math.round(spent),
        budget: Math.round(budgetLimit)
      });
    }

    return history;
  },

  getAllBudgets: async (userId) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    return data.budgets.filter((budget) => budget.userId === ownerId);
  },

  applyBulkBudgets: async (userId, budgetsList) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    budgetsList.forEach(b => {
      const idx = data.budgets.findIndex(x => x.userId === ownerId && x.category === b.category && x.month === b.month);
      const limitNum = parseFloat(b.limit);
      if (idx !== -1) {
        data.budgets[idx].limit = limitNum;
        data.budgets[idx].updatedAt = new Date().toISOString();
      } else {
        data.budgets.push({
          _id: 'mock-b-' + (Date.now() + Math.random()),
          userId: ownerId,
          category: b.category,
          limit: limitNum,
          month: b.month,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
    });
    writeRawData(data);
    return { success: true };
  },

  getSubscriptions: async (userId) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    return (data.subscriptions || []).filter((subscription) => subscription.userId === ownerId);
  },

  getAllSubscriptionsForScheduler: async () => {
    const data = readRawData();
    return data.subscriptions || [];
  },

  createSubscription: async (userId, subData) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    const newSub = {
      status: 'active',
      ...subData,
      _id: 'mock-sub-' + (Date.now() + Math.random()),
      userId: ownerId,
      amount: parseFloat(subData.amount),
      isEMI: subData.isEMI === true || subData.isEMI === 'true',
      tenureMonths: subData.tenureMonths ? parseInt(subData.tenureMonths) : null,
      remainingMonths: subData.remainingMonths ? parseInt(subData.remainingMonths) : null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!data.subscriptions) data.subscriptions = [];
    data.subscriptions.push(newSub);
    writeRawData(data);
    return newSub;
  },

  updateSubscription: async (userId, id, updates) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    if (!data.subscriptions) data.subscriptions = [];
    const idx = data.subscriptions.findIndex(s => s._id === id && s.userId === ownerId);
    if (idx === -1) return null;
    const original = data.subscriptions[idx];
    const updated = {
      ...original,
      ...updates,
      _id: original._id,
      userId: ownerId,
      amount: updates.amount ? parseFloat(updates.amount) : original.amount,
      isEMI: updates.isEMI !== undefined ? (updates.isEMI === true || updates.isEMI === 'true') : original.isEMI,
      tenureMonths: updates.tenureMonths !== undefined ? (updates.tenureMonths ? parseInt(updates.tenureMonths) : null) : original.tenureMonths,
      remainingMonths: updates.remainingMonths !== undefined ? (updates.remainingMonths ? parseInt(updates.remainingMonths) : null) : original.remainingMonths,
      updatedAt: new Date().toISOString()
    };
    data.subscriptions[idx] = updated;
    writeRawData(data);
    return updated;
  },

  deleteSubscription: async (userId, id) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    if (!data.subscriptions) data.subscriptions = [];
    const idx = data.subscriptions.findIndex(s => s._id === id && s.userId === ownerId);
    if (idx === -1) return null;
    data.subscriptions.splice(idx, 1);
    writeRawData(data);
    return { success: true };
  },


  getGoals: async (userId) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    return (data.goals || []).filter((goal) => goal.userId === ownerId);
  },

  createGoal: async (userId, goalData) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    const newGoal = {
      _id: 'mock-goal-' + (Date.now() + Math.random()),
      currentAmount: 0,
      isCompleted: false,
      ...goalData,
      userId: ownerId,
      targetAmount: parseFloat(goalData.targetAmount),
      contributionAmount: parseFloat(goalData.contributionAmount || 0),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (!data.goals) data.goals = [];
    data.goals.push(newGoal);
    writeRawData(data);
    return newGoal;
  },

  updateGoal: async (userId, id, updates) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    if (!data.goals) data.goals = [];
    const idx = data.goals.findIndex(g => g._id === id && g.userId === ownerId);
    if (idx === -1) return null;
    const original = data.goals[idx];
    const updated = {
      ...original,
      ...updates,
      _id: original._id,
      userId: ownerId,
      targetAmount: updates.targetAmount !== undefined ? parseFloat(updates.targetAmount) : original.targetAmount,
      currentAmount: updates.currentAmount !== undefined ? parseFloat(updates.currentAmount) : original.currentAmount,
      contributionAmount: updates.contributionAmount !== undefined ? parseFloat(updates.contributionAmount) : original.contributionAmount,
      updatedAt: new Date().toISOString()
    };
    if (updated.currentAmount >= updated.targetAmount) {
      updated.isCompleted = true;
    }
    data.goals[idx] = updated;
    writeRawData(data);
    return updated;
  },

  deleteGoal: async (userId, id) => {
    const ownerId = requireUserId(userId);
    const data = readRawData();
    if (!data.goals) data.goals = [];
    const idx = data.goals.findIndex(g => g._id === id && g.userId === ownerId);
    if (idx === -1) return null;
    data.goals.splice(idx, 1);
    writeRawData(data);
    return { success: true };
  }
};
