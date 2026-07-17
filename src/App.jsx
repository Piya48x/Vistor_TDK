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
    openCamera: "เปิดกล้องเพื่อถ่ายบัตร",
    cameraStarting: "กำลังเปิดกล้อง...",
    cameraReady: "วางบัตรในกรอบให้ชัดเจน",
    autoCaptureIn: "ถ่ายอัตโนมัติใน",
    autoCaptureHint: "ระบบจะถ่ายอัตโนมัติเมื่อพบบัตรในกรอบและภาพชัดเท่านั้น",
    detectingCard: "กำลังตรวจหาบัตรในกรอบ",
    alignCard: "วางบัตรให้เต็มกรอบและอยู่นิ่ง",
    focusCard: "ขยับกล้องให้ภาพคมชัดขึ้น",
    holdStill: "จับภาพนิ่งไว้",
    cardLocked: "พร้อมถ่าย",
    manualCaptureReady: "ถ่ายเองได้แล้ว",
    cameraFallback: "ถ่ายผ่านกล้องของมือถือ",
    cameraUnsupportedTitle: "กล้องยังเปิดไม่ได้",
    cameraUnsupportedText: "เบราว์เซอร์นี้อาจไม่อนุญาตให้เว็บเข้าถึงกล้องโดยตรง กรุณาใช้ปุ่มถ่ายผ่านกล้องของมือถือ หรือเปิดใน Chrome",
    cameraPermissionError: "กรุณาอนุญาตการใช้งานกล้อง แล้วลองอีกครั้ง",
    openChrome: "เปิดใน Chrome",
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
    openCamera: "Open Camera",
    cameraStarting: "Opening camera...",
    cameraReady: "Place the card clearly inside the frame",
    autoCaptureIn: "Auto capture in",
    autoCaptureHint: "Auto capture starts only when a clear card is detected inside the frame",
    detectingCard: "Detecting card in frame",
    alignCard: "Fill the frame with the card and hold still",
    focusCard: "Move the camera until the image is sharp",
    holdStill: "Hold still",
    cardLocked: "Ready to capture",
    manualCaptureReady: "Manual capture is available",
    cameraFallback: "Use Phone Camera",
    cameraUnsupportedTitle: "Camera is not available",
    cameraUnsupportedText: "This browser may not allow direct camera access. Use the phone camera button or open this page in Chrome.",
    cameraPermissionError: "Please allow camera access and try again",
    openChrome: "Open in Chrome",
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
    openCamera: "카메라 열기",
    cameraStarting: "카메라를 여는 중...",
    cameraReady: "카드를 프레임 안에 맞춰 주세요",
    autoCaptureIn: "자동 촬영까지",
    autoCaptureHint: "프레임 안에 선명한 카드가 감지될 때만 자동 촬영됩니다",
    detectingCard: "프레임 안의 카드를 감지 중",
    alignCard: "카드를 프레임에 맞추고 고정해 주세요",
    focusCard: "이미지가 선명해지도록 조정해 주세요",
    holdStill: "잠시 고정해 주세요",
    cardLocked: "촬영 준비 완료",
    manualCaptureReady: "직접 촬영할 수 있습니다",
    cameraFallback: "휴대폰 카메라 사용",
    cameraUnsupportedTitle: "카메라를 열 수 없습니다",
    cameraUnsupportedText: "이 브라우저에서는 카메라 접근이 제한될 수 있습니다. 휴대폰 카메라 버튼을 사용하거나 Chrome에서 열어 주세요.",
    cameraPermissionError: "카메라 접근을 허용한 후 다시 시도해 주세요",
    openChrome: "Chrome에서 열기",
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

const CARD_ASPECT_RATIO = 1.586;
const CARD_HOLD_MS = 1200;
const CAMERA_VIEW_ASPECT_RATIO = 4 / 3;
const GUIDE_WIDTH_RATIO = 0.84;

const getVisibleSourceRect = (sourceWidth, sourceHeight) => {
  const sourceAspect = sourceWidth / sourceHeight;

  if (sourceAspect > CAMERA_VIEW_ASPECT_RATIO) {
    const width = sourceHeight * CAMERA_VIEW_ASPECT_RATIO;
    return {
      x: (sourceWidth - width) / 2,
      y: 0,
      width,
      height: sourceHeight,
    };
  }

  const height = sourceWidth / CAMERA_VIEW_ASPECT_RATIO;
  return {
    x: 0,
    y: (sourceHeight - height) / 2,
    width: sourceWidth,
    height,
  };
};

const analyzeCardFrame = (source, canvas) => {
  if (!source || !canvas) {
    return { ok: false, reason: "align" };
  }

  if (source.readyState !== undefined && source.readyState < 2) {
    return { ok: false, reason: "align" };
  }

  const sourceWidth = source.videoWidth || source.naturalWidth || source.width;
  const sourceHeight = source.videoHeight || source.naturalHeight || source.height;
  if (!sourceWidth || !sourceHeight) {
    return { ok: false, reason: "align" };
  }

  const visible = getVisibleSourceRect(sourceWidth, sourceHeight);
  const sampleWidth = 320;
  const sampleHeight = Math.round(sampleWidth / CAMERA_VIEW_ASPECT_RATIO);
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  canvas.width = sampleWidth;
  canvas.height = sampleHeight;
  ctx.drawImage(
    source,
    visible.x,
    visible.y,
    visible.width,
    visible.height,
    0,
    0,
    sampleWidth,
    sampleHeight
  );

  const { data } = ctx.getImageData(0, 0, sampleWidth, sampleHeight);
  const gray = new Uint8Array(sampleWidth * sampleHeight);
  const gradX = new Uint8Array(sampleWidth * sampleHeight);
  const gradY = new Uint8Array(sampleWidth * sampleHeight);
  let sum = 0;

  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    const value = Math.round(data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114);
    gray[p] = value;
    sum += value;
  }

  const mean = sum / gray.length;
  let varianceSum = 0;
  let innerGradientSum = 0;
  let innerVarianceSum = 0;
  let innerSamples = 0;
  const rectWidth = sampleWidth * GUIDE_WIDTH_RATIO;
  const rectHeight = rectWidth / CARD_ASPECT_RATIO;
  const rectX = (sampleWidth - rectWidth) / 2;
  const rectY = (sampleHeight - rectHeight) / 2;
  const innerLeft = Math.round(rectX + rectWidth * 0.18);
  const innerRight = Math.round(rectX + rectWidth * 0.82);
  const innerTop = Math.round(rectY + rectHeight * 0.2);
  const innerBottom = Math.round(rectY + rectHeight * 0.8);

  for (let y = 1; y < sampleHeight - 1; y += 1) {
    for (let x = 1; x < sampleWidth - 1; x += 1) {
      const idx = y * sampleWidth + x;
      const gx = Math.abs(gray[idx + 1] - gray[idx - 1]);
      const gy = Math.abs(gray[idx + sampleWidth] - gray[idx - sampleWidth]);
      gradX[idx] = Math.min(gx, 255);
      gradY[idx] = Math.min(gy, 255);
      varianceSum += (gray[idx] - mean) ** 2;

      if (x >= innerLeft && x <= innerRight && y >= innerTop && y <= innerBottom) {
        innerSamples += 1;
        innerGradientSum += gx + gy;
        innerVarianceSum += (gray[idx] - mean) ** 2;
      }
    }
  }

  const sampleCount = (sampleWidth - 2) * (sampleHeight - 2);
  const variance = varianceSum / sampleCount;
  const innerSharpness = innerGradientSum / Math.max(innerSamples, 1);
  const innerVariance = innerVarianceSum / Math.max(innerSamples, 1);
  const edgeThreshold = Math.max(34, Math.min(72, Math.sqrt(variance) * 2.4));
  const sideBand = Math.round(sampleWidth * 0.04);
  const rectLeft = Math.round(rectX);
  const rectRight = Math.round(rectX + rectWidth);
  const rectTop = Math.round(rectY);
  const rectBottom = Math.round(rectY + rectHeight);

  const scanVerticalEdge = (edgeX) => {
    let hits = 0;
    let samples = 0;
    const yStart = Math.round(rectY + rectHeight * 0.12);
    const yEnd = Math.round(rectY + rectHeight * 0.88);

    for (let y = yStart; y <= yEnd; y += 2) {
      let maxEdge = 0;
      for (let x = edgeX - sideBand; x <= edgeX + sideBand; x += 1) {
        if (x <= 1 || x >= sampleWidth - 2 || y <= 1 || y >= sampleHeight - 2) continue;
        maxEdge = Math.max(maxEdge, gradX[y * sampleWidth + x]);
      }
      if (maxEdge >= edgeThreshold) hits += 1;
      samples += 1;
    }

    return hits / Math.max(samples, 1);
  };

  const scanHorizontalEdge = (edgeY) => {
    let hits = 0;
    let samples = 0;
    const xStart = Math.round(rectX + rectWidth * 0.1);
    const xEnd = Math.round(rectX + rectWidth * 0.9);

    for (let x = xStart; x <= xEnd; x += 2) {
      let maxEdge = 0;
      for (let y = edgeY - sideBand; y <= edgeY + sideBand; y += 1) {
        if (x <= 1 || x >= sampleWidth - 2 || y <= 1 || y >= sampleHeight - 2) continue;
        maxEdge = Math.max(maxEdge, gradY[y * sampleWidth + x]);
      }
      if (maxEdge >= edgeThreshold) hits += 1;
      samples += 1;
    }

    return hits / Math.max(samples, 1);
  };

  const averageGray = (xStart, xEnd, yStart, yEnd) => {
    const left = Math.max(0, Math.round(Math.min(xStart, xEnd)));
    const right = Math.min(sampleWidth - 1, Math.round(Math.max(xStart, xEnd)));
    const top = Math.max(0, Math.round(Math.min(yStart, yEnd)));
    const bottom = Math.min(sampleHeight - 1, Math.round(Math.max(yStart, yEnd)));
    let total = 0;
    let count = 0;

    for (let y = top; y <= bottom; y += 1) {
      for (let x = left; x <= right; x += 1) {
        total += gray[y * sampleWidth + x];
        count += 1;
      }
    }

    return total / Math.max(count, 1);
  };

  const yBandStart = Math.round(rectY + rectHeight * 0.18);
  const yBandEnd = Math.round(rectY + rectHeight * 0.82);
  const xBandStart = Math.round(rectX + rectWidth * 0.14);
  const xBandEnd = Math.round(rectX + rectWidth * 0.86);
  const contrastBand = Math.max(8, Math.round(sideBand * 0.8));
  const sideContrasts = {
    left: Math.abs(
      averageGray(rectLeft + 3, rectLeft + contrastBand, yBandStart, yBandEnd) -
        averageGray(rectLeft - contrastBand, rectLeft - 3, yBandStart, yBandEnd)
    ),
    right: Math.abs(
      averageGray(rectRight - contrastBand, rectRight - 3, yBandStart, yBandEnd) -
        averageGray(rectRight + 3, rectRight + contrastBand, yBandStart, yBandEnd)
    ),
    top: Math.abs(
      averageGray(xBandStart, xBandEnd, rectTop + 3, rectTop + contrastBand) -
        averageGray(xBandStart, xBandEnd, rectTop - contrastBand, rectTop - 3)
    ),
    bottom: Math.abs(
      averageGray(xBandStart, xBandEnd, rectBottom - contrastBand, rectBottom - 3) -
        averageGray(xBandStart, xBandEnd, rectBottom + 3, rectBottom + contrastBand)
    ),
  };

  const sideScores = {
    left: scanVerticalEdge(rectLeft),
    right: scanVerticalEdge(rectRight),
    top: scanHorizontalEdge(rectTop),
    bottom: scanHorizontalEdge(rectBottom),
  };

  const sidesPresent = Object.values(sideScores).filter((score) => score >= 0.48).length;
  const contrastSides = Object.values(sideContrasts).filter((contrast) => contrast >= 8).length;
  const allSidesStrong = sidesPresent === 4 && contrastSides >= 3 && Math.min(...Object.values(sideContrasts)) >= 5;

  if (mean < 45 || mean > 238) {
    return { ok: false, reason: "align" };
  }

  if (!allSidesStrong) {
    return {
      ok: false,
      reason: "align",
      score: Math.round(Math.min(...Object.values(sideScores)) * 100),
      sideScores,
      sideContrasts,
    };
  }

  if (innerSharpness < 18 || innerVariance < 95) {
    return { ok: false, reason: "focus" };
  }

  return {
    ok: true,
    reason: "ready",
    score: Math.round(Math.min(...Object.values(sideScores)) * 100),
    sideScores,
    sideContrasts,
  };
};

export default function App() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraStatus, setCameraStatus] = useState("idle");
  const [cameraError, setCameraError] = useState("");
  const [autoCountdown, setAutoCountdown] = useState(null);
  const [cardStatus, setCardStatus] = useState("idle");
  const [cardMessage, setCardMessage] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState("");
  const [historyList, setHistoryList] = useState([]);
  const [language, setLanguage] = useState("th"); // 'th', 'en', 'ko'
  const t = translations[language];
  const [isLangOpen, setIsLangOpen] = useState(false);
  const userAgent = typeof navigator === "undefined" ? "" : navigator.userAgent;
  const isLineBrowser = /Line\//i.test(userAgent);
  const prefersNativeCamera = isLineBrowser || /Android|iPhone|iPad|iPod/i.test(userAgent);

  

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
  const fileInputRef = useRef(null);
  const autoTimerRef = useRef(null);
  const detectionTimerRef = useRef(null);
  const analysisCanvasRef = useRef(null);
  const cardReadySinceRef = useRef(null);
  const captureLockedRef = useRef(false);

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
    if (step !== 1) {
      stopCamera();
    }
    return () => stopCamera();
  }, [step]);

  const startCamera = async () => {
    if (prefersNativeCamera) {
      openNativeCamera();
      return;
    }

    resetCardDetection();
    setPhotoDataUrl("");
    setCameraError("");
    setCameraStatus("starting");
    setCameraActive(true);
    setCardStatus("searching");
    setCardMessage(t.detectingCard);

    try {
      if (!window.isSecureContext && window.location.hostname !== "localhost") {
        throw new Error("INSECURE_CONTEXT");
      }

      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("UNSUPPORTED_CAMERA");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: "environment" },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });
      streamRef.current = stream;

      const [track] = stream.getVideoTracks();
      if (track?.applyConstraints) {
        track.applyConstraints({ advanced: [{ focusMode: "continuous" }] }).catch(() => {});
      }

      if (!videoRef.current) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setCameraStatus("ready");
      startCardDetection();
    } catch (err) {
      console.error("Camera Error:", err);
      const blockedByPermission = err.name === "NotAllowedError" || err.name === "SecurityError";
      setCameraError(blockedByPermission ? t.cameraPermissionError : t.cameraUnsupportedText);
      setCameraStatus("error");
      setCameraActive(false);
      resetCardDetection();
      stopCamera();
    }
  };

  const stopCamera = () => {
    resetCardDetection();
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  const clearAutoCapture = () => {
    if (autoTimerRef.current) {
      clearInterval(autoTimerRef.current);
      autoTimerRef.current = null;
    }
    setAutoCountdown(null);
  };

  const clearCardDetectionTimer = () => {
    if (detectionTimerRef.current) {
      clearInterval(detectionTimerRef.current);
      detectionTimerRef.current = null;
    }
  };

  const resetCardDetection = () => {
    clearAutoCapture();
    clearCardDetectionTimer();
    cardReadySinceRef.current = null;
    captureLockedRef.current = false;
    setCardStatus("idle");
    setCardMessage("");
  };

  const openNativeCamera = () => {
    resetCardDetection();
    stopCamera();
    setCameraActive(false);
    setCameraStatus("idle");
    setCameraError("");

    const input = fileInputRef.current;
    if (!input) return;

    try {
      if (typeof input.showPicker === "function") {
        input.showPicker();
        return;
      }
    } catch {
      // Some in-app browsers expose showPicker but still block it.
    }

    input.click();
  };

  const openInChrome = () => {
    const currentUrl = window.location.href;
    const withoutProtocol = currentUrl.replace(/^https?:\/\//, "");
    const scheme = window.location.protocol.replace(":", "") || "https";

    if (/Android/i.test(userAgent)) {
      window.location.href = `intent://${withoutProtocol}#Intent;scheme=${scheme};package=com.android.chrome;end`;
      return;
    }

    window.location.href = currentUrl
      .replace(/^https:\/\//, "googlechromes://")
      .replace(/^http:\/\//, "googlechrome://");
  };

  const startAutoCapture = (remainingMs) => {
    clearAutoCapture();
    let seconds = Math.max(1, Math.ceil(remainingMs / 1000));
    setAutoCountdown(seconds);
    autoTimerRef.current = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) {
        clearAutoCapture();
        return;
      }
      setAutoCountdown(seconds);
    }, 1000);
  };

  const startCardDetection = () => {
    clearCardDetectionTimer();
    analysisCanvasRef.current = analysisCanvasRef.current || document.createElement("canvas");

    detectionTimerRef.current = setInterval(() => {
      const result = analyzeCardFrame(videoRef.current, analysisCanvasRef.current);
      const now = Date.now();

      if (!result.ok) {
        cardReadySinceRef.current = null;
        captureLockedRef.current = false;
        clearAutoCapture();
        setCardStatus(result.reason === "focus" ? "focus" : "searching");
        setCardMessage(result.reason === "focus" ? t.focusCard : t.alignCard);
        return;
      }

      if (!cardReadySinceRef.current) {
        cardReadySinceRef.current = now;
        startAutoCapture(CARD_HOLD_MS);
      }

      const holdMs = now - cardReadySinceRef.current;
      const remainingMs = Math.max(CARD_HOLD_MS - holdMs, 0);
      const ready = holdMs >= CARD_HOLD_MS;

      setCardStatus(ready ? "ready" : "holding");
      setCardMessage(ready ? t.cardLocked : t.holdStill);
      setAutoCountdown(ready ? null : Math.max(1, Math.ceil(remainingMs / 1000)));

      if (ready && !captureLockedRef.current) {
        captureLockedRef.current = true;
        clearAutoCapture();
        window.setTimeout(() => {
          const finalCheck = analyzeCardFrame(videoRef.current, analysisCanvasRef.current);
          if (finalCheck.ok) {
            takeSnapshot();
            return;
          }

          cardReadySinceRef.current = null;
          captureLockedRef.current = false;
          setCardStatus(finalCheck.reason === "focus" ? "focus" : "searching");
          setCardMessage(finalCheck.reason === "focus" ? t.focusCard : t.alignCard);
        }, 180);
      }
    }, 250);
  };

  const takeSnapshot = () => {
    if (!videoRef.current || videoRef.current.readyState < 2) {
      return;
    }

    resetCardDetection();
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth || 1280;
    canvas.height = videoRef.current.videoHeight || 720;
    canvas.getContext("2d").drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
    setPhotoDataUrl(canvas.toDataURL("image/jpeg", 0.9));
    setCameraActive(false);
    setCameraStatus("idle");
    stopCamera();
  };

  const handleCameraFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      resetCardDetection();
      stopCamera();
      setPhotoDataUrl(typeof reader.result === "string" ? reader.result : "");
      setCameraActive(false);
      setCameraStatus("idle");
      setCameraError("");
    };
    reader.readAsDataURL(file);
    event.target.value = "";
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
    setCameraActive(false);
    setCameraStatus("idle");
    setCameraError("");
    resetCardDetection();
    setStep(1);
  };

  const handleEditPhoto = () => {
    setCameraActive(false);
    setCameraStatus("idle");
    setCameraError("");
    resetCardDetection();
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
        .camera-container.is-idle {
          background: linear-gradient(135deg, #0f172a, #1f2937);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        video, .snapshot { 
          width: 100%; 
          height: 100%; 
          object-fit: cover; 
        }
        .camera-placeholder {
          color: white;
          text-align: center;
          padding: 28px;
        }
        .camera-placeholder-icon {
          width: 68px;
          height: 68px;
          border-radius: 999px;
          background: rgba(255,255,255,0.12);
          border: 1px solid rgba(255,255,255,0.22);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 0 auto 16px;
          font-size: 30px;
        }
        .camera-placeholder-title {
          font-size: clamp(18px, 4vw, 22px);
          font-weight: 700;
          margin-bottom: 8px;
        }
        .camera-placeholder-text {
          font-size: clamp(13px, 3vw, 14px);
          color: rgba(255,255,255,0.72);
          line-height: 1.6;
          margin: 0;
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
          width: 84%; 
          aspect-ratio: 1.586 / 1;
          position: relative;
          border: 1px solid rgba(255,255,255,0.42); 
          border-radius: 14px; 
          background: rgba(255,255,255,0.04); 
          box-shadow: 0 0 0 999px rgba(0,0,0,0.34);
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .guide-box.status-holding {
          border-color: #fbbf24;
          background: rgba(251,191,36,0.08);
          box-shadow: 0 0 0 999px rgba(0,0,0,0.34), 0 0 28px rgba(251,191,36,0.45);
        }
        .guide-box.status-ready {
          border-color: #22c55e;
          background: rgba(34,197,94,0.08);
          box-shadow: 0 0 0 999px rgba(0,0,0,0.28), 0 0 30px rgba(34,197,94,0.55);
        }
        .guide-corner {
          position: absolute;
          width: 30px;
          height: 30px;
          border-color: #ffffff;
          border-style: solid;
          transition: border-color 0.2s ease;
        }
        .guide-box.status-holding .guide-corner {
          border-color: #fbbf24;
        }
        .guide-box.status-ready .guide-corner {
          border-color: #22c55e;
        }
        .guide-corner.top-left {
          top: -3px;
          left: -3px;
          border-width: 4px 0 0 4px;
          border-top-left-radius: 14px;
        }
        .guide-corner.top-right {
          top: -3px;
          right: -3px;
          border-width: 4px 4px 0 0;
          border-top-right-radius: 14px;
        }
        .guide-corner.bottom-left {
          bottom: -3px;
          left: -3px;
          border-width: 0 0 4px 4px;
          border-bottom-left-radius: 14px;
        }
        .guide-corner.bottom-right {
          right: -3px;
          bottom: -3px;
          border-width: 0 4px 4px 0;
          border-bottom-right-radius: 14px;
        }
        .camera-status-pill {
          position: absolute;
          left: 50%;
          bottom: 18px;
          transform: translateX(-50%);
          color: white;
          background: rgba(0, 0, 0, 0.62);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 999px;
          padding: 8px 14px;
          font-size: clamp(12px, 3vw, 14px);
          font-weight: 600;
          backdrop-filter: blur(8px);
          white-space: nowrap;
        }
        .camera-status-pill.status-holding {
          background: rgba(146, 64, 14, 0.82);
          border-color: rgba(251,191,36,0.55);
        }
        .camera-status-pill.status-ready {
          background: rgba(22, 101, 52, 0.86);
          border-color: rgba(34,197,94,0.7);
        }
        .camera-help {
          border-radius: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          color: #475569;
          font-size: clamp(13px, 3vw, 14px);
          line-height: 1.55;
          padding: 12px 14px;
          margin: 16px 0 0;
        }
        .camera-error {
          border-color: #fecdd3;
          background: #fff1f2;
          color: #9f1239;
        }
        .camera-actions {
          display: grid;
          gap: 12px;
          margin-top: 24px;
        }
        .btn-secondary {
          background: #eef2ff;
          color: var(--tdk-blue);
        }
        .btn-secondary:hover {
          background: #e0e7ff;
          transform: translateY(-2px);
        }
        .hidden-camera-input {
          position: fixed;
          left: -9999px;
          opacity: 0;
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
              <div className={`camera-container ${!cameraActive && !photoDataUrl ? "is-idle" : ""}`}>
                {photoDataUrl ? (
                  <img src={photoDataUrl} className="snapshot" alt="Captured" />
                ) : cameraActive ? (
                  <>
                    <video ref={videoRef} autoPlay playsInline muted />
                    <div className="id-card-overlay">
                      <div className={`guide-box status-${cardStatus}`}>
                        <span className="guide-corner top-left"></span>
                        <span className="guide-corner top-right"></span>
                        <span className="guide-corner bottom-left"></span>
                        <span className="guide-corner bottom-right"></span>
                      </div>
                    </div>
                    <div className={`camera-status-pill status-${cardStatus}`}>
                      {cardStatus === "ready"
                        ? t.cardLocked
                        : autoCountdown
                          ? `${t.holdStill} ${autoCountdown}`
                        : cameraStatus === "starting"
                          ? t.cameraStarting
                          : cardMessage || t.detectingCard}
                    </div>
                  </>
                ) : (
                  <div className="camera-placeholder">
                    <div className="camera-placeholder-icon">▣</div>
                    <div className="camera-placeholder-title">
                      {prefersNativeCamera ? t.cameraFallback : t.openCamera}
                    </div>
                    <p className="camera-placeholder-text">
                      {prefersNativeCamera ? t.step1Guide : t.autoCaptureHint}
                    </p>
                  </div>
                )}
              </div>
              <input
                ref={fileInputRef}
                className="hidden-camera-input"
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleCameraFile}
              />
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

              {cameraError && (
                <div className="camera-help camera-error">
                  <strong>{t.cameraUnsupportedTitle}</strong><br />
                  {cameraError}
                </div>
              )}

              <div className="camera-actions">
                {photoDataUrl ? (
                  <>
                    <button
                      className="btn-action btn-tdk"
                      onClick={() => setStep(2)}
                    >
                      {t.usePhoto}
                    </button>
                    <button
                      className="btn-action btn-ghost"
                      onClick={prefersNativeCamera ? openNativeCamera : startCamera}
                    >
                      {t.retakePhoto}
                    </button>
                  </>
                ) : cameraActive ? (
                  <button className="btn-action btn-tdk" onClick={takeSnapshot} disabled={cameraStatus !== "ready"}>
                    {cameraStatus === "ready" ? t.takePhoto : t.cameraStarting}
                  </button>
                ) : (
                  prefersNativeCamera ? (
                    <>
                      <button
                        className="btn-action btn-tdk"
                        onClick={openNativeCamera}
                      >
                        {t.cameraFallback}
                      </button>
                      {(isLineBrowser || cameraError) && (
                        <button
                          className="btn-action btn-ghost"
                          onClick={openInChrome}
                        >
                          {t.openChrome}
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <button
                        className="btn-action btn-tdk"
                        onClick={startCamera}
                        disabled={cameraStatus === "starting"}
                      >
                        {cameraStatus === "starting" ? t.cameraStarting : t.openCamera}
                      </button>
                      <button
                        className="btn-action btn-secondary"
                        onClick={openNativeCamera}
                      >
                        {t.cameraFallback}
                      </button>
                      {cameraError && (
                        <button
                          className="btn-action btn-ghost"
                          onClick={openInChrome}
                        >
                          {t.openChrome}
                        </button>
                      )}
                    </>
                  )
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
