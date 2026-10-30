// Small Firestore-like adapter backed entirely by Firebase Realtime Database.
import { getDatabase, ref, onValue, get, set, update, remove, push, serverTimestamp as rtdbServerTimestamp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";
import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getDatabase(app);
const pathOf = (parts) => parts.filter(Boolean).join("/");
export const collection = (_db, name) => ({ path: name, kind: "collection" });
export const doc = (_db, name, id) => ({ path: pathOf([name,id]), id, kind: "doc" });
export const query = (base, ...constraints) => ({ ...base, constraints });
export const where = (field, op, value) => ({ type:"where", field, op, value });
export const orderBy = (field, direction="asc") => ({ type:"orderBy", field, direction });
const matches = (obj, c) => !c || c.type!=="where" || (c.op==="==" ? obj?.[c.field]===c.value : c.op==="!=" ? obj?.[c.field]!==c.value : true);
const sortRows = (rows, constraints=[]) => { for(const c of constraints){ if(c.type==="orderBy") rows.sort((a,b)=>{const x=a[c.field]??0,y=b[c.field]??0;return (x<y?-1:x>y?1:0)*(c.direction==="desc"?-1:1);}); } return rows; };
function snapshot(value){const obj=value||{};const docs=Object.entries(obj).map(([id,data])=>({id, ...data}));return {docs:docs.map(d=>({id:d.id,data:()=>{const x={...d};delete x.id;return x;}})),empty:docs.length===0,exists:()=>value!==null, data:()=>value};}
export function onSnapshot(q, next, error){const constraints=q.constraints||[];return onValue(ref(db,q.path), snap=>{const val=snap.val()||{};let filtered=Object.fromEntries(Object.entries(val).filter(([id,v])=>constraints.every(c=>matches(v,c))));const rows=sortRows(Object.entries(filtered).map(([id,v])=>({id,...v})),constraints);next({docs:rows.map(d=>({id:d.id,data:()=>{const x={...d};delete x.id;return x;}})),empty:!rows.length});},error);}
export async function getDoc(d){const s=await get(ref(db,d.path));const val=s.val();return {id:d.id,exists:()=>val!==null,data:()=>val};}
export async function getDocs(q){const s=await get(ref(db,q.path));const val=s.val()||{};const cs=q.constraints||[];let rows=Object.entries(val).filter(([id,v])=>cs.every(c=>matches(v,c))).map(([id,v])=>({id,...v}));rows=sortRows(rows,cs);return {docs:rows.map(d=>({id:d.id,data:()=>{const x={...d};delete x.id;return x;}})),empty:!rows.length};}
export async function addDoc(c, value){const r=push(ref(db,c.path));await set(r,value);return {id:r.key};}
export async function updateDoc(d, value){return update(ref(db,d.path),value);}
export async function deleteDoc(d){return remove(ref(db,d.path));}
export const serverTimestamp = () => rtdbServerTimestamp();
