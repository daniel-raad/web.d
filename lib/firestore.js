import { db } from "../firebase/clientApp"
import {
  collection,
  doc,
  getDocs,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  orderBy,
} from "firebase/firestore"

// --- Habits CRUD ---

export async function getHabits() {
  const q = query(collection(db, "habits"), orderBy("order"))
  const snap = await getDocs(q)
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }))
}

export async function addHabit({ name, emoji, order }) {
  const ref = doc(collection(db, "habits"))
  await setDoc(ref, { name, emoji: emoji || "", order, active: true })
  return ref.id
}

export async function updateHabit(id, data) {
  await updateDoc(doc(db, "habits", id), data)
}

export async function deleteHabit(id) {
  await deleteDoc(doc(db, "habits", id))
}

// --- Habit Entries ---

export async function getEntries(year, month) {
  const prefix = `${year}-${String(month).padStart(2, "0")}`
  const snap = await getDocs(collection(db, "habitEntries"))
  return snap.docs
    .filter((d) => d.id.startsWith(prefix))
    .reduce((acc, d) => {
      acc[d.id] = d.data()
      return acc
    }, {})
}

export async function toggleHabit(date, habitId, value) {
  const ref = doc(db, "habitEntries", date)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { [`habits.${habitId}`]: value })
  } else {
    await setDoc(ref, { habits: { [habitId]: value }, moment: "" })
  }
}

export async function saveMoment(date, text) {
  const ref = doc(db, "habitEntries", date)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { moment: text })
  } else {
    await setDoc(ref, { habits: {}, moment: text })
  }
}

export async function saveWeight(date, weight) {
  const ref = doc(db, "habitEntries", date)
  const snap = await getDoc(ref)
  if (snap.exists()) {
    await updateDoc(ref, { weight })
  } else {
    await setDoc(ref, { habits: {}, moment: "", weight })
  }
}

// --- Config ---

export async function getConfig() {
  const snap = await getDoc(doc(db, "habitConfig", "settings"))
  if (snap.exists()) return snap.data()
  return { targetDate: "2026-08-01", startDate: "2026-01-01" }
}

export async function saveConfig(data) {
  await setDoc(doc(db, "habitConfig", "settings"), data, { merge: true })
}
