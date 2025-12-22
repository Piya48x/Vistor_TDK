import { Search, Calendar, Users, Clock, CheckCircle, Printer, Trash2, Download, Home, Edit, Building2, UserCircle, RotateCcw, Loader2, Filter, Briefcase, ChevronRight, X } from "lucide-react";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../supabaseClient";
import ExcelJS from "exceljs";
import { saveAs } from "file-saver";
import { useNavigate } from "react-router-dom";

const USERNAME = "1234";
const PASSWORD = "1234";
const ORG = import.meta.env.VITE_ORG_NAME || "TDK INDUSTRIAL";

// --- Helpers ---
const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  year: "numeric", month: "2-digit", day: "2-digit",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
  hour12: false,
});

const PURPOSE_TH = {
  meeting: "ประชุมงาน",
   delivery: "ส่งของ / รับของ",   // 👈 ขาดตัวนี้
  maintenance: "ซ่อมบำรุง / ติดตั้ง",
  it_support: "แก้ไขปัญหา IT",
  system_install: "ติดตั้งระบบ / โปรแกรม",
  training: "อบรม / สอนงาน",
  audit: "ตรวจสอบ / Audit",
  inspection: "ตรวจงาน / ตรวจรับ",
  sales: "นำเสนอขาย / เสนอราคา",
  purchase: "ติดต่อจัดซื้อ",
  hr: "ติดต่อฝ่ายบุคคล",
  management: "ติดต่อผู้บริหาร",
  visit: "เข้าเยี่ยมชมบริษัท",
  emergency: "กรณีฉุกเฉิน",
  other: "อื่น ๆ",
};


const PURPOSES = [
  { value: "ประชุมงาน", label: "ประชุมงาน" },
  { value: "ซ่อมบำรุง / ติดตั้ง", label: "ซ่อมบำรุง / ติดตั้ง" },
  { value: "แก้ไขปัญหา IT", label: "แก้ไขปัญหา IT" },
  { value: "ติดตั้งระบบ / โปรแกรม", label: "ติดตั้งระบบ / โปรแกรม" },
  { value: "อบรม / สอนงาน", label: "อบรม / สอนงาน" },
  { value: "ตรวจสอบ / Audit", label: "ตรวจสอบ / Audit" },
  { value: "ตรวจงาน / ตรวจรับ", label: "ตรวจงาน / ตรวจรับ" },
  { value: "นำเสนอขาย / เสนอราคา", label: "นำเสนอขาย / เสนอราคา" },
  { value: "ติดต่อจัดซื้อ", label: "ติดต่อจัดซื้อ" },
  { value: "ติดต่อฝ่ายบุคคล", label: "ติดต่อฝ่ายบุคคล" },
  { value: "ติดต่อผู้บริหาร", label: "ติดต่อผู้บริหาร" },
  { value: "เข้าเยี่ยมชมบริษัท", label: "เข้าเยี่ยมชมบริษัท" },
  { value: "การสมัครงาน / สัมภาษณ์", label: "การสมัครงาน / สัมภาษณ์" },
  { value: "กรณีฉุกเฉิน", label: "กรณีฉุกเฉิน" },
  { value: "อื่น ๆ", label: "อื่น ๆ" }
];

const translatePurpose = (purpose, other_purpose) => {
  if (purpose === "other") return other_purpose || "อื่น ๆ";
  return PURPOSE_TH[purpose] || purpose;
};


function formatDateTime(isoString) {
  if (!isoString) return "";
  return dateFormatter.format(new Date(isoString));
}

function formatForInput(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toISOString().slice(0, 19);
}

function calculateDuration(checkin, checkout) {
  if (!checkin) return "—";
  const start = new Date(checkin);
  const end = checkout ? new Date(checkout) : new Date();
  const diffMins = Math.floor((end - start) / 60000);
  if (diffMins < 60) return `${diffMins} นาที`;
  return `${Math.floor(diffMins / 60)} ชม. ${diffMins % 60} นาที`;
}

export default function Report() {
  const [visitors, setVisitors] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchStart, setSearchStart] = useState("");
  const [searchEnd, setSearchEnd] = useState("");
  const [searchName, setSearchName] = useState("");
  const [activeFilter, setActiveFilter] = useState("TODAY");
  const [summary, setSummary] = useState({ today: 0, staying: 0, outToday: 0, all: 0 });
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const navigate = useNavigate();
  const hasPromptedRef = useRef(false);
  const printedIdsRef = useRef(new Set());

  // --- Core Loading Logic ---
  const loadVisitors = useCallback(async (filterType = activeFilter) => {
    setIsLoading(true);
    let q = supabase.from("visitors").select("*").order("id", { ascending: false });
    
    const now = new Date();
    const tStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const tEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    if (filterType === "TODAY") q = q.gte("checkin_time", tStart).lte("checkin_time", tEnd);
    else if (filterType === "STAYING") q = q.is("checkout_time", null);
    else if (filterType === "CHECKOUT_TODAY") q = q.gte("checkout_time", tStart).lte("checkout_time", tEnd);
    else if (filterType === "CUSTOM") {
      if (searchStart) q = q.gte("checkin_time", `${searchStart}T00:00:00`);
      if (searchEnd) q = q.lte("checkin_time", `${searchEnd}T23:59:59`);
      if (searchName) q = q.ilike("full_name", `%${searchName}%`);
    }

    const { data, error } = await q;
    if (!error) setVisitors(data || []);
    setTimeout(() => setIsLoading(false), 200);
  }, [activeFilter, searchStart, searchEnd, searchName]);

  const loadSummary = async () => {
    const now = new Date();
    const tStart = new Date(now.setHours(0, 0, 0, 0)).toISOString();
    const tEnd = new Date(now.setHours(23, 59, 59, 999)).toISOString();

    const [cIn, cStay, cOut, cAll] = await Promise.all([
      supabase.from("visitors").select("id", { count: "exact", head: true }).gte("checkin_time", tStart).lte("checkin_time", tEnd),
      supabase.from("visitors").select("id", { count: "exact", head: true }).is("checkout_time", null),
      supabase.from("visitors").select("id", { count: "exact", head: true }).gte("checkout_time", tStart).lte("checkout_time", tEnd),
      supabase.from("visitors").select("id", { count: "exact", head: true })
    ]);

    setSummary({
      today: cIn.count || 0,
      staying: cStay.count || 0,
      outToday: cOut.count || 0,
      all: cAll.count || 0
    });
  };

  useEffect(() => {
    if (hasPromptedRef.current) return;
    hasPromptedRef.current = true;
    const u = prompt("Username:");
    const p = prompt("Password:");
    if (!(u === USERNAME && p === PASSWORD)) {
      alert("❌ ไม่อนุญาตให้เข้าถึง");
      navigate("/");
    } else {
      loadVisitors("TODAY");
      loadSummary();
    }
  }, [navigate, loadVisitors]);

  useEffect(() => {
    const channel = supabase.channel("realtime-visitors")
      .on("postgres_changes", { event: "*", schema: "public", table: "visitors" }, (payload) => {
        loadSummary();
        loadVisitors(activeFilter);
        if (payload.eventType === "INSERT") {
          const newId = payload.new.id;
          if (!printedIdsRef.current.has(newId)) {
            printedIdsRef.current.add(newId);
            window.open(`/print/${newId}`, "_blank");
          }
        }
      }).subscribe();
    return () => supabase.removeChannel(channel);
  }, [activeFilter, loadVisitors]);

  const handleCheckOut = async (id) => {
    await supabase.from("visitors").update({ checkout_time: new Date().toISOString() }).eq("id", id);
    loadVisitors(activeFilter);
  };

  const deleteSelected = async () => {
    if (confirm(`ลบรายการที่เลือก ${selectedIds.length} รายการ?`)) {
      await supabase.from("visitors").delete().in("id", selectedIds);
      setSelectedIds([]);
      loadSummary();
      loadVisitors(activeFilter);
    }
  };

 const saveEdit = async () => {
  const { error } = await supabase.from("visitors").update({
    full_name: editForm.full_name,
    company: editForm.company,
    contact_person: editForm.contact_person,
    purpose: editForm.purpose,
    other_purpose: editForm.other_purpose,
    // ส่งค่าเวลาที่แก้ไขกลับไป
    checkin_time: editForm.checkin_time ? new Date(editForm.checkin_time).toISOString() : null,
    checkout_time: editForm.checkout_time ? new Date(editForm.checkout_time).toISOString() : null
  }).eq("id", editingId);

  if (!error) {
    setEditingId(null);
    loadSummary();
    loadVisitors(activeFilter);
  }
};

  const exportToExcel = async (ids) => {

  const rows = ids.length

    ? visitors.filter((v) => ids.includes(v.id))

    : visitors;

 

  if (!rows.length) return alert("กรุณาเลือกรายการก่อน");



  const wb = new ExcelJS.Workbook();

  const ws = wb.addWorksheet("Visitors Report");



  // --- Define Columns (เพิ่ม Duration และ ปรับหัวข้อ) ---

  ws.columns = [

    { header: "ID", key: "id", width: 10 },

    { header: "ชื่อ-นามสกุล", key: "full_name", width: 25 },

    { header: "บริษัท/หน่วยงาน", key: "company", width: 25 },

    { header: "บุคคลที่มาติดต่อ", key: "contact_person", width: 20 },

    { header: "วัตถุประสงค์", key: "purpose", width: 25 },

    { header: "ทะเบียนรถ", key: "vehicle_plate", width: 15 },

    { header: "เวลาเข้า", key: "checkin_time", width: 22 },

    { header: "เวลาออก", key: "checkout_time", width: 22 },

    { header: "ระยะเวลาที่พักอยู่", key: "duration", width: 20 }, // คอลัมน์ที่เพิ่มใหม่

    { header: "รูปถ่าย", key: "photo", width: 18 },

  ];



  // --- Header Style ---

  const headerRow = ws.getRow(1);

  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" }, size: 12 };

  headerRow.alignment = { vertical: "middle", horizontal: "center" };

  headerRow.fill = {

    type: "pattern",

    pattern: "solid",

    fgColor: { argb: "FF1E3A8A" }, // สีกรมท่า

  };

  headerRow.height = 30;

  ws.views = [{ state: "frozen", ySplit: 1 }]; // ตรึงหัวตาราง

  ws.autoFilter = `A1:I1`; // เพิ่มปุ่ม Filter (ไม่รวมคอลัมน์รูป)



  // --- Add Data Rows ---

  const PHOTO_COL = "J";



  for (const v of rows) {

    const row = ws.addRow({

      id: String(v.id).padStart(5, "0"),

      full_name: v.full_name || "",

      company: v.company || "ทั่วไป",

      contact_person: v.contact_person || "-",

      purpose: translatePurpose(v.purpose, v.other_purpose),

      vehicle_plate: v.vehicle_plate || "-",

      checkin_time: formatDateTime(v.checkin_time),

      checkout_time: v.checkout_time ? formatDateTime(v.checkout_time) : "ยังไม่ออก",

      duration: calculateDuration(v.checkin_time, v.checkout_time), // เรียกใช้ helper เดิม

      photo: "",

    });

   

    row.height = 60; // เพิ่มความสูงเพื่อให้เห็นรูปชัดขึ้น



    // จัดรูปแบบแถวสลับสี

    if (row.number % 2 === 0) {

      row.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF1F5F9" } };

    }



    // จัดวางตำแหน่งและเส้นขอบ

    row.eachCell((cell) => {

      cell.border = {

        top: { style: "thin", color: { argb: "FFCBD5E1" } },

        left: { style: "thin", color: { argb: "FFCBD5E1" } },

        bottom: { style: "thin", color: { argb: "FFCBD5E1" } },

        right: { style: "thin", color: { argb: "FFCBD5E1" } },

      };

      cell.alignment = { vertical: "middle", horizontal: "center", wrapText: true };

    });



    // --- ใส่รูป (กรณีใช้ URL จาก Supabase Storage หรือ Image URL) ---

    const imageSource = v.visitor_image || v.photo_url; // รองรับทั้ง base64 และ url

    if (imageSource) {

      try {

        let buf;

        let ext = "png";



        if (imageSource.startsWith('data:image')) {

          // ถ้าเป็น Base64

          buf = Buffer.from(imageSource.split(',')[1], 'base64');

        } else {

          // ถ้าเป็น URL

          const res = await fetch(imageSource);

          buf = await res.arrayBuffer();

        }



        const imgId = wb.addImage({ buffer: buf, extension: ext });

        ws.addImage(imgId, {

          tl: { col: 9, row: row.number - 1 },

          ext: { width: 80, height: 75 },

          editAs: 'oneCell'

        });

      } catch (err) {

        console.warn("Image Load Error:", err);

      }

    }

  }



  // --- เพิ่มส่วนสรุปข้อมูลท้ายตาราง (Summary Section) ---

  const lastRowNumber = ws.lastRow.number + 2;

  const summaryRow = ws.getRow(lastRowNumber);

 

  summaryRow.getCell(1).value = "สรุปรายงาน";

  summaryRow.getCell(1).font = { bold: true, size: 14 };

 

  const statsRow = ws.getRow(lastRowNumber + 1);

  statsRow.getCell(1).value = `จำนวนผู้ติดต่อทั้งหมด: ${rows.length} รายการ`;

  statsRow.getCell(1).font = { bold: true };

 

  const stayingCount = rows.filter(r => !r.checkout_time).length;

  const outCount = rows.length - stayingCount;



  ws.getRow(lastRowNumber + 2).getCell(1).value = `ออกแล้ว: ${outCount} | ยังไม่กลับ: ${stayingCount}`;



  // --- Save File ---

  const buf = await wb.xlsx.writeBuffer();

  const dateStr = new Date().toISOString().split('T')[0];

  saveAs(new Blob([buf]), `Visitor_Report_${ORG}_${dateStr}.xlsx`);

};

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans pb-10">
      <style>{`
        @keyframes custom-pulse {
          0% { transform: scale(0.95); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.7; }
          100% { transform: scale(0.95); opacity: 1; }
        }
        .animate-pulse-slow { animation: custom-pulse 2s infinite ease-in-out; }
      `}</style>

      {/* Header */}
      <nav className="bg-white/70 backdrop-blur-xl sticky top-0 z-[60] border-b border-slate-200/60 px-8 py-4 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-200">
            <Users size={24} strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-black text-xl tracking-tight text-slate-800 uppercase">{ORG}</h1>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Management System</p>
            </div>
          </div>
        </div>
        <div className="flex gap-3">
          {selectedIds.length > 0 && (
            <button onClick={deleteSelected} className="flex items-center gap-2 px-5 py-2.5 bg-rose-50 text-rose-600 rounded-2xl font-bold text-sm hover:bg-rose-100 transition-all border border-rose-100">
              <Trash2 size={18} /> ลบ ({selectedIds.length})
            </button>
          )}
          <button onClick={exportToExcel} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-2xl font-bold text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100">
            <Download size={18} /> Export
          </button>
          <button onClick={() => navigate("/")} className="p-2.5 bg-slate-100 text-slate-500 rounded-2xl hover:bg-slate-200 transition-all"><Home size={22} /></button>
        </div>
      </nav>

      <div className="max-w-[1500px] mx-auto p-8 space-y-8">
        {/* Stats Grid */}
     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
  {[
    { id: "TODAY", label: "Check-in วันนี้", val: summary.today, icon: <Users size={22} />, color: "indigo" },
    { id: "STAYING", label: "กำลังอยู่ในพื้นที่", val: summary.staying, icon: <Clock size={22} />, color: "rose" },
    { id: "CHECKOUT_TODAY", label: "เช็คเอาท์วันนี้", val: summary.outToday, icon: <CheckCircle size={22} />, color: "emerald" },
    { id: "ALL", label: "รายการทั้งหมด", val: summary.all, icon: <Calendar size={22} />, color: "slate" }
  ].map((item) => {
    // กำหนดชุดสี Tailwind แบบเต็ม เพื่อป้องกันปัญหาสีไม่แสดงผล
    const themeClasses = {
      indigo: { bg: "bg-indigo-50", text: "text-indigo-600", active: "bg-indigo-600", ring: "ring-indigo-50", border: "border-indigo-600" },
      rose: { bg: "bg-rose-50", text: "text-rose-600", active: "bg-rose-600", ring: "ring-rose-50", border: "border-rose-600" },
      emerald: { bg: "bg-emerald-50", text: "text-emerald-600", active: "bg-emerald-600", ring: "ring-emerald-50", border: "border-emerald-600" },
      slate: { bg: "bg-slate-50", text: "text-slate-600", active: "bg-slate-900", ring: "ring-slate-50", border: "border-slate-900" }
    };

    const theme = themeClasses[item.color];
    const isActive = activeFilter === item.id;

    return (
      <button 
        key={item.id} 
        onClick={() => { setActiveFilter(item.id); loadVisitors(item.id); }}
        className={`group relative p-6 rounded-[2.5rem] transition-all text-left bg-white border-2 
          ${isActive ? `${theme.border} ring-8 ${theme.ring}` : 'border-transparent shadow-sm hover:shadow-xl'}`}
      >
        <div className="flex justify-between items-start">
          <div>
            <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${isActive ? theme.text : 'text-slate-400'}`}>
              {item.label}
            </p>
            <p className="text-4xl font-black text-slate-800 tracking-tight">
              {item.val}
            </p>
          </div>

          {/* กล่อง Icon: ปรับขนาด p-4 และใช้ overflow-visible เพื่อไม่ให้จุดกระพริบโดนตัด */}
          <div className={`relative p-4 rounded-2xl transition-all duration-300 flex items-center justify-center
            ${isActive ? `${theme.active} text-white shadow-lg` : `${theme.bg} ${theme.text}`}`}
          >
            {item.icon}
            
            {/* จุดกระพริบ: ปรับตำแหน่งให้อยู่ "นอก" ตัวไอคอนเล็กน้อย (ขอบขวาบนของกล่อง) */}
            {item.id === "STAYING" && summary.staying > 0 && (
              <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 z-20">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-rose-600 border-2 border-white"></span>
              </span>
            )}
          </div>
        </div>
      </button>
    );
  })}
</div>

        {/* Filter Bar */}
        <div className="bg-white p-4 rounded-[2.5rem] shadow-sm border border-slate-200/50 flex flex-wrap items-center gap-4">
          <div className="flex-1 min-w-[300px] relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input type="text" placeholder="ค้นหาชื่อผู้ติดต่อ หรือบริษัท..." value={searchName} onChange={e => setSearchName(e.target.value)}
              className="w-full pl-14 pr-6 py-4 bg-slate-50 rounded-[1.8rem] outline-none border-2 border-transparent focus:border-indigo-100 focus:bg-white transition-all font-bold" />
          </div>
          <div className="flex items-center gap-3 bg-slate-50 p-2 rounded-[2rem]">
             <input type="date" value={searchStart} onChange={e => setSearchStart(e.target.value)} className="bg-transparent px-4 py-2 text-sm font-bold outline-none" />
             <ChevronRight size={16} className="text-slate-300" />
             <input type="date" value={searchEnd} onChange={e => setSearchEnd(e.target.value)} className="bg-transparent px-4 py-2 text-sm font-bold outline-none" />
          </div>
          <button onClick={() => { setActiveFilter("CUSTOM"); loadVisitors("CUSTOM"); }} className="px-8 py-4 bg-slate-900 text-white rounded-[1.8rem] font-black text-sm hover:bg-indigo-600 transition-all shadow-lg">เรียกดูข้อมูล</button>
          <button onClick={() => { setSearchName(""); setSearchStart(""); setSearchEnd(""); setActiveFilter("TODAY"); loadVisitors("TODAY"); }} className="p-4 bg-slate-100 text-slate-400 rounded-[1.8rem] hover:text-rose-500 transition-all"><RotateCcw size={20}/></button>
        </div>

       {/* --- ส่วนที่ต้องนำไปวาง (อยู่ใต้ Filter Bar) --- */}

<div className="flex flex-wrap items-center gap-3 px-4 animate-in slide-in-from-left">
  {/* 1. ป้ายบอกสถานะการกรองข้อมูลปัจจุบัน */}
  <div className="px-4 py-1.5 bg-indigo-600 text-white rounded-full text-[10px] font-black uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-indigo-100">
    <Filter size={12}/> 
    {activeFilter === "TODAY" && "รายการผู้ติดต่อวันนี้"}
    {activeFilter === "STAYING" && "รายการที่ยังไม่ Check-out"}
    {activeFilter === "CHECKOUT_TODAY" && "รายการเช็คเอาท์วันนี้"}
    {activeFilter === "ALL" && "รายการทั้งหมด"}
    {activeFilter === "CUSTOM" && "ผลการค้นหาแบบกำหนดเอง"}
  </div>

  {/* 2. ป้ายแจ้งเตือนคนยังไม่กลับ + จุดกระพริบบนนาฬิกา */}
  {summary.staying > 0 && (
    <div className="px-4 py-1.5 bg-rose-50 text-rose-600 rounded-full text-[11px] font-bold flex items-center gap-3 border border-rose-100 shadow-sm">
      <div className="relative">
        <Clock size={16} className="text-rose-500" />
        {/* จุดสีแดงกระพริบที่มุมไอคอนนาฬิกา */}
        <span className="absolute -top-1 -right-1 flex h-2 w-2">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-600"></span>
        </span>
      </div>
      <span className="tracking-tight">
        มีผู้ยังไม่กลับ <span className="text-sm font-black ml-1">{summary.staying}</span> ท่าน
      </span>
    </div>
  )}

  {/* 3. จำนวนรายการทั้งหมด (ชิดขวาสุด) */}
  <div className="ml-auto px-4 py-1.5 bg-white border border-slate-200 text-slate-600 rounded-full text-[11px] font-bold flex items-center gap-2 shadow-sm">
    พบทั้งหมด <span className="text-indigo-600 font-black text-sm">{visitors.length}</span> รายการ
  </div>
</div>

{/* --- จบส่วนที่วาง --- */}

        {/* Main Content Table */}
        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200/60 border border-white overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="p-8 w-16">
                    <input type="checkbox" checked={visitors.length > 0 && selectedIds.length === visitors.length} 
                      onChange={() => setSelectedIds(selectedIds.length === visitors.length ? [] : visitors.map(v => v.id))} className="w-5 h-5 rounded-lg accent-indigo-600 cursor-pointer" />
                  </th>
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">ข้อมูลผู้ติดต่อ</th>
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">บริษัท & จุดประสงค์ </th>
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">บันทึกเวลา</th>
                  <th className="py-6 px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] text-center">จัดการ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr><td colSpan="5" className="p-32 text-center"><Loader2 className="animate-spin mx-auto text-indigo-500" size={48} /></td></tr>
                ) : (
                  visitors.map((v) => (
                    <tr key={v.id} className={`group hover:bg-indigo-50/20 transition-all ${selectedIds.includes(v.id) ? 'bg-indigo-50/40' : ''}`}>
                      <td className="p-8 text-center">
                        <input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => setSelectedIds(prev => prev.includes(v.id) ? prev.filter(i => i !== v.id) : [...prev, v.id])} className="w-5 h-5 rounded-lg accent-indigo-600 cursor-pointer" />
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex flex-col gap-1">
                          <span className="text-[9px] font-black bg-slate-100 text-slate-500 w-fit px-2 py-0.5 rounded-full mb-1 tracking-tighter">REF-ID: {v.id}</span>
                          <p className="font-black text-slate-800 text-base flex items-center gap-2">
                            {v.full_name}
                            {!v.checkout_time && (
                              <span className="flex h-2 w-2 relative">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 text-slate-400">
                            <UserCircle size={14}/>
                            <p className="text-[11px] font-bold">ติดต่อ: {v.contact_person || "-"}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex flex-col gap-2">
                          <div className="flex items-center gap-2 text-slate-700 font-black text-sm tracking-tight">
                            <Building2 size={16} className="text-indigo-400"/> {v.company || "ทั่วไป"}
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Briefcase size={12} className="text-slate-300"/>
                            <span className="text-[10px] font-black text-slate-500 uppercase">{translatePurpose(v.purpose, v.other_purpose)}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <div className="grid grid-cols-1 gap-2">
                          <div className="flex items-center gap-3 bg-emerald-50 w-fit pr-4 pl-1 py-1 rounded-xl">
                            <span className="bg-emerald-500 text-white text-[9px] font-black px-2 py-1 rounded-lg">IN</span>
                            <span className="text-xs font-mono font-bold text-emerald-700">{formatDateTime(v.checkin_time)}</span>
                          </div>
                          <div className={`flex items-center gap-3 w-fit pr-4 pl-1 py-1 rounded-xl ${v.checkout_time ? 'bg-rose-50' : 'bg-slate-50'}`}>
                            <span className={`${v.checkout_time ? 'bg-rose-500' : 'bg-slate-300'} text-white text-[9px] font-black px-2 py-1 rounded-lg`}>OUT</span>
                            <span className={`text-xs font-mono font-bold ${v.checkout_time ? 'text-rose-700' : 'text-slate-400'}`}>{v.checkout_time ? formatDateTime(v.checkout_time) : "STAYING"}</span>
                          </div>
                          <p className="text-[10px] font-black text-indigo-500 flex items-center gap-1 ml-1"><Clock size={12}/> {calculateDuration(v.checkin_time, v.checkout_time)}</p>
                        </div>
                      </td>
                      <td className="py-6 px-4">
                        <div className="flex justify-center gap-2">
                          {!v.checkout_time && (
                            <button onClick={() => handleCheckOut(v.id)} className="p-3 bg-emerald-500 text-white rounded-2xl shadow-lg hover:bg-emerald-600 transition-all hover:scale-105 active:scale-95" title="Check-out">
                              <CheckCircle size={20} />
                            </button>
                          )}
                          <button onClick={() => { setEditingId(v.id); setEditForm({...v, checkin_time: formatForInput(v.checkin_time), checkout_time: v.checkout_time ? formatForInput(v.checkout_time) : ""}); }} 
                            className="p-3 bg-white border-2 border-slate-100 text-indigo-600 rounded-2xl hover:border-indigo-200 hover:bg-indigo-50 transition-all"><Edit size={20} /></button>
                          <button onClick={() => window.open(`/print/${v.id}`, "_blank")} className="p-3 bg-slate-900 text-white rounded-2xl shadow-lg hover:bg-black transition-all"><Printer size={20} /></button>
                          <button onClick={async () => { if(confirm("ลบข้อมูล?")) { await supabase.from("visitors").delete().eq("id", v.id); loadSummary(); loadVisitors(activeFilter); } }} 
                            className="p-3 text-rose-300 hover:text-rose-600 transition-colors"><Trash2 size={20} /></button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Edit Modal (เช่นเดิม) */}
     {/* Edit Modal */}
{/* Edit Modal */}
{editingId && (
  <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-6">
    <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border border-white animate-in zoom-in-95 duration-200">
      <div className="bg-indigo-600 p-8 text-white flex justify-between items-center">
        <h2 className="text-2xl font-black tracking-tight flex items-center gap-3"><Edit size={28}/> แก้ไขข้อมูล</h2>
        <button onClick={() => setEditingId(null)} className="p-3 bg-white/10 rounded-2xl hover:bg-white/20 transition-all"><X/></button>
      </div>
      
      <div className="p-10 space-y-6 overflow-y-auto max-h-[80vh]">
        <div className="grid grid-cols-2 gap-6">
          {/* ชื่อ-นามสกุล */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 ml-2 uppercase">ชื่อ-นามสกุล</p>
            <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={editForm.full_name || ""} onChange={e => setEditForm({...editForm, full_name: e.target.value})} />
          </div>

          {/* บริษัท */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 ml-2 uppercase">บริษัท</p>
            <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" value={editForm.company || ""} onChange={e => setEditForm({...editForm, company: e.target.value})} />
          </div>

          {/* 📍 แก้ไขเวลาเข้า (เพิ่มใหม่) */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-indigo-500 ml-2 uppercase">เวลาเข้า (Check-in)</p>
            <input type="datetime-local" className="w-full p-4 bg-indigo-50/50 border border-indigo-100 rounded-2xl outline-none font-bold" value={editForm.checkin_time || ""} onChange={e => setEditForm({...editForm, checkin_time: e.target.value})} />
          </div>

          {/* 📍 แก้ไขเวลาออก (เพิ่มใหม่) */}
          <div className="space-y-1">
            <p className="text-[10px] font-black text-rose-500 ml-2 uppercase">เวลาออก (Check-out)</p>
            <input type="datetime-local" className="w-full p-4 bg-rose-50/50 border border-rose-100 rounded-2xl outline-none font-bold" value={editForm.checkout_time || ""} onChange={e => setEditForm({...editForm, checkout_time: e.target.value})} />
          </div>

          {/* วัตถุประสงค์ (ภาษาไทย) */}
          <div className="space-y-1 col-span-2">
            <p className="text-[10px] font-black text-slate-400 ml-2 uppercase">วัตถุประสงค์</p>
            <select className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold text-slate-700" 
              value={editForm.purpose || ""} 
              onChange={e => setEditForm({...editForm, purpose: e.target.value})}>
              <option value="">เลือกวัตถุประสงค์</option>
              {PURPOSES.map(p => (
                <option key={p.value} value={p.value}>{p.label}</option>
              ))}
            </select>
          </div>

          {/* กรณีเลือก "อื่น ๆ" ให้โชว์ช่องกรอกเพิ่ม */}
          {(editForm.purpose === "อื่น ๆ" || editForm.purpose === "other") && (
            <div className="space-y-1 col-span-2">
              <p className="text-[10px] font-black text-rose-500 ml-2 uppercase">ระบุวัตถุประสงค์อื่นๆ</p>
              <input type="text" className="w-full p-4 bg-rose-50 border border-rose-100 rounded-2xl outline-none font-bold" value={editForm.other_purpose || ""} onChange={e => setEditForm({...editForm, other_purpose: e.target.value})} />
            </div>
          )}
        </div>

        <div className="flex gap-4 pt-4">
          <button onClick={saveEdit} className="flex-1 py-5 bg-indigo-600 text-white rounded-[1.8rem] font-black shadow-xl hover:bg-indigo-700 transition-all">บันทึกการแก้ไข</button>
          <button onClick={() => setEditingId(null)} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-[1.8rem] font-black hover:bg-slate-200 transition-all">ยกเลิก</button>
        </div>
      </div>
    </div>
  </div>
)}
    </div>
  );
}