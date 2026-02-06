import React, { useEffect, useRef, useState } from "react";
import { supabase } from "./supabaseClient";

const ORG_NAME = "T.D.K. INDUSTRIAL";
const SITE_NAME = "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด";


// ข้อมูลแปลภาษา
const translations = {
  th: {
    // Step 1
    step1Title: "ถ่ายรูปบัตร หรือ นามบัตร",
    step1Guide: "กรุณาวางบัตรประชาชน หรือเอกสารสำคัญให้เห็นชัดเจนในกรอบ",
    takePhoto: "📸 ถ่ายภาพเอกสาร",
    usePhoto: "ใช้รูปนี้และกรอกข้อมูล ➔",
    retakePhoto: "ถ่ายภาพใหม่อีกครั้ง",
    
    // Step 2
    step2Title: "ข้อมูลผู้มาติดต่อ",
    fullName: "ชื่อ-นามสกุล",
    fullNamePlaceholder: "ระบุชื่อผู้ติดต่อ",
    company: "มาจากบริษัท / หน่วยงาน",
    companyPlaceholder: "ชื่อบริษัทของคุณ",
    phone: "เบอร์โทรศัพท์",
    phonePlaceholder: "08x-xxxxxxx",
    contactPerson: "มาติดต่อใคร / แผนกใด",
    contactPersonPlaceholder: "ชื่อเจ้าหน้าที่ TDK",
    purpose: "วัตถุประสงค์การเข้าพบ",
    purposePlaceholder: "-- กรุณาเลือก --",
    purposeOptions: [
      "ประชุมงาน (Meeting)",
      "ส่งสินค้า / รับสินค้า (Delivery)",
      "ซ่อมบำรุง / ติดตั้ง (Maintenance)",
      "อบรม / สอนงาน (Training)",
      "ตรวจสอบ / Audit",
      "สมัครงาน / สัมภาษณ์ (Interview)",
      "วางบิล / รับเช็ค (Billing)",
      "อื่น ๆ (Other)"
    ],
    otherPurpose: "ระบุวัตถุประสงค์อื่น ๆ",
    otherPurposePlaceholder: "ระบุเหตุผลการเข้าพบ",
    submitButton: "ยืนยันการลงทะเบียน",
    loadingText: "กำลังบันทึก...",
    editPhoto: "แก้ไขรูปภาพ / ย้อนกลับ",
    
    // Step 3
    successTitle: "ลงทะเบียนสำเร็จ!",
    successMessage: "บันทึกข้อมูลเข้าพื้นที่เรียบร้อยแล้ว<br />กรุณารอรับบัตร Visitor จากเจ้าหน้าที่",
    finishButton: "เสร็จสิ้น",
    
    // General
    footerText: "SECURITY MANAGEMENT SYSTEM BY TDK INDUSTRIAL",
    siteBadge: "บริษัท ที.ดี.เค.อินดัสเตรียล จำกัด",
    logoText: "TDK INDUSTRIAL"
  },
  en: {
    // Step 1
    step1Title: "Take Photo of ID Card or Business Card",
    step1Guide: "Please place your ID card or important document clearly within the frame",
    takePhoto: "📸 Take Photo",
    usePhoto: "Use This Photo & Fill Info ➔",
    retakePhoto: "Retake Photo",
    
    // Step 2
    step2Title: "Visitor Information",
    fullName: "Full Name",
    fullNamePlaceholder: "Enter visitor name",
    company: "Company / Organization",
    companyPlaceholder: "Your company name",
    phone: "Phone Number",
    phonePlaceholder: "08x-xxxxxxx",
    contactPerson: "Contact Person / Department",
    contactPersonPlaceholder: "TDK staff name",
    purpose: "Purpose of Visit",
    purposePlaceholder: "-- Please Select --",
    purposeOptions: [
      "Meeting",
      "Delivery / Receiving Goods",
      "Maintenance / Installation",
      "Training",
      "Inspection / Audit",
      "Job Application / Interview",
      "Billing / Check Receipt",
      "Other"
    ],
    otherPurpose: "Specify Other Purpose",
    otherPurposePlaceholder: "Specify purpose of visit",
    submitButton: "Confirm Registration",
    loadingText: "Saving...",
    editPhoto: "Edit Photo / Back",
    
    // Step 3
    successTitle: "Registration Successful!",
    successMessage: "Your information has been recorded<br />Please wait for your Visitor Card from staff",
    finishButton: "Finish",
    
    // General
    footerText: "SECURITY MANAGEMENT SYSTEM BY TDK INDUSTRIAL",
    siteBadge: "T.D.K. Industrial Co., Ltd.",
    logoText: "TDK INDUSTRIAL"
  },
  ko: {
    // Step 1
    step1Title: "신분증 또는 명함 사진 촬영",
    step1Guide: "신분증이나 중요 문서를 프레임 안에 명확하게 배치해 주세요",
    takePhoto: "📸 사진 촬영",
    usePhoto: "이 사진 사용 및 정보 입력 ➔",
    retakePhoto: "사진 다시 찍기",
    
    // Step 2
    step2Title: "방문자 정보",
    fullName: "성명",
    fullNamePlaceholder: "방문자 이름 입력",
    company: "회사 / 조직",
    companyPlaceholder: "회사명",
    phone: "전화번호",
    phonePlaceholder: "010-xxxx-xxxx",
    contactPerson: "담당자 / 부서",
    contactPersonPlaceholder: "TDK 담당자 이름",
    purpose: "방문 목적",
    purposePlaceholder: "-- 선택해 주세요 --",
    purposeOptions: [
      "회의 (Meeting)",
      "물품 배송 / 수령 (Delivery)",
      "유지보수 / 설치 (Maintenance)",
      "교육 / 훈련 (Training)",
      "검사 / 감사 (Audit)",
      "취업 지원 / 면접 (Interview)",
      "청구서 / 수표 수령 (Billing)",
      "기타 (Other)"
    ],
    otherPurpose: "기타 목적 지정",
    otherPurposePlaceholder: "방문 목적을 지정해 주세요",
    submitButton: "등록 확인",
    loadingText: "저장 중...",
    editPhoto: "사진 편집 / 뒤로",
    
    // Step 3
    successTitle: "등록 성공!",
    successMessage: "정보가 기록되었습니다<br />직원으로부터 방문증을 받아주세요",
    finishButton: "완료",
    
    // General
    footerText: "TDK INDUSTRIAL 보안 관리 시스템",
    siteBadge: "티디케이 인더스트리얼 주식회사",
    logoText: "TDK INDUSTRIAL"
  }
};

export default function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(true);
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [historyList, setHistoryList] = useState([]);
  const [language, setLanguage] = useState("th"); // 'th', 'en', 'ko'
  const t = translations[language];
  const [isLangOpen, setIsLangOpen] = useState(false);

  

  const [form, setForm] = useState({
    full_name: "",
    company: "",
    phone: "",
    contact_person: "",
    purpose: "",
    other_purpose: "",
  });

  const getFlagImage = (lang) => {
  const flags = {
    th: "https://flagcdn.com/w40/th.png",
    en: "https://flagcdn.com/w40/us.png", 
    ko: "https://flagcdn.com/w40/kr.png"
  };
  return flags[lang] || flags['th'];
};

  const videoRef = useRef(null);
  const streamRef = useRef(null);

  const handleLanguageChange = (lang) => {
  setLanguage(lang);
  setIsLangOpen(false);
};

// เพิ่มใน useEffect หลัก
useEffect(() => {
  const handleClickOutside = (event) => {
    if (isLangOpen && !event.target.closest('.lang-dropdown')) {
      setIsLangOpen(false);
    }
  };

  document.addEventListener('click', handleClickOutside);
  return () => document.removeEventListener('click', handleClickOutside);
}, [isLangOpen]);

  // โหลดประวัติจาก LocalStorage เมื่อเปิด App
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem("visitor_history") || "[]");
    setHistoryList(history);
    
    // โหลดภาษาจาก localStorage ถ้ามี
    const savedLang = localStorage.getItem("tdk_language");
    if (savedLang && translations[savedLang]) {
      setLanguage(savedLang);
    }
  }, []);

  // บันทึกภาษาเมื่อเปลี่ยน
  useEffect(() => {
    localStorage.setItem("tdk_language", language);
  }, [language]);

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
              form.purpose === "อื่น ๆ" || form.purpose === "Other" || form.purpose === "기타 (Other)"
                ? `อื่น ๆ: ${form.other_purpose}`
                : form.purpose,
            checkin_time: new Date().toISOString(),
          },
        ])
        .select()
        .single();

      if (error) throw error;

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

      const history = JSON.parse(
        localStorage.getItem("visitor_history") || "[]"
      );
      const newItem = {
        full_name: form.full_name,
        company: form.company,
        phone: form.phone,
      };
      const filtered = history.filter((h) => h.full_name !== form.full_name);
      const updatedHistory = [newItem, ...filtered].slice(0, 50);
      localStorage.setItem("visitor_history", JSON.stringify(updatedHistory));
      setHistoryList(updatedHistory);

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

  const handleNameChange = (e) => {
    const name = e.target.value;
    setForm((prev) => ({ ...prev, full_name: name }));

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
        :root { 
          --tdk-blue: #003399; 
          --tdk-blue-light: #004ecc; 
          --tdk-bg: #f0f4f8; 
          --text-main: #1a2b49; 
          --card-shadow: 0 20px 40px rgba(0, 51, 153, 0.1);
        }
        body { 
          margin: 0; 
          font-family: 'Kanit', sans-serif; 
          background: var(--tdk-bg); 
          color: var(--text-main); 
          overflow-x: hidden;
        }
        .app-shell { 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          padding: 20px;
          padding-top: 80px; /* เพิ่ม padding-top ให้พอดีกับปุ่มภาษา */
          position: relative;
        }
        
       /* Language Switcher Styles */
.language-switcher {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 1000;
}

.lang-dropdown {
  position: relative;
  display: inline-block;
}

.lang-current {
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  border: 1px solid rgba(0, 51, 153, 0.2);
  border-radius: 12px;
  padding: 10px 16px;
  font-size: 18px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  min-width: 70px;
  justify-content: center;
}

.lang-current:hover {
  background: #f8fafc;
  border-color: var(--tdk-blue);
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(0, 51, 153, 0.15);
}

.lang-arrow {
  display: inline-block;
  transition: transform 0.3s ease;
  margin-left: 5px;
  font-size: 10px;
}

.lang-current:hover .lang-arrow {
  transform: rotate(180deg);
}

.lang-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.1);
  overflow: hidden;
  
  /* เพิ่ม Animation ตรงนี้ */
  animation: slideDown 0.2s ease-out;
  transform-origin: top right;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translateY(-10px) scale(0.95);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes dropdownFade {
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
}

.lang-option {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px 16px;
  background: white;
  border: none;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
  border-bottom: 1px solid #f1f5f9;
  transition: all 0.2s ease;
}

.lang-option:last-child {
  border-bottom: none;
}

.lang-option:hover {
  background-color: #f3f4f6;
  padding-left: 12px; /* ขยับนิดนึงให้ดูมีลูกเล่น */
}

.lang-arrow.open {
  transform: rotate(180deg);
}

.lang-option.active {
  background: #f0f7ff;
  color: var(--tdk-blue);
  font-weight: 500;
}

.lang-option-flag {
  font-size: 20px;
  min-width: 24px;
}

.lang-option-text {
  font-size: 14px;
  font-weight: 500;
}

/* Responsive Styles */
@media (max-width: 640px) {
  .language-switcher {
    top: 15px;
    right: 15px;
  }
  
  .lang-current {
    padding: 8px 14px;
    font-size: 16px;
    min-width: 65px;
  }
  
  .lang-dropdown-menu {
    min-width: 130px;
  }
  
  .lang-option {
    padding: 10px 14px;
  }
  
  .lang-option-text {
    font-size: 13px;
  }
}

@media (max-width: 480px) {
  .language-switcher {
    top: 12px;
    right: 12px;
  }
  
  .lang-current {
    padding: 7px 12px;
    font-size: 15px;
    min-width: 60px;
  }
  
  .lang-dropdown-menu {
    min-width: 120px;
  }
  
  .lang-option-flag {
    font-size: 18px;
  }
}

/* ปิด dropdown เมื่อคลิกข้างนอก */
.use-effect-close-dropdown {
  /* เพิ่ม useEffect สำหรับปิด dropdown เมื่อคลิกข้างนอก */
  /* ให้เพิ่มโค้ดใน useEffect หลักของคุณ */
}
        
        .brand-header { 
          text-align: center; 
          margin: 20px 0 30px; 
          max-width: 100%;
          padding: 0 15px;
        }
        .logo-text { 
          font-size: clamp(32px, 6vw, 42px); 
          font-weight: 800; 
          color: var(--tdk-blue); 
          letter-spacing: -1px; 
          line-height: 1.1;
          word-wrap: break-word;
        }
        .site-badge { 
          background: var(--tdk-blue); 
          color: white; 
          padding: 6px 16px; 
          border-radius: 20px; 
          font-size: clamp(12px, 3vw, 14px); 
          display: inline-block; 
          margin-top: 12px;
          max-width: 100%;
          word-wrap: break-word;
        }
        .card { 
          width: 100%; 
          max-width: 500px; 
          background: white; 
          border-radius: 30px; 
          box-shadow: var(--card-shadow); 
          overflow: hidden; 
          transition: 0.3s;
          margin: 0 auto;
        }
        .card-body { 
          padding: clamp(24px, 5vw, 32px); 
        }
        .camera-container { 
          position: relative; 
          background: #000; 
          border-radius: 20px; 
          overflow: hidden; 
          aspect-ratio: 4/3; 
          border: 3px solid #e2e8f0; 
        }
        video, .snapshot { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
        }
        .id-card-overlay { 
          position: absolute; 
          inset: 0; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          pointer-events: none; 
        }
        .guide-box { 
          width: 85%; 
          height: 75%; 
          border: 2px dashed rgba(255,255,255,0.6); 
          border-radius: 12px; 
          background: rgba(255,255,255,0.05); 
        }
        .input-group { 
          margin-bottom: 20px; 
        }
        label { 
          display: block; 
          font-weight: 500; 
          margin-bottom: 8px; 
          color: #4a5568; 
          font-size: clamp(14px, 3vw, 15px); 
        }
        input, select { 
          width: 100%; 
          padding: 14px 18px; 
          border: 2px solid #edf2f7; 
          border-radius: 15px; 
          font-size: clamp(15px, 3vw, 16px); 
          font-family: inherit; 
          transition: all 0.2s; 
          box-sizing: border-box;
          background: white;
        }
        input:focus, select:focus { 
          border-color: var(--tdk-blue); 
          outline: none; 
          background: #f8fbff; 
        }
        .btn-action { 
          width: 100%; 
          padding: 18px; 
          border-radius: 18px; 
          font-size: clamp(16px, 3.5vw, 18px); 
          font-weight: 600; 
          border: none; 
          cursor: pointer; 
          transition: 0.2s; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          gap: 10px;
          min-height: 60px;
        }
        .btn-tdk { 
          background: var(--tdk-blue); 
          color: white; 
        }
        .btn-tdk:hover { 
          background: var(--tdk-blue-light); 
          transform: translateY(-2px); 
        }
        .btn-tdk:active {
          transform: translateY(0);
        }
        .btn-ghost { 
          background: none; 
          color: #718096; 
          text-decoration: underline; 
          margin-top: 10px; 
          font-size: clamp(13px, 3vw, 14px); 
          padding: 12px;
          min-height: auto;
        }
        .btn-ghost:hover {
          color: var(--tdk-blue);
        }
        .steps { 
          display: flex; 
          justify-content: center; 
          gap: 8px; 
          margin-bottom: 25px; 
        }
        .step-dot { 
          width: 10px; 
          height: 10px; 
          border-radius: 50%; 
          background: #e2e8f0; 
        }
        .step-dot.active { 
          background: var(--tdk-blue); 
          width: 30px; 
          border-radius: 5px; 
        }
        .success-hero { 
          text-align: center; 
          padding: 20px 0; 
        }
        .check-circle { 
          width: 80px; 
          height: 80px; 
          border-radius: 50%; 
          background: #c6f6d5; 
          color: #2f855a; 
          font-size: 40px; 
          display: flex; 
          align-items: center; 
          justify-content: center; 
          margin: 0 auto 20px; 
        }
        .fade { 
          animation: fadeIn 0.4s ease-out; 
        }
        @keyframes fadeIn { 
          from { opacity: 0; transform: translateY(10px); } 
          to { opacity: 1; transform: translateY(0); } 
        }
        
        /* Responsive Styles */
        @media (max-width: 640px) {
          .app-shell {
            padding: 15px;
            padding-top: 70px;
          }
          .card {
            border-radius: 24px;
          }
          .card-body {
            padding: 24px;
          }
          .language-switcher {
            top: 15px;
            right: 15px;
            padding: 8px;
            border-radius: 16px;
          }
          .lang-btn {
            width: 45px;
            height: 36px;
            font-size: 20px;
            border-radius: 10px;
          }
          .brand-header {
            margin: 10px 0 20px;
          }
        }
        
        @media (max-width: 480px) {
          .app-shell {
            padding: 12px;
            padding-top: 65px;
          }
          .card-body {
            padding: 20px;
          }
          .language-switcher {
            top: 10px;
            right: 10px;
          }
          .lang-btn {
            width: 42px;
            height: 34px;
            font-size: 18px;
          }
          input, select {
            padding: 12px 16px;
          }
          .btn-action {
            padding: 16px;
            min-height: 56px;
          }
        }
        
        @media (max-width: 360px) {
          .language-switcher {
            flex-direction: column;
            gap: 5px;
          }
          .lang-btn {
            width: 40px;
            height: 32px;
          }
        }
      `}</style>

     {/* Language Switcher - Dropdown with Flag Images */}
<div className="language-switcher fade">
  <div className="lang-dropdown">
    <button 
      className={`lang-current ${isLangOpen ? 'active' : ''}`}
      onClick={() => setIsLangOpen(!isLangOpen)}
      title="เปลี่ยนภาษา / Change Language / 언어 변경"
    >
      <img 
        src={getFlagImage(language)} 
        alt={language}
        className="lang-current-flag"
      />
      {/* ใส่ Class เพื่อหมุนลูกศร */}
      <span className={`lang-arrow ${isLangOpen ? 'rotating' : ''}`}>▼</span>
    </button>
    
    {/* แสดงเมนูพร้อม Animation */}
    {isLangOpen && (
      <div className="lang-dropdown-menu animate-pop-in">
        {[
          { code: 'th', label: 'ไทย' },
          { code: 'en', label: 'English' },
          { code: 'ko', label: '한국어' }
        ].map((lang) => (
          <button 
            key={lang.code}
            className={`lang-option ${language === lang.code ? 'active' : ''}`}
            onClick={() => {
              handleLanguageChange(lang.code);
              setIsLangOpen(false); // ปิดเมนูหลังจากเลือก
            }}
          >
            <img 
              src={getFlagImage(lang.code)} 
              alt={lang.label} 
              className="lang-option-flag" 
            />
            <span className="lang-option-text">{lang.label}</span>
            {language === lang.code && <span className="check-mark">✓</span>}
          </button>
        ))}
      </div>
    )}
  </div>
</div>

      <div className="brand-header fade">
        <div className="logo-text">
          TDK <span style={{ fontWeight: 300 }}>INDUSTRIAL</span>
        </div>
        <div className="site-badge">{t.siteBadge}</div>
      </div>

      <div className="card">
        <div className="card-body">
          <div className="steps">
            <div className={`step-dot ${step === 1 ? "active" : ""}`}></div>
            <div className={`step-dot ${step === 2 ? "active" : ''}`}></div>
            <div className={`step-dot ${step === 3 ? "active" : ''}`}></div>
          </div>

          {step === 1 && (
            <div className="fade">
              <h2 style={{ textAlign: "center", marginTop: 0, fontSize: "clamp(18px, 4vw, 20px)" }}>
                {t.step1Title}
              </h2>
              <br />
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
              <br />
              <p style={{
                textAlign: "center",
                color: "#718096",
                fontSize: "clamp(13px, 3vw, 14px)",
                marginBottom: 20,
                lineHeight: 1.5,
                padding: "0 10px"
              }}>
                {t.step1Guide}
              </p>

              <div style={{ marginTop: 30 }}>
                {cameraActive ? (
                  <button className="btn-action btn-tdk" onClick={takeSnapshot}>
                    {t.takePhoto}
                  </button>
                ) : (
                  <>
                    <button
                      className="btn-action btn-tdk"
                      onClick={() => setStep(2)}
                    >
                      {t.usePhoto}
                    </button>
                    <button
                      className="btn-action btn-ghost"
                      onClick={() => setCameraActive(true)}
                    >
                      {t.retakePhoto}
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {step === 2 && (
            <form onSubmit={handleSubmit} className="fade">
              <h2 style={{ textAlign: "center", marginTop: 0, fontSize: "clamp(18px, 4vw, 20px)" }}>
                {t.step2Title}
              </h2>

              <div className="input-group">
                <label>{t.fullName}</label>
                <input
                  required
                  list="visitor-names"
                  placeholder={t.fullNamePlaceholder}
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
                <label>{t.company}</label>
                <input
                  required
                  placeholder={t.companyPlaceholder}
                  value={form.company}
                  onChange={(e) => setForm({ ...form, company: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>{t.phone}</label>
                <input
                  required
                  type="tel"
                  placeholder={t.phonePlaceholder}
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>{t.contactPerson}</label>
                <input
                  required
                  placeholder={t.contactPersonPlaceholder}
                  value={form.contact_person}
                  onChange={(e) => setForm({ ...form, contact_person: e.target.value })}
                />
              </div>

              <div className="input-group">
                <label>{t.purpose}</label>
                <select
                  required
                  value={form.purpose}
                  onChange={(e) => setForm({ ...form, purpose: e.target.value })}
                  style={{ color: form.purpose === "" ? "#9ca3af" : "#111827" }}
                >
                  <option value="" disabled hidden>
                    {t.purposePlaceholder}
                  </option>
                  {t.purposeOptions.map((option, index) => (
                    <option key={index} value={option} style={{ color: "#111827" }}>
                      {option}
                    </option>
                  ))}
                </select>
              </div>

              {form.purpose.includes("อื่น") || form.purpose.includes("Other") || form.purpose.includes("기타") ? (
                <div className="input-group fade">
                  <label>{t.otherPurpose}</label>
                  <input
                    required
                    placeholder={t.otherPurposePlaceholder}
                    value={form.other_purpose}
                    onChange={(e) => setForm({ ...form, other_purpose: e.target.value })}
                  />
                </div>
              ) : null}

              <button
                type="submit"
                disabled={loading}
                className="btn-action btn-tdk"
                style={{ marginTop: 10 }}
              >
                {loading ? t.loadingText : t.submitButton}
              </button>
              <button
                type="button"
                className="btn-action btn-ghost"
                onClick={handleEditPhoto}
              >
                {t.editPhoto}
              </button>
            </form>
          )}

          {step === 3 && (
            <div className="success-hero fade">
              <div className="check-circle">✓</div>
              <h2 style={{ color: "var(--tdk-blue)", marginBottom: 10 }}>
                {t.successTitle}
              </h2>
              <p style={{ color: "#718096", lineHeight: 1.6 }} dangerouslySetInnerHTML={{ __html: t.successMessage }} />
              <button
                className="btn-action btn-tdk"
                style={{ marginTop: 40 }}
                onClick={resetForm}
              >
                {t.finishButton}
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{
        marginTop: 40,
        textAlign: "center",
        opacity: 0.3,
        fontSize: "clamp(10px, 2.5vw, 12px)",
        padding: "0 15px"
      }}>
        {t.footerText}
      </div>
    </div>
  );
}