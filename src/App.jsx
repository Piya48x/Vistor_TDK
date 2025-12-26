import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const ORG_NAME = "T.D.K. INDUSTRIAL";
const SITE_NAME = "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด";

export default function App() {
  const [step, setStep] = useState(1); // 1: Camera, 2: Info, 3: Success
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [historyList, setHistoryList] = useState([]);

  const [form, setForm] = useState({
    full_name: "",
    company: "",
    phone: "",
    contact_person: "",
    purpose: "",
    other_purpose: "",
  });

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  // โหลดประวัติจาก LocalStorage เมื่อเปิด App
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("visitor_history") || "[]");
    setHistoryList(history);
  }, []);

  useEffect(() => {
    if (step === 1 && cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [step, cameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
      });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      console.error("Camera Error:", err);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
    }
  };

  const takeSnapshot = () => {
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.8));
    setCameraActive(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data, error } = await supabase
        .from("visitors")
        .insert([
          {
            full_name: form.full_name,
            company: form.company,
            phone: form.phone,
            contact_person: form.contact_person,
            purpose:
              form.purpose === "อื่น ๆ"
                ? `อื่น ๆ: ${form.other_purpose}`
                : form.purpose,
            checkin_time: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

      // จัดการเรื่องรูปภาพ
      if (photoDataUrl) {
        const blob = await (await fetch(photoDataUrl)).blob();
        const fileName = `visitor_${data.id}_${Date.now()}.jpg`;
        await supabase.storage.from("photos").upload(fileName, blob);
        const { data: pUrl } = supabase.storage
          .from("photos")
          .getPublicUrl(fileName);
        await supabase
          .from("visitors")
          .update({ photo_url: pUrl.publicUrl })
          .eq("id", data.id);
      }

      // --- ส่วนการจำประวัติชื่อและข้อมูลเดิม ---
      const history = JSON.parse(
        localStorage.getItem("visitor_history") || "[]"
      );
      const newItem = {
        full_name: form.full_name,
        company: form.company,
        phone: form.phone,
      };
      // กรองชื่อที่ซ้ำออก เพื่อเอาค่าใหม่ล่าสุดไปไว้บนสุด
      const filtered = history.filter((h) => h.full_name !== form.full_name);
      const updatedHistory = [newItem, ...filtered].slice(0, 50); // เก็บไว้ 50 รายการล่าสุด
      localStorage.setItem("visitor_history", JSON.stringify(updatedHistory));
      setHistoryList(updatedHistory);
      // ------------------------------------

      setStep(3);
    } catch (err) {
      alert("Error: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setForm({
      full_name: "",
      company: "",
      phone: "",
      contact_person: "",
      purpose: "",
      other_purpose: "",
    });
    setPhotoDataUrl("");
    setCameraActive(true);
    setStep(1);
  };

  const handleEditPhoto = () => {
    setCameraActive(true);
    setStep(1);
  };

  const handleInputChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  // ฟังก์ชันพิเศษสำหรับ Auto-fill เมื่อเลือกชื่อ
  const handleNameChange = (e) => {
    const name = e.target.value;
    // อัปเดตชื่อในฟอร์มก่อน
    setForm((prev) => ({ ...prev, full_name: name }));

    // ค้นหาในประวัติว่าเคยมีชื่อนี้ไหม
    const found = historyList.find((h) => h.full_name === name);
    if (found) {
      setForm((prev) => ({
        ...prev,
        company: found.company || prev.company,
        phone: found.phone || prev.phone,
      }));
    }
  };

  return (
    <div className="app-shell">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Kanit:wght@300;400;500;600&display=swap');
        :root { --tdk-blue: #003399; --tdk-blue-light: #004ecc; --tdk-bg: #f0f4f8; --text-main: #1a2b49; }
        body { margin: 0; font-family: 'Kanit', sans-serif; background: var(--tdk-bg); color: var(--text-main); }
        .app-shell { min-height: 100vh; display: flex; flex-direction: column; align-items: center; padding: 20px; }
        .brand-header { text-align: center; margin: 20px 0 30px; }
        .logo-text { font-size: 42px; font-weight: 800; color: var(--tdk-blue); letter-spacing: -1px; line-height: 1; }
        .site-badge { background: var(--tdk-blue); color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; display: inline-block; margin-top: 10px; }
        .card { width: 100%; max-width: 500px; background: white; border-radius: 30px; box-shadow: 0 20px 40px rgba(0, 51, 153, 0.1); overflow: hidden; transition: 0.3s; }
        .card-body { padding: 32px; }
        .camera-container { position: relative; background: #000; border-radius: 20px; overflow: hidden; aspect-ratio: 4/3; border: 3px solid #e2e8f0; }
        video, .snapshot { width: 100%; height: 100%; object-fit: cover; }
        .id-card-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; }
        .guide-box { width: 85%; height: 75%; border: 2px dashed rgba(255,255,255,0.6); border-radius: 12px; background: rgba(255,255,255,0.05); }
        .input-group { margin-bottom: 20px; }
        label { display: block; font-weight: 500; margin-bottom: 8px; color: #4a5568; font-size: 15px; }
        input, select { width: 100%; padding: 14px 18px; border: 2px solid #edf2f7; border-radius: 15px; font-size: 16px; font-family: inherit; transition: all 0.2s; box-sizing: border-box; }
        input:focus { border-color: var(--tdk-blue); outline: none; background: #f8fbff; }
        .btn-action { width: 100%; padding: 18px; border-radius: 18px; font-size: 18px; font-weight: 600; border: none; cursor: pointer; transition: 0.2s; display: flex; align-items: center; justify-content: center; gap: 10px; }
        .btn-tdk { background: var(--tdk-blue); color: white; }
        .btn-tdk:hover { background: var(--tdk-blue-light); transform: translateY(-2px); }
        .btn-ghost { background: none; color: #718096; text-decoration: underline; margin-top: 10px; font-size: 14px; }
        .steps { display: flex; justify-content: center; gap: 8px; margin-bottom: 25px; }
        .step-dot { width: 10px; height: 10px; border-radius: 50%; background: #e2e8f0; }
        .step-dot.active { background: var(--tdk-blue); width: 30px; border-radius: 5px; }
        .success-hero { text-align: center; padding: 20px 0; }
        .check-circle { width: 80px; height: 80px; border-radius: 50%; background: #c6f6d5; color: #2f855a; font-size: 40px; display: flex; align-items: center; justify-content: center; margin: 0 auto 20px; }
        .fade { animation: fadeIn 0.4s ease-out; }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      `}</style>

      <div className="brand-header fade">
        <div className="logo-text">
          TDK <span style={{ fontWeight: 300 }}>INDUSTRIAL</span>
        </div>
        <div className="site-badge">{SITE_NAME}</div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="steps">
            <div className={`step-dot ${step === 1 ? "active" : ""}`}></div>
            <div className={`step-dot ${step === 2 ? "active" : ""}`}></div>
            <div className={`step-dot ${step === 3 ? "active" : ""}`}></div>
          </div>

          {step === 1 && (
            <div className="fade">
              <h2
                style={{ textAlign: "center", marginTop: 0, fontSize: "20px" }}
              >
                ถ่ายรูปบัตร หรือ นามบัตร
              </h2>
              <p
                style={{
                  textAlign: "center",
                  color: "#718096",
                  fontSize: "14px",
                  marginBottom: 20,
                }}
              >
                กรุณาวางบัตรประชาชน หรือเอกสารสำคัญให้เห็นชัดเจนในกรอบ
              </p>

              <div className="camera-container">
                {cameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted />
                    <div className="id-card-overlay">
                      <div className="guide-box"></div>
                    </div>
                  </>
                ) : (
                  <img src={photoDataUrl} className="snapshot" alt="Captured" />
                )}
              </div>

              <div style={{ marginTop: 30 }}>
                {cameraActive ? (
                  <button className="btn-action btn-tdk" onClick={takeSnapshot}>
                    📸 ถ่ายภาพเอกสาร
                  </button>
                ) : (
                  <>
                    <button
                      className="btn-action btn-tdk"
                      onClick={() => setStep(2)}
                    >
                      ใช้รูปนี้และกรอกข้อมูล ➔
                    </button>
                    <button
                      className="btn-action btn-ghost"
                      onClick={() => setCameraActive(true)}
                    >
                      ถ่ายภาพใหม่อีกครั้ง
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="fade">
              <h2
                style={{ textAlign: "center", marginTop: 0, fontSize: "20px" }}
              >
                ข้อมูลผู้มาติดต่อ
              </h2>

              <div className="input-group">
                <label>ชื่อ-นามสกุล</label>
                <input
                  required
                  list="visitor-names"
                  placeholder="ระบุชื่อผู้ติดต่อ"
                  value={form.full_name}
                  onChange={handleNameChange}
                  autoComplete="off"
                />
                <datalist id="visitor-names">
                  {historyList.map((h, i) => (
                    <option key={i} value={h.full_name} />
                  ))}
                </datalist>
              </div>

              <div className="input-group">
                <label>มาจากบริษัท / หน่วยงาน</label>
                <input
                  required
                  placeholder="ชื่อบริษัทของคุณ"
                  value={form.company}
                  onChange={(e) =>
                    setForm({ ...form, company: e.target.value })
                  }
                />
              </div>

              <div className="input-group">
                <label>เบอร์โทรศัพท์</label>
                <input
                  required
                  type="tel"
                  placeholder="08x-xxxxxxx"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>มาติดต่อใคร / แผนกใด</label>
                <input
                  required
                  placeholder="ชื่อเจ้าหน้าที่ TDK"
                  value={form.contact_person}
                  onChange={(e) =>
                    setForm({ ...form, contact_person: e.target.value })
                  }
                />
              </div>

              <div className="input-group">
                <label>วัตถุประสงค์การเข้าพบ</label>
                <select
                  required
                  value={form.purpose}
                  onChange={(e) => handleInputChange("purpose", e.target.value)}
                  // ใช้ Inline Style หรือ Class เพื่อเปลี่ยนสีตามเงื่อนไข
                  style={{ color: form.purpose === "" ? "#9ca3af" : "#111827" }}
                  className="w-full p-4 bg-white rounded-2xl border-2 border-slate-200 outline-none"
                >
                  <option value="" disabled hidden>
                    -- กรุณาเลือก --
                  </option>
                  <option value="ประชุมงาน" style={{ color: "#111827" }}>
                    ประชุมงาน (Meeting)
                  </option>
                  <option
                    value="ส่งสินค้า/รับสินค้า"
                    style={{ color: "#111827" }}
                  >
                    ส่งสินค้า / รับสินค้า (Delivery)
                  </option>
                  <option
                    value="ซ่อมบำรุง/ติดตั้ง"
                    style={{ color: "#111827" }}
                  >
                    ซ่อมบำรุง / ติดตั้ง (Maintenance)
                  </option>
                  <option value="อบรม/สอนงาน" style={{ color: "#111827" }}>
                    อบรม / สอนงาน (Training)
                  </option>
                  <option value="ตรวจสอบ/Audit" style={{ color: "#111827" }}>
                    ตรวจสอบ / Audit
                  </option>
                  <option
                    value="สมัครงาน/สัมภาษณ์"
                    style={{ color: "#111827" }}
                  >
                    สมัครงาน / สัมภาษณ์ (Interview)
                  </option>
                  <option value="วางบิล/รับเช็ค" style={{ color: "#111827" }}>
                    วางบิล / รับเช็ค (Billing)
                  </option>
                  <option value="อื่น ๆ" style={{ color: "#111827" }}>
                    อื่น ๆ (Other)
                  </option>
                </select>
              </div>

              {form.purpose === "อื่น ๆ" && (
                <div className="input-group fade">
                  <label>ระบุวัตถุประสงค์อื่น ๆ</label>
                  <input
                    required
                    placeholder="ระบุเหตุผลการเข้าพบ"
                    value={form.other_purpose}
                    onChange={(e) =>
                      setForm({ ...form, other_purpose: e.target.value })
                    }
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-action btn-tdk"
                style={{ marginTop: 10 }}
              >
                {loading ? "กำลังบันทึก..." : "ยืนยันการลงทะเบียน"}
              </button>
              <button
                type="button"
                className="btn-action btn-ghost"
                onClick={handleEditPhoto}
              >
                แก้ไขรูปภาพ / ย้อนกลับ
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="success-hero fade">
              <div className="check-circle">✓</div>
              <h2 style={{ color: "var(--tdk-blue)", marginBottom: 10 }}>
                ลงทะเบียนสำเร็จ!
              </h2>
              <p style={{ color: "#718096", lineHeight: 1.6 }}>
                บันทึกข้อมูลเข้าพื้นที่เรียบร้อยแล้ว
                <br />
                กรุณารอรับบัตร Visitor จากเจ้าหน้าที่
              </p>
              <button
                className="btn-action btn-tdk"
                style={{ marginTop: 40 }}
                onClick={resetForm}
              >
                เสร็จสิ้น
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        style={{
          marginTop: 40,
          textAlign: "center",
          opacity: 0.3,
          fontSize: "12px",
        }}
      >
        SECURITY MANAGEMENT SYSTEM BY TDK INDUSTRIAL
      </div>
    </div>
  );
}
