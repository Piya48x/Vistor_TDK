// App.jsx - Modern Version
import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";
import { DEFAULT_FIELDS } from "./config";
const LOGO_URL = import.meta.env.VITE_LOGO_URL || "/logo/f.png"
import QRCode from "qrcode";

const ORG = import.meta.env.VITE_ORG_NAME || "Just-iD Visitor";
const SITE = import.meta.env.VITE_SITE_NAME || "Global Securitech";

const REQUIRED_FIELDS = {
  id_type: true,
  id_number: true,
  full_name: true,
  phone: true,
  contact_person: true,
  purpose: true,
  company: false,
  vehicle_plate: false,
  vehicle_type: false,
  gender: false,
  chip_serial: false,
  note: false,
};

const labelOf = (key) =>
  ({
    id_type: "ประเภทบัตร",
    id_number: "หมายเลขบัตร",
    full_name: "ชื่อ-นามสกุล",
    gender: "เพศ",
    company: "บริษัทต้นสังกัด",
    phone: "เบอร์โทร",
    contact_person: "ผู้ติดต่อภายใน",
    purpose: "วัตถุประสงค์",
    vehicle_plate: "ทะเบียนรถ",
    vehicle_type: "ประเภทรถ",
    chip_serial: "Chip Serial",
    note: "บันทึกเพิ่มเติม",
  }[key] || key);

export default function App() {
  const [fields, setFields] = useState(DEFAULT_FIELDS);
  const [form, setForm] = useState({
    id_type: "citizen",
    id_number: "",
    full_name: "",
    gender: "",
    company: "",
    phone: "",
    contact_person: "",
    purpose: "",
    otherPurpose: "",
    vehicle_plate: "",
    vehicle_type: "",
    chip_serial: "",
    note: "",
  });

  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [visitors, setVisitors] = useState([]);
  const [errors, setErrors] = useState({});
  const [showSuggest, setShowSuggest] = useState(false);
  const [facingMode, setFacingMode] = useState("environment");
  const [showGuide, setShowGuide] = useState(
    () => localStorage.getItem("vms_hide_guide") !== "1"
  );
  const [showSettings, setShowSettings] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);

  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [recentVisitors, setRecentVisitors] = useState([]);

  useEffect(() => {
    const saved = JSON.parse(localStorage.getItem("recent_visitors") || "[]");
    setRecentVisitors(saved);
  }, []);

  // Init webcam
  useEffect(() => {
    if (!cameraActive) return;

    (async () => {
      try {
        if (streamRef.current) {
          streamRef.current.getTracks().forEach((t) => t.stop());
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        streamRef.current = stream;
        if (videoRef.current) videoRef.current.srcObject = stream;
      } catch (err) {
        console.warn("camera error", err);
      }
    })();

    return () => {
      if (streamRef.current)
        streamRef.current.getTracks().forEach((t) => t.stop());
    };
  }, [facingMode, cameraActive]);

  const loadVisitors = async () => {
    const { data, error } = await supabase
      .from("visitors")
      .select("*")
      .order("id", { ascending: false })
      .limit(50);
    if (!error) setVisitors(data || []);
  };

  useEffect(() => {
    loadVisitors();
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel("visitors-changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "visitors" },
        () => {
          loadVisitors();
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const takeSnapshot = () => {
    const video = videoRef.current;
    if (!video) return;
    
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const url = canvas.toDataURL("image/jpeg", 0.9);
    setPhotoDataUrl(url);
    
    // ปิดกล้องทันทีหลังถ่ายเพื่อแสดงภาพแทน
    setCameraActive(false);
  };

  const retakePhoto = () => {
    setPhotoDataUrl("");
    setCameraActive(true);
  };

  const uploadPhoto = async (visitorId) => {
    if (!photoDataUrl) return null;
    const blob = await (await fetch(photoDataUrl)).blob();
    const filePath = `${visitorId}.jpg`;
    const { error } = await supabase.storage
      .from("photos")
      .upload(filePath, blob, { contentType: "image/jpeg", upsert: true });
    if (error) {
      console.error("upload error", error);
      return null;
    }
    const { data } = supabase.storage.from("photos").getPublicUrl(filePath);
    return data?.publicUrl || null;
  };

  const validateForm = () => {
    const _errors = {};

    Object.entries(REQUIRED_FIELDS).forEach(([key, required]) => {
      if (!required) return;
      if (fields[key]) {
        const val = (form[key] ?? "").toString().trim();
        if (!val) _errors[key] = `กรุณากรอก ${labelOf(key)}`;
        if (key === "id_number" && val && val.length < 6)
          _errors[key] = "หมายเลขบัตรควรมีอย่างน้อย 6 หลัก";
        if (key === "phone" && val && !/^\d{9,10}$/.test(val))
          _errors[key] = "กรุณากรอกเบอร์โทรให้ถูกต้อง (9–10 หลัก)";
      }
    });

    if (!photoDataUrl) {
      _errors.photo = "กรุณาถ่ายภาพบัตรประชาชน/เอกสารก่อนบันทึก";
    }

    setErrors(_errors);

    if (Object.keys(_errors).length) {
      const firstKey = Object.keys(_errors)[0];
      const el = document.querySelector(`[data-field="${firstKey}"]`);
      if (el) {
        setTimeout(() => el.focus({ preventScroll: false }), 0);
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      return false;
    }
    return true;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    try {
      const payload = {
        full_name: form.full_name,
        id_number: form.id_number,
        time: new Date().toISOString(),
      };
      const qrTemp = await QRCode.toDataURL(JSON.stringify(payload));

      const { data, error } = await supabase
        .from("visitors")
        .insert({
          id_type: form.id_type,
          id_number: form.id_number,
          full_name: form.full_name,
          gender: form.gender,
          company: form.company,
          phone: form.phone,
          contact_person: form.contact_person,
          purpose: form.purpose,
          other_purpose: form.otherPurpose || null,
          vehicle_plate: form.vehicle_plate,
          vehicle_type: form.vehicle_type,
          chip_serial: form.chip_serial,
          note: form.note,
          checkin_time: new Date().toISOString(),
          photo_url: null,
          qr_data: qrTemp,
        })
        .select()
        .single();

      if (error) throw error;

      const photoUrl = await uploadPhoto(data.id);
      if (photoUrl) {
        await supabase
          .from("visitors")
          .update({ photo_url: photoUrl })
          .eq("id", data.id);
      }

      const qrFinal = await QRCode.toDataURL(
        JSON.stringify({
          id: data.id,
          id_number: form.id_number,
          time: new Date().toISOString(),
        })
      );
      await supabase
        .from("visitors")
        .update({ qr_data: qrFinal })
        .eq("id", data.id);

      let savedVisitors = JSON.parse(
        localStorage.getItem("recent_visitors") || "[]"
      );

      const visitorData = {
        full_name: form.full_name,
        phone: form.phone,
        company: form.company,
        contact_person: form.contact_person,
        purpose: form.purpose,
        other_purpose: form.otherPurpose || "",
      };

      const exists = savedVisitors.find(
        (v) => v.full_name === visitorData.full_name
      );
      if (!exists) {
        savedVisitors.push(visitorData);
        localStorage.setItem("recent_visitors", JSON.stringify(savedVisitors));
      }

      setForm({
        id_type: "citizen",
        id_number: "",
        full_name: "",
        gender: "",
        company: "",
        phone: "",
        contact_person: "",
        purpose: "",
        otherPurpose: "",
        vehicle_plate: "",
        vehicle_type: "",
        chip_serial: "",
        note: "",
      });

      setPhotoDataUrl("");
      setCameraActive(true);
      setErrors({});
      await loadVisitors();

      window.open(`/print/${data.id}`, "_blank");
    } catch (err) {
      alert("บันทึกไม่สำเร็จ: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleField = (key) =>
    setFields((prev) => ({ ...prev, [key]: !prev[key] }));

  const closeGuide = (dontShowAgain = false) => {
    setShowGuide(false);
    if (dontShowAgain) localStorage.setItem("vms_hide_guide", "1");
  };

  

  return (
    <div className="app-container">
      <style>{`
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }

        :root {
          --primary: #2563eb;
          --primary-hover: #1d4ed8;
          --primary-light: #dbeafe;
          --danger: #dc2626;
          --danger-hover: #b91c1c;
          --success: #16a34a;
          --warning: #f59e0b;
          --text: #1f2937;
          --text-light: #6b7280;
          --bg: #ffffff;
          --bg-secondary: #f9fafb;
          --border: #e5e7eb;
          --shadow: 0 1px 3px 0 rgb(0 0 0 / 0.1);
          --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.1);
          --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.1);
          --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1);
          --radius: 12px;
          --radius-lg: 16px;
        }

      body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto',
    'Oxygen', 'Ubuntu', sans-serif;

  min-height: 100vh;
  line-height: 1.6;
  color: var(--text);

  background: url("/logo/r.jpg") center / cover no-repeat fixed;
}

body::before {
  content: "";
  position: fixed;
  inset: 0;
  backdrop-filter: blur(10px);
  background: rgba(0,0,0,0.35);
  z-index: -1;
}


        .app-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 20px;
        }

        /* Header */
        .header {
          background: var(--bg);
          padding: 24px;
          border-radius: var(--radius-lg);
          box-shadow: var(--shadow-lg);
          margin-bottom: 24px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 16px;
        }

        .header-info {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          align-items: center;
        }

        .badge {
          background: var(--primary-light);
          color: var(--primary);
          padding: 8px 16px;
          border-radius: 20px;
          font-size: 14px;
          font-weight: 500;
          display: inline-flex;
          align-items: center;
          gap: 6px;
        }

        .badge b {
          font-weight: 600;
        }

        /* Cards */
        .card {
          background: var(--bg);
          border-radius: var(--radius-lg);
          padding: 28px;
          box-shadow: var(--shadow-lg);
          margin-bottom: 20px;
        }

        .card h2 {
          font-size: 24px;
          font-weight: 700;
          color: var(--text);
          margin-bottom: 24px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        /* Form */
        .form-grid {
          display: grid;
          gap: 20px;
        }

        .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        label {
          font-weight: 600;
          font-size: 14px;
          color: var(--text);
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .required::after {
          content: "*";
          color: var(--danger);
          margin-left: 2px;
        }

        input, select, textarea {
          width: 100%;
          padding: 12px 16px;
          border: 2px solid var(--border);
          border-radius: var(--radius);
          font-size: 15px;
          transition: all 0.2s;
          background: var(--bg);
          color: var(--text);
        }

        input:focus, select:focus, textarea:focus {
          outline: none;
          border-color: var(--primary);
          box-shadow: 0 0 0 3px var(--primary-light);
        }

        input.error, select.error, textarea.error {
          border-color: var(--danger);
        }

        input.error:focus, select.error:focus, textarea.error:focus {
          box-shadow: 0 0 0 3px rgba(220, 38, 38, 0.1);
        }

        .error-text {
          color: var(--danger);
          font-size: 13px;
          margin-top: 4px;
          display: flex;
          align-items: center;
          gap: 4px;
        }

        .error-text::before {
          content: "⚠";
        }

        /* Camera Section */
        .camera-container {
          position: relative;
          width: 100%;
          max-width: 600px;
          margin: 0 auto;
          border-radius: var(--radius-lg);
          overflow: hidden;
          box-shadow: var(--shadow-xl);
          background: #000;
        }

        video, canvas {
          width: 100%;
          height: auto;
          display: block;
          aspect-ratio: 4/3;
          object-fit: cover;
        }

        canvas {
          position: absolute;
          top: 0;
          left: 0;
        }

        .camera-overlay {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80%;
          height: 60%;
          border: 3px dashed rgba(255, 255, 255, 0.6);
          border-radius: var(--radius);
          pointer-events: none;
        }

        .camera-hint {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0, 0, 0, 0.7);
          color: white;
          padding: 10px 20px;
          border-radius: 20px;
          font-size: 14px;
          backdrop-filter: blur(10px);
        }

        .camera-controls {
          display: flex;
          gap: 12px;
          margin-top: 16px;
          flex-wrap: wrap;
          justify-content: center;
        }

        /* Buttons */
        .btn {
          padding: 12px 24px;
          border-radius: var(--radius);
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.2s;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          white-space: nowrap;
        }

        .btn-primary {
          background: var(--primary);
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: var(--primary-hover);
          transform: translateY(-1px);
          box-shadow: var(--shadow-md);
        }

        .btn-secondary {
          background: var(--bg-secondary);
          color: var(--text);
          border: 2px solid var(--border);
        }

        .btn-secondary:hover:not(:disabled) {
          background: white;
          border-color: var(--primary);
          color: var(--primary);
        }

        .btn-danger {
          background: var(--danger);
          color: white;
        }

        .btn-danger:hover:not(:disabled) {
          background: var(--danger-hover);
        }

        .btn-success {
          background: var(--success);
          color: white;
        }

        .btn:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .btn-icon {
          padding: 10px;
          width: 40px;
          height: 40px;
        }

        /* Settings Toggle */
        .settings-toggle {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          padding: 16px;
          background: var(--bg-secondary);
          border-radius: var(--radius);
        }

        .checkbox-label {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          background: white;
          border: 2px solid var(--border);
          border-radius: var(--radius);
          cursor: pointer;
          transition: all 0.2s;
          font-size: 14px;
        }

        .checkbox-label:hover {
          border-color: var(--primary);
          background: var(--primary-light);
        }

        .checkbox-label input[type="checkbox"] {
          width: 18px;
          height: 18px;
          cursor: pointer;
        }

        /* Autocomplete */
        .autocomplete-container {
          position: relative;
        }

        .autocomplete-list {
          position: absolute;
          top: 100%;
          left: 0;
          right: 0;
          background: white;
          border: 2px solid var(--border);
          border-top: none;
          border-radius: 0 0 var(--radius) var(--radius);
          max-height: 200px;
          overflow-y: auto;
          z-index: 1000;
          box-shadow: var(--shadow-lg);
        }

        .autocomplete-item {
          padding: 12px 16px;
          cursor: pointer;
          transition: background 0.2s;
          border-bottom: 1px solid var(--border);
        }

        .autocomplete-item:last-child {
          border-bottom: none;
        }

        .autocomplete-item:hover {
          background: var(--primary-light);
        }

        /* Modal */
        .modal-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          backdrop-filter: blur(4px);
        }

        .modal {
          background: white;
          border-radius: var(--radius-lg);
          padding: 32px;
          max-width: 600px;
          width: 100%;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: var(--shadow-xl);
          animation: modalSlideIn 0.3s ease-out;
        }

        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .modal h3 {
          font-size: 24px;
          font-weight: 700;
          margin-bottom: 20px;
          color: var(--text);
        }

        .guide-list {
          list-style: none;
          counter-reset: guide-counter;
          margin: 0;
          padding: 0;
        }

        .guide-list li {
          counter-increment: guide-counter;
          margin-bottom: 16px;
          padding-left: 40px;
          position: relative;
          color: var(--text-light);
        }

        .guide-list li::before {
          content: counter(guide-counter);
          position: absolute;
          left: 0;
          top: 0;
          width: 28px;
          height: 28px;
          background: var(--primary);
          color: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 600;
          font-size: 14px;
        }

        .guide-list ul {
          margin-top: 8px;
          padding-left: 20px;
        }

        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 24px;
          flex-wrap: wrap;
        }

        /* Photo hint */
        .photo-hint {
          background: var(--primary-light);
          color: var(--primary);
          padding: 12px 16px;
          border-radius: var(--radius);
          font-size: 14px;
          margin-bottom: 16px;
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .photo-hint::before {
          content: "💡";
          font-size: 18px;
        }

        /* Responsive */
        @media (max-width: 768px) {
          .app-container {
            padding: 12px;
          }

          .header {
            padding: 16px;
            flex-direction: column;
            align-items: stretch;
          }

          .card {
            padding: 20px;
          }

          .card h2 {
            font-size: 20px;
          }

          .form-row {
            grid-template-columns: 1fr;
          }

          .modal {
            padding: 24px;
          }

          .camera-controls {
            flex-direction: column;
          }

          .btn {
            width: 100%;
          }
        }

        @media (min-width: 769px) and (max-width: 1024px) {
          .form-row {
            grid-template-columns: 1fr;
          }
        }

        /* Print styles */
        @media print {
          .noprint {
            display: none !important;
          }
        }

        /* Loading spinner */
        .spinner {
          border: 3px solid var(--border);
          border-top: 3px solid var(--primary);
          border-radius: 50%;
          width: 20px;
          height: 20px;
          animation: spin 0.8s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  background: #ffffff;
  border-bottom: 1px solid #e5e7eb;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}
  
        
        .header-logo {
  height: 100px;
  width: 100px;
  object-fit: contain;
  flex-shrink: 0;
  align-self: center;
}

.header-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

@media (max-width: 640px) {
  .header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .header-info {
    gap: 10px;
  }

  .header-logo {
    height: 32px;
    width: 32px;
  }

  .site-badge {
    font-size: 13px;
  }

 

 
  

      `}</style>

      {/* Header */}
     <div className="header noprint">
  <div className="header-info">
    <img
      src={LOGO_URL}
      alt="logo"
      className="header-logo"
    />

    <div className="header-text">
      <div className="site-badge">
        📍 <b style={{fontSize: 20}} >{SITE} </b><br />
        <b style={{fontSize: 13}}>9/19 หมู่ 4 ตำบลเหมือง อำเภอเมืองชลบุรี จ.ชลบุรี 20130</b>
      </div>
    </div>
  </div>

  <button
    type="button"
    className="btn btn-secondary guide-btn"
    onClick={() => setShowGuide(true)}
  >
    📘 <span>คู่มือการใช้งาน</span>
  </button>
</div>


      {/* Main Form */}
      <div className="card noprint">
        <h2>ลงทะเบียนผู้มาติดต่อ</h2>
        
        <form onSubmit={onSubmit} className="form-grid">
          {/* Basic Info */}
          <div className="form-row">
            {fields.id_type && (
              <div className="form-group">
                <label className="required">ประเภทบัตร</label>
                <select
                  data-field="id_type"
                  className={errors.id_type ? "error" : ""}
                  value={form.id_type}
                  onChange={(e) => setForm((f) => ({ ...f, id_type: e.target.value }))}
                >
                  <option value="citizen">บัตรประชาชน</option>
                  <option value="driver">ใบขับขี่</option>
                  <option value="other">อื่น ๆ</option>
                </select>
                {errors.id_type && <span className="error-text">{errors.id_type}</span>}
              </div>
            )}

            {fields.id_number && (
              <div className="form-group">
                <label className="required">หมายเลขบัตร</label>
                <input
                  data-field="id_number"
                  type="text"
                  className={errors.id_number ? "error" : ""}
                  value={form.id_number}
                  onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value }))}
                  placeholder="กรอกหมายเลขบัตรประชาชน"
                />
                {errors.id_number && <span className="error-text">{errors.id_number}</span>}
              </div>
            )}
          </div>

          {fields.full_name && (
            <div className="form-group autocomplete-container">
              <label className="required">ชื่อ-นามสกุล</label>
              <input
                data-field="full_name"
                type="text"
                className={errors.full_name ? "error" : ""}
                value={form.full_name}
                onChange={(e) => {
                  setForm((f) => ({ ...f, full_name: e.target.value }));
                  setShowSuggest(true);
                }}
                placeholder="กรอกชื่อ-นามสกุล"
              />
              {showSuggest && form.full_name && recentVisitors.length > 0 && (
                <div className="autocomplete-list">
                  {recentVisitors
                    .filter((v) =>
                      v.full_name.toLowerCase().includes(form.full_name.toLowerCase())
                    )
                    .map((v, i) => (
                      <div
                        key={i}
                        className="autocomplete-item"
                        onClick={() => {
                          setForm((f) => ({ ...f, ...v }));
                          setShowSuggest(false);
                        }}
                      >
                        {v.full_name}
                      </div>
                    ))}
                </div>
              )}
              {errors.full_name && <span className="error-text">{errors.full_name}</span>}
            </div>
          )}

          <div className="form-row">
            {fields.company && (
              <div className="form-group">
                <label>บริษัทต้นสังกัด</label>
                <input
                  data-field="company"
                  type="text"
                  className={errors.company ? "error" : ""}
                  value={form.company}
                  onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  placeholder="ชื่อบริษัท"
                />
                {errors.company && <span className="error-text">{errors.company}</span>}
              </div>
            )}

            {fields.phone && (
              <div className="form-group">
                <label className="required">เบอร์โทรศัพท์</label>
                <input
                  data-field="phone"
                  type="tel"
                  className={errors.phone ? "error" : ""}
                  value={form.phone}
                  onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="0812345678"
                />
                {errors.phone && <span className="error-text">{errors.phone}</span>}
              </div>
            )}
          </div>

          <div className="form-row">
            {fields.contact_person && (
              <div className="form-group">
                <label className="required">ผู้ติดต่อภายใน</label>
                <input
                  data-field="contact_person"
                  type="text"
                  className={errors.contact_person ? "error" : ""}
                  value={form.contact_person}
                  onChange={(e) => setForm((f) => ({ ...f, contact_person: e.target.value }))}
                  placeholder="ชื่อผู้ติดต่อ"
                />
                {errors.contact_person && <span className="error-text">{errors.contact_person}</span>}
              </div>
            )}

            {fields.purpose && (
              <div className="form-group">
                <label className="required">วัตถุประสงค์</label>
                <select
                  data-field="purpose"
                  className={errors.purpose ? "error" : ""}
                  value={form.purpose}
                  onChange={(e) => setForm((f) => ({ ...f, purpose: e.target.value }))}
                >
                  <option value="">-- เลือกวัตถุประสงค์ --</option>
                  <option value="meeting">ประชุมงาน</option>
                  <option value="delivery">ส่งของ</option>
                  <option value="maintenance">ซ่อมบำรุง</option>
                  <option value="visit">เยี่ยมชม</option>
                  <option value="interview">สมัครงาน/สัมภาษณ์</option>
                  <option value="other">อื่น ๆ</option>
                </select>
                {form.purpose === "other" && (
                  <input
                    type="text"
                    style={{ marginTop: 8 }}
                    className="input"
                    value={form.otherPurpose}
                    onChange={(e) => setForm((f) => ({ ...f, otherPurpose: e.target.value }))}
                    placeholder="โปรดระบุวัตถุประสงค์"
                  />
                )}
                {errors.purpose && <span className="error-text">{errors.purpose}</span>}
              </div>
            )}
          </div>

          {(fields.vehicle_plate || fields.vehicle_type) && (
            <div className="form-row">
              {fields.vehicle_plate && (
                <div className="form-group">
                  <label>ทะเบียนรถ</label>
                  <input
                    data-field="vehicle_plate"
                    type="text"
                    className={errors.vehicle_plate ? "error" : ""}
                    value={form.vehicle_plate}
                    onChange={(e) => setForm((f) => ({ ...f, vehicle_plate: e.target.value }))}
                    placeholder="กข 1234"
                  />
                  {errors.vehicle_plate && <span className="error-text">{errors.vehicle_plate}</span>}
                </div>
              )}

              {fields.vehicle_type && (
                <div className="form-group">
                  <label>ประเภทรถ</label>
                  <input
                    data-field="vehicle_type"
                    type="text"
                    className={errors.vehicle_type ? "error" : ""}
                    value={form.vehicle_type}
                    onChange={(e) => setForm((f) => ({ ...f, vehicle_type: e.target.value }))}
                    placeholder="รถยนต์, มอเตอร์ไซค์"
                  />
                  {errors.vehicle_type && <span className="error-text">{errors.vehicle_type}</span>}
                </div>
              )}
            </div>
          )}

          {fields.gender && (
            <div className="form-row">
              <div className="form-group">
                <label>เพศ</label>
                <select
                  data-field="gender"
                  className={errors.gender ? "error" : ""}
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">-- ไม่ระบุ --</option>
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="อื่น ๆ">อื่น ๆ</option>
                </select>
                {errors.gender && <span className="error-text">{errors.gender}</span>}
              </div>

              {fields.chip_serial && (
                <div className="form-group">
                  <label>Chip Serial</label>
                  <input
                    data-field="chip_serial"
                    type="text"
                    className={errors.chip_serial ? "error" : ""}
                    value={form.chip_serial}
                    onChange={(e) => setForm((f) => ({ ...f, chip_serial: e.target.value }))}
                    placeholder="รหัสชิป"
                  />
                  {errors.chip_serial && <span className="error-text">{errors.chip_serial}</span>}
                </div>
              )}
            </div>
          )}

          {fields.note && (
            <div className="form-group">
              <label>บันทึกเพิ่มเติม</label>
              <textarea
                data-field="note"
                rows="3"
                className={errors.note ? "error" : ""}
                value={form.note}
                onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                placeholder="หมายเหตุเพิ่มเติม..."
              />
              {errors.note && <span className="error-text">{errors.note}</span>}
            </div>
          )}

          {/* Camera Section */}
          <div className="form-group">
            <label className="required">ภาพถ่ายเอกสาร</label>
            <div className="photo-hint">
              <span>กรุณาถ่ายภาพ <strong>บัตรประชาชน/ใบขับขี่</strong> ให้ชัดเจนภายในกรอบสี่เหลี่ยม</span>
            </div>

            <div className="camera-container">
              {cameraActive && !photoDataUrl ? (
                <>
                  <video ref={videoRef} autoPlay playsInline muted />
                  <div className="camera-overlay"></div>
                  {/* <div className="camera-hint">วางบัตรให้อยู่ในกรอบ</div> */}
                </>
              ) : photoDataUrl ? (
                <img 
                  src={photoDataUrl} 
                  alt="ภาพถ่าย" 
                  style={{ 
                    width: "100%", 
                    height: "auto", 
                    display: "block",
                    aspectRatio: "4/3",
                    objectFit: "cover"
                  }} 
                />
              ) : null}
            </div>

            {errors.photo && <span className="error-text">{errors.photo}</span>}

            <div className="camera-controls">
              {!photoDataUrl ? (
                <>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={takeSnapshot}
                  >
                    📸 ถ่ายภาพ
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setFacingMode((m) => m === "user" ? "environment" : "user")}
                  >
                    🔄 สลับกล้อง ({facingMode === "user" ? "หน้า" : "หลัง"})
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={retakePhoto}
                  >
                    ✅ ถ่ายใหม่
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className="btn btn-primary"
            style={{ fontSize: 16, padding: "16px 32px" }}
            disabled={loading}
          >
            {loading ? (
              <>
                <div className="spinner"></div>
                กำลังบันทึก...
              </>
            ) : (
              "💾 บันทึกและพิมพ์สลิป"
            )}
          </button>
        </form>
      </div>

      {/* Settings Card */}
      <div className="card noprint">
        <h2>
          ⚙️ ตั้งค่าฟอร์ม
          <button
            type="button"
            className="btn btn-secondary"
            style={{ marginLeft: "auto", fontSize: 14 }}
            onClick={() => setShowSettings(!showSettings)}
          >
            {showSettings ? "ซ่อน" : "แสดง"}
          </button>
        </h2>

        {showSettings && (
          <div className="settings-toggle">
            {Object.keys(fields).map((k) => (
              <label key={k} className="checkbox-label">
                <input
                  type="checkbox"
                  checked={fields[k]}
                  onChange={() => toggleField(k)}
                />
                <span>{labelOf(k)}</span>
              </label>
            ))}
          </div>
        )}
      </div>

      {/* Guide Modal */}
      {showGuide && (
        <div className="modal-backdrop" onClick={() => setShowGuide(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>📘 คู่มือลงทะเบียนผู้มาติดต่อ</h3>
            <ol className="guide-list">
              <li>เตรียมเอกสาร: บัตรประชาชน ใบขับขี่ หรือเอกสารอื่นๆ ที่ใช้ยืนยันตัวตน</li>
              <li>ถ่ายภาพเอกสารให้ชัดเจนอยู่ภายในกรอบสี่เหลี่ยม (รองรับกล้องหน้า/หลัง)</li>
              <li>กรอกข้อมูลที่มีเครื่องหมาย * ให้ครบถ้วน:
                <ul>
                  <li>ชื่อ-นามสกุล</li>
                  <li>เบอร์โทรศัพท์ (9-10 หลัก)</li>
                  <li>ผู้ติดต่อภายใน</li>
                  <li>วัตถุประสงค์</li>
                </ul>
              </li>
              <li>ถ้านำรถเข้ามา กรุณาระบุทะเบียนรถและประเภทรถ</li>
              <li>ตรวจสอบความถูกต้องก่อนกดปุ่ม "บันทึกและพิมพ์สลิป"</li>
              <li>ระบบจะเปิดสลิปใหม่ให้อัตโนมัติหลังบันทึกสำเร็จ</li>
            </ol>

            <div className="modal-actions">
              <button className="btn btn-primary" onClick={() => closeGuide(false)}>
                เริ่มใช้งาน
              </button>
              <button className="btn btn-secondary" onClick={() => closeGuide(true)}>
                ไม่ต้องแสดงอีก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}