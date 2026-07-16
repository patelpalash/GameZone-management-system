import { collection, doc, addDoc, updateDoc, deleteDoc, getDocs, query, where, Timestamp, orderBy, writeBatch } from "firebase/firestore";
import { db } from "./firebase";

// -- TYPES --
export interface Expense {
  id?: string;
  amount: number;
  category: string;
  note: string;
  paidVia?: "Cash" | "Online" | "Internal";
  createdAt: Timestamp;
  createdBy: string;
}

export interface InventoryItem {
  id: string;
  name: string;
  category: "snack" | "drink" | "other";
  costPrice: number;
  sellingPrice: number;
  stockLevel: number;
}

export interface InventorySale {
  id?: string;
  itemId: string;
  itemName: string;
  quantity: number;
  totalRevenue: number;
  totalProfit: number;
  paymentMethod: "Cash" | "UPI" | "Split";
  splitCash?: number;
  splitOnline?: number;
  createdAt: Timestamp;
}

// -- EXPENSES API --

export const logExpense = async (expense: Omit<Expense, "id" | "createdAt">) => {
  const newExpense = {
    ...expense,
    createdAt: Timestamp.now(),
  };
  const docRef = await addDoc(collection(db, "expenses"), newExpense);
  return docRef.id;
};

export const updateExpense = async (id: string, updates: Partial<Expense>) => {
  const ref = doc(db, "expenses", id);
  await updateDoc(ref, updates);
};

export const deleteExpense = async (id: string) => {
  const ref = doc(db, "expenses", id);
  await deleteDoc(ref);
};

// -- INVENTORY API --

export const addInventoryItem = async (item: Omit<InventoryItem, "id">) => {
  const docRef = await addDoc(collection(db, "inventory"), item);
  return docRef.id;
};

export const updateInventoryItem = async (id: string, updates: Partial<InventoryItem>) => {
  const ref = doc(db, "inventory", id);
  await updateDoc(ref, updates);
};

export const deleteInventoryItem = async (id: string) => {
  const ref = doc(db, "inventory", id);
  await deleteDoc(ref);
};

export const sellInventoryItem = async (
  item: InventoryItem, 
  quantity: number, 
  paymentMethod: "Cash" | "UPI" | "Split" = "Cash",
  splitCash?: number,
  splitOnline?: number
) => {
  if (item.stockLevel < quantity) {
    throw new Error("Not enough stock available");
  }

  const batch = writeBatch(db);
  
  // 1. Update stock
  const itemRef = doc(db, "inventory", item.id);
  batch.update(itemRef, {
    stockLevel: item.stockLevel - quantity
  });

  // 2. Log sale
  const saleRef = doc(collection(db, "inventory_sales"));
  const revenue = item.sellingPrice * quantity;
  const profit = (item.sellingPrice - item.costPrice) * quantity;
  
  batch.set(saleRef, {
    itemId: item.id,
    itemName: item.name,
    quantity,
    totalRevenue: revenue,
    totalProfit: profit,
    paymentMethod,
    splitCash: paymentMethod === "Split" ? (splitCash || 0) : null,
    splitOnline: paymentMethod === "Split" ? (splitOnline || 0) : null,
    createdAt: Timestamp.now()
  });

  await batch.commit();
};

export const selfUseInventoryItem = async (
  item: InventoryItem,
  quantity: number,
  usedBy: string = "admin"
) => {
  if (item.stockLevel < quantity) {
    throw new Error("Not enough stock available");
  }

  const batch = writeBatch(db);

  // 1. Deduct stock
  const itemRef = doc(db, "inventory", item.id);
  batch.update(itemRef, {
    stockLevel: item.stockLevel - quantity
  });

  // 2. Log as expense (at cost price, not selling price)
  const expenseRef = doc(collection(db, "expenses"));
  batch.set(expenseRef, {
    amount: item.costPrice * quantity,
    category: "Self Use",
    note: `Self use: ${quantity}x ${item.name}`,
    paidVia: "Internal",
    createdBy: usedBy,
    createdAt: Timestamp.now()
  });

  await batch.commit();
};

// -- FETCHING QUERIES --

export const getInventoryItems = async (): Promise<InventoryItem[]> => {
  const snap = await getDocs(collection(db, "inventory"));
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
};

export const getExpensesForDateRange = async (start: Date, end: Date): Promise<Expense[]> => {
  const q = query(
    collection(db, "expenses"),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<=", Timestamp.fromDate(end)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Expense));
};

export const getInventorySalesForDateRange = async (start: Date, end: Date): Promise<InventorySale[]> => {
  const q = query(
    collection(db, "inventory_sales"),
    where("createdAt", ">=", Timestamp.fromDate(start)),
    where("createdAt", "<=", Timestamp.fromDate(end)),
    orderBy("createdAt", "desc")
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventorySale));
};
