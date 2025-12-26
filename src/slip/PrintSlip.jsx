import React, { useEffect, useState, useRef } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../supabaseClient"

const ORG = import.meta.env.VITE_ORG_NAME || "Just-iD Visitor"
const SITE = import.meta.env.VITE_SITE_NAME || "Global Securitech"
const LOGO_URL = import.meta.env.VITE_LOGO_URL || "/logo/f.png"

export default function PrintSlip({ id: propId, inModal = false }) {
  const { id: routeId } = useParams()
  const id = propId || routeId
  const [v, setV] = useState(null)
  const printedRef = useRef(false)

// แก้ไขส่วน useEffect ในไฟล์ PrintSlip.jsx
useEffect(() => {
  if (!id) return;

  const fetchData = async () => {
    const { data, error } = await supabase
      .from("visitors")
      .select("*")
      .eq("id", id)
      .single();

    if (!error && data) {
      setV(data);
      
      if (!inModal) {
        // หน่วงเวลา 800ms เพื่อให้รูปภาพและ Layout โหลดเสร็จก่อน
        setTimeout(() => {
          if (!printedRef.current) {
            window.print(); // สั่งพิมพ์
            printedRef.current = true;
            
            // ปิดหน้าต่างทันทีหลังจากส่งงานเข้าเครื่องพิมพ์ (เมื่อใช้ร่วมกับ --kiosk-printing)
            setTimeout(() => {
              window.close(); 
            }, 500);
          }
        }, 800); 
      }
    }
  };
  fetchData();
}, [id, inModal]);

  function translatePurpose(purpose, otherPurpose) {
    const dict = {
      meeting: "ประชุมงาน",
      delivery: "ส่งของ",
      maintenance: "ซ่อมบำรุง",
      visit: "เยี่ยมชม",
      interview: "สมัครงาน/สัมภาษณ์",
      other: otherPurpose || "อื่น ๆ",
    }
    return dict[purpose] || purpose
  }

  function formatDate(dateString) {
    if (!dateString) return ""
    return new Intl.DateTimeFormat("th-TH", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).format(new Date(dateString))
  }

  if (!v) return <div style={{ padding: 40 }}>กำลังจัดเตรียมสลิป...</div>

  return (
    <div
      className="receipt"
      style={{
        width: "100mm",
        margin: "0 auto",
        padding: "10mm 5mm",
        fontFamily: "Arial, sans-serif",
        color: "#111827",
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {/* ซ่อนส่วนที่ไม่เกี่ยวข้องเวลาพิมพ์ออกเครื่องจริง */}
      <style>{`
        @media print {
          @page { margin: 0; }
          body { margin: 1cm; }
        }
      `}</style>

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 12 }}>
        <img src={LOGO_URL} alt="logo" style={{ width: 100, height: "auto" }} />
      </div>

      <div style={{ textAlign: "center", marginBottom: 8 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>{ORG}</h1>
        <div style={{ fontSize: 14 }}>{SITE}</div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "10px 0" }}></div>

      <div style={{ whiteSpace: "pre-line", marginBottom: 10 }}>
        <div><b>ID:</b> {String(v.id).padStart(10, "0")}</div>
        <div><b>ชื่อ:</b> {v.full_name}</div>
        {v.gender && <div><b>เพศ:</b> {v.gender}</div>}
        {v.contact_person && <div><b>ติดต่อ:</b> {v.contact_person}</div>}
        {v.company && <div><b>บริษัท:</b> {v.company}</div>}
        {v.vehicle_plate && <div><b>ทะเบียนรถ:</b> {v.vehicle_plate}</div>}
        {v.purpose && <div><b>ประสงค์:</b> {translatePurpose(v.purpose, v.other_purpose)}</div>}
        <div><b>เวลาเข้า:</b> {formatDate(v.checkin_time)}</div>
        <br />
        <div><b>เวลาออก:</b> {formatDate(v.checkout_time) || "................................"}</div>
        <br />
        <div><b style={{ fontSize: 12 }}>รปภ:</b> {"........................................."}</div>
      </div>

      <div style={{ borderTop: "1px dashed #000", margin: "30px 0" }}></div>

      {v.qr_data && (
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>
          <img src={v.qr_data} alt="qr" style={{ width: 120, height: 120 }} />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 12 }}>
        <div style={{ width: 120, height: 60, border: "1px solid #000", borderRadius: 4, marginBottom: 4 }}></div>
        <div style={{ fontSize: 12, textAlign: "center" }}>(ลงชื่อผู้ได้รับการติดต่อ)</div>
      </div>

      <div style={{ fontSize: 12, textAlign: "center" }}>
        (ตั๋วนี้ต้องนำไปให้เจ้าหน้าที่เมื่อเสร็จธุระ) <br />
        โปรดปฏิบัติตามนโยบายความปลอดภัยของหน่วยงาน
      </div>
    </div>
  )
}