import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";
import {
  Search,
  Calendar,
  Users,
  Clock,
  CheckCircle,
  Printer,
  Trash2,
  Download,
  Edit,
  Save,
  X,
} from "lucide-react";

const USERNAME = "1234";
const PASSWORD = "1234";
const ORG = import.meta.env.VITE_ORG_NAME || "Just-iD Visitor";
const SITE = import.meta.env.VITE_SITE_NAME || "Global Securitech";

const dateFormatter = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Bangkok",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

function formatDateTime(isoString) {
  if (!isoString) return "";
  return dateFormatter.format(new Date(isoString));
}

function calculateDuration(checkin, checkout) {
  if (!checkin) return "—";
  const start = new Date(checkin);
  const end = checkout ? new Date(checkout) : new Date();
  const diff = Math.abs(end - start);
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  return hours === 0 ? `${minutes} นาที` : `${hours} ชม. ${minutes} นาที`;
}

export default function Report() {
  const [visitors, setVisitors] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchStart, setSearchStart] = useState("");
  const [searchEnd, setSearchEnd] = useState("");
  const [searchName, setSearchName] = useState("");
  
  // เพิ่ม State สำหรับการแก้ไข (ที่ขาดไป)
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const [countToday, setCountToday] = useState(0);
  const [countUncheckout, setCountUncheckout] = useState(0);
  const [countRange, setCountRange] = useState(0);
  const [countCheckoutToday, setCountCheckoutToday] = useState(0);

  const printedIdsRef = useRef(new Set());
  const hasPromptedRef = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;
    const u = prompt("กรอก Username:");
    const p = prompt("กรอก Password:");
    if (!(u === USERNAME && p === PASSWORD)) {
      alert("❌ Username หรือ Password ไม่ถูกต้อง");
      navigate("/");
    }
  }, [navigate]);

  const startOfDay = (d = new Date()) => {
    const x = new Date(d);
    x.setHours(0, 0, 0, 0);
    return x;
  };
  const endOfDay = (d = new Date()) => {
    const x = new Date(d);
    x.setHours(23, 59, 59, 999);
    return x;
  };

  const loadVisitors = async (startDate = "", endDate = "", name = "") => {
    let q = supabase.from("visitors").select("*").order("id", { ascending: false });
    if (startDate) q = q.gte("checkin_time", startOfDay(new Date(startDate)).toISOString());
    if (endDate) q = q.lte("checkin_time", endOfDay(new Date(endDate)).toISOString());
    if (name) q = q.ilike("full_name", `%${name}%`);
    const { data, error } = await q;
    if (!error) setVisitors(data || []);
  };

  const loadSummary = async (startDate = "", endDate = "") => {
    const tStart = startOfDay().toISOString();
    const tEnd = endOfDay().toISOString();

    const { count: cToday } = await supabase.from("visitors").select("id", { count: "exact", head: true }).gte("checkin_time", tStart).lte("checkin_time", tEnd);
    setCountToday(cToday || 0);

    const { count: cUncheck } = await supabase.from("visitors").select("id", { count: "exact", head: true }).is("checkout_time", null);
    setCountUncheckout(cUncheck || 0);

    let qRange = supabase.from("visitors").select("id", { count: "exact", head: true });
    if (startDate) qRange = qRange.gte("checkin_time", startOfDay(new Date(startDate)).toISOString());
    if (endDate) qRange = qRange.lte("checkin_time", endOfDay(new Date(endDate)).toISOString());
    const { count: cRange } = await qRange;
    setCountRange(cRange || 0);

    const { count: cOutToday } = await supabase.from("visitors").select("id", { count: "exact", head: true }).gte("checkout_time", tStart).lte("checkout_time", tEnd);
    setCountCheckoutToday(cOutToday || 0);
  };

  useEffect(() => {
    loadVisitors();
    loadSummary();
  }, []);

  useEffect(() => {
    loadSummary(searchStart, searchEnd);
  }, [searchStart, searchEnd]);

  useEffect(() => {
    const channel = supabase
      .channel("visitors-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "visitors" }, (payload) => {
        loadVisitors(searchStart, searchEnd, searchName);
        loadSummary(searchStart, searchEnd);
        if (payload.eventType === "INSERT") {
          const v = payload.new;
          if (v?.id && !printedIdsRef.current.has(v.id)) {
            printedIdsRef.current.add(v.id);
            window.open(`/print/${v.id}`, "_blank");
          }
        }
      })
      .subscribe();
    return () => supabase.removeChannel(channel);
  }, [searchStart, searchEnd, searchName]);

  // --- ACTIONS (ลบตัวที่ซ้ำออกแล้ว) ---
  const checkOut = async (id) => {
    await supabase.from("visitors").update({ checkout_time: new Date().toISOString() }).eq("id", id);
    loadVisitors(searchStart, searchEnd, searchName);
  };

  const deleteVisitor = async (ids) => {
    if (!ids.length) return alert("กรุณาเลือกรายการก่อน");
    if (!confirm("ต้องการลบรายการที่เลือกใช่หรือไม่?")) return;
    await supabase.from("visitors").delete().in("id", ids);
    setSelectedIds([]);
    loadVisitors(searchStart, searchEnd, searchName);
  };

  const translatePurpose = (p, other) => {
    const map = { delivery: "ส่งของ", meeting: "ประชุม", interview: "สัมภาษณ์งาน", customer: "ลูกค้า", maintenance: "เข้าซ่อม/บริการ", service: "เข้าซ่อม/บริการ", visit: "เยี่ยมชม" };
    return p === "other" ? other || "อื่นๆ" : map[p] || p || "";
  };

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelectedIds(selectedIds.length === visitors.length ? [] : visitors.map((v) => v.id));

  const showToday = () => {
    const t = new Date().toISOString().slice(0, 10);
    setSearchStart(t);
    setSearchEnd(t);
    loadVisitors(t, t, searchName);
  };

  const showAll = () => {
    setSearchStart("");
    setSearchEnd("");
    loadVisitors("", "", searchName);
  };

  const exportToExcel = async () => {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Visitors");
    worksheet.columns = [
      { header: "ID", key: "id", width: 10 },
      { header: "ชื่อ-นามสกุล", key: "full_name", width: 25 },
      { header: "บริษัท", key: "company", width: 20 },
      { header: "วัตถุประสงค์", key: "purpose", width: 20 },
      { header: "เวลาเข้า", key: "checkin", width: 20 },
      { header: "เวลาออก", key: "checkout", width: 20 },
    ];
    visitors.forEach(v => {
      worksheet.addRow({
        id: v.id,
        full_name: v.full_name,
        company: v.company,
        purpose: translatePurpose(v.purpose, v.other_purpose),
        checkin: formatDateTime(v.checkin_time),
        checkout: formatDateTime(v.checkout_time),
      });
    });
    const buffer = await workbook.xlsx.writeBuffer();
    saveAs(new Blob([buffer]), `Visitor_Report_${new Date().toLocaleDateString()}.xlsx`);
  };

  const startEdit = (visitor) => {
    setEditingId(visitor.id);
    setEditForm({ ...visitor });
  };

  const saveEdit = async () => {
    const { data, error } = await supabase.from("visitors").update(editForm).eq("id", editingId);
    if (!error) {
      setEditingId(null);
      loadVisitors(searchStart, searchEnd, searchName);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
      {/* Navbar */}
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-200 shadow-sm">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white"><Users /></div>
            <div>
              <div className="font-bold">{ORG}</div>
              <div className="text-xs text-gray-500">{SITE}</div>
            </div>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card title="วันนี้เช็คอิน" value={countToday} icon={<Users />} color="indigo" />
          <Card title="ยังอยู่ในพื้นที่" value={countUncheckout} icon={<Clock />} color="pink" dot />
          <Card title="เช็คเอาท์วันนี้" value={countCheckoutToday} icon={<CheckCircle />} color="emerald" />
          <Card title="รวมตามตัวกรอง" value={countRange} icon={<Calendar />} color="amber" />
        </div>

        {/* Filters */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <Input label="จากวันที่" type="date" value={searchStart} onChange={e => setSearchStart(e.target.value)} />
            <Input label="ถึงวันที่" type="date" value={searchEnd} onChange={e => setSearchEnd(e.target.value)} />
            <Input label="ค้นหาชื่อ" type="text" value={searchName} onChange={e => setSearchName(e.target.value)} icon={<Search size={18}/>} />
          </div>
          <div className="flex flex-wrap gap-2">
            <Btn onClick={showToday} label="วันนี้" color="indigo" icon={<Calendar size={16}/>} />
            <Btn onClick={showAll} label="ทั้งหมด" color="blue" icon={<Users size={16}/>} />
            <Btn onClick={exportToExcel} label="Export Excel" color="emerald" icon={<Download size={16}/>} />
            <Btn onClick={() => deleteVisitor(selectedIds)} label={`ลบ (${selectedIds.length})`} color="red" icon={<Trash2 size={16}/>} />
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-indigo-600 text-white">
                <tr>
                  <th className="p-4"><input type="checkbox" onChange={toggleSelectAll} checked={selectedIds.length === visitors.length && visitors.length > 0} /></th>
                  <th className="p-4">ID</th>
                  <th className="p-4">ชื่อ</th>
                  <th className="p-4">บริษัท</th>
                  <th className="p-4">วัตถุประสงค์</th>
                  <th className="p-4">เวลาเข้า</th>
                  <th className="p-4">เวลาออก</th>
                  <th className="p-4">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {visitors.map(v => (
                  <tr key={v.id} className={selectedIds.includes(v.id) ? "bg-indigo-50" : ""}>
                    <td className="p-4"><input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggleSelect(v.id)} /></td>
                    <td className="p-4">#{String(v.id).padStart(4, "0")}</td>
                    <td className="p-4">
                      {editingId === v.id ? 
                        <input className="border p-1 rounded" value={editForm.full_name} onChange={e => setEditForm({...editForm, full_name: e.target.value})} /> 
                        : v.full_name}
                    </td>
                    <td className="p-4">{v.company}</td>
                    <td className="p-4"><span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">{translatePurpose(v.purpose, v.other_purpose)}</span></td>
                    <td className="p-4 text-sm">{formatDateTime(v.checkin_time)}</td>
                    <td className="p-4 text-sm">{v.checkout_time ? formatDateTime(v.checkout_time) : "—"}</td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        {editingId === v.id ? (
                          <>
                            <button onClick={saveEdit} className="p-2 bg-green-500 text-white rounded-lg"><Save size={16}/></button>
                            <button onClick={() => setEditingId(null)} className="p-2 bg-gray-500 text-white rounded-lg"><X size={16}/></button>
                          </>
                        ) : (
                          <>
                            {!v.checkout_time && <button onClick={() => checkOut(v.id)} className="p-2 bg-emerald-500 text-white rounded-lg" title="เช็คเอาท์"><CheckCircle size={16}/></button>}
                            <button onClick={() => startEdit(v)} className="p-2 bg-blue-500 text-white rounded-lg"><Edit size={16}/></button>
                            <button onClick={() => window.open(`/print/${v.id}`, "_blank")} className="p-2 bg-gray-500 text-white rounded-lg"><Printer size={16}/></button>
                            <button onClick={() => deleteVisitor([v.id])} className="p-2 bg-red-500 text-white rounded-lg"><Trash2 size={16}/></button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

// Sub-components เพื่อความสะอาดของโค้ด
const Card = ({ title, value, icon, color, dot }) => (
  <div className={`bg-white p-5 rounded-2xl shadow-sm border border-${color}-100 flex items-center justify-between`}>
    <div>
      <p className="text-sm text-gray-500">{title}</p>
      <p className={`text-3xl font-bold text-${color}-600`}>{value}</p>
    </div>
    <div className={`w-12 h-12 bg-${color}-50 rounded-xl flex items-center justify-center text-${color}-600 relative`}>
      {icon}
      {dot && <span className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border-2 border-white animate-pulse"></span>}
    </div>
  </div>
);

const Input = ({ label, icon, ...props }) => (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
    <div className="relative">
      {icon && <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>}
      <input {...props} className={`w-full border rounded-xl p-2 ${icon ? 'pl-10' : ''}`} />
    </div>
  </div>
);

const Btn = ({ label, color, icon, onClick }) => (
  <button onClick={onClick} className={`px-4 py-2 bg-${color}-600 text-white rounded-xl flex items-center gap-2 hover:opacity-90 transition-opacity shadow-sm`}>
    {icon} {label}
  </button>
);