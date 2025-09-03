// App.jsx
import React, { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { DEFAULT_FIELDS } from './config'
import QRCode from 'qrcode'

const ORG = import.meta.env.VITE_ORG_NAME || 'Just-iD Visitor'
const SITE = import.meta.env.VITE_SITE_NAME || 'Global Securitech'

/** ช่องที่ "จำเป็นต้องกรอก" (จะตรวจเฉพาะช่องที่เปิดใช้งานอยู่จริงใน fields เท่านั้น) */
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
}

/** mapping label ภาษาไทยสำหรับทำ error message */
const labelOf = (key) =>
  ({
    id_type: 'ประเภทบัตร',
    id_number: 'หมายเลขบัตร',
    full_name: 'ชื่อ-นามสกุล',
    gender: 'เพศ',
    company: 'บริษัทต้นสังกัด',
    phone: 'เบอร์โทร',
    contact_person: 'ผู้ติดต่อภายใน',
    purpose: 'วัตถุประสงค์',
    vehicle_plate: 'ทะเบียนรถ',
    vehicle_type: 'ประเภทรถ',
    chip_serial: 'Chip Serial',
    note: 'บันทึกเพิ่มเติม',
  }[key] || key)

export default function App() {
  const [fields, setFields] = useState(DEFAULT_FIELDS)
  const [form, setForm] = useState({
    id_type: 'citizen',
    id_number: '',
    full_name: '',
    gender: '',
    company: '',
    phone: '',
    contact_person: '',
    purpose: '',
    vehicle_plate: '',
    vehicle_type: '',
    chip_serial: '',
    note: '',
  })
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [lang, setLang] = useState('th')

  const [visitors, setVisitors] = useState([])

  // validate & guide states
  const [errors, setErrors] = useState({})
  const firstErrorRef = useRef(null)

  const [showGuide, setShowGuide] = useState(
    () => localStorage.getItem('vms_hide_guide') !== '1'
  )

  const videoRef = useRef(null)
  const streamRef = useRef(null)

  // Init webcam
  useEffect(() => {
    ;(async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
        streamRef.current = stream
        if (videoRef.current) videoRef.current.srcObject = stream
      } catch (err) {
        console.warn('camera error', err)
      }
    })()
    return () => {
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop())
    }
  }, [])

  // Load latest visitors
  const loadVisitors = async () => {
    const { data, error } = await supabase
      .from('visitors')
      .select('*')
      .order('id', { ascending: false })
      .limit(50)
    if (!error) setVisitors(data || [])
  }
  useEffect(() => {
    loadVisitors()
  }, [])

  // Realtime subscribe
  useEffect(() => {
    const channel = supabase
      .channel('visitors-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'visitors' },
        () => {
          loadVisitors()
        }
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const takeSnapshot = () => {
    const video = videoRef.current
    if (!video) return
    const cv = document.createElement('canvas')
    cv.width = video.videoWidth || 640
    cv.height = video.videoHeight || 480
    const ctx = cv.getContext('2d')
    ctx.drawImage(video, 0, 0, cv.width, cv.height)
    const url = cv.toDataURL('image/jpeg', 0.9)
    setPhotoDataUrl(url)
  }

  const uploadPhoto = async (visitorId) => {
    if (!photoDataUrl) return null
    const blob = await (await fetch(photoDataUrl)).blob()
    const filePath = `${visitorId}.jpg`
    const { error } = await supabase.storage
      .from('photos')
      .upload(filePath, blob, { contentType: 'image/jpeg', upsert: true })
    if (error) {
      console.error('upload error', error)
      return null
    }
    const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
    return data?.publicUrl || null
  }

  /** ตรวจความครบถ้วน (คำนึงถึงช่องที่เปิดใช้งานอยู่จริง) */
  const validateForm = () => {
    const _errors = {}
    Object.entries(REQUIRED_FIELDS).forEach(([key, required]) => {
      if (!required) return
      if (fields[key]) {
        const val = (form[key] ?? '').toString().trim()
        if (!val) _errors[key] = `กรุณากรอก ${labelOf(key)}`
        // rule เพิ่มเติมตามต้องการ
        if (key === 'id_number' && val && val.length < 6)
          _errors[key] = 'หมายเลขบัตรควรมีอย่างน้อย 6 หลัก'
        if (key === 'phone' && val && !/^\d{9,10}$/.test(val))
          _errors[key] = 'กรุณากรอกเบอร์โทรให้ถูกต้อง (9–10 หลัก)'
      }
    })

    setErrors(_errors)
    if (Object.keys(_errors).length) {
      const firstKey = Object.keys(_errors)[0]
      const el = document.querySelector(`[data-field="${firstKey}"]`)
      if (el) {
        firstErrorRef.current = el
        setTimeout(() => el.focus({ preventScroll: false }), 0)
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      return false
    }
    return true
  }

  const onSubmit = async (e) => {
    e.preventDefault()
    if (!validateForm()) return

    setLoading(true)
    try {
      // QR ชั่วคราวก่อนมี id
      const payload = {
        full_name: form.full_name,
        id_number: form.id_number,
        time: new Date().toISOString(),
      }
      const qrTemp = await QRCode.toDataURL(JSON.stringify(payload))

      const { data, error } = await supabase
        .from('visitors')
        .insert({
          ...form,
          checkin_time: new Date().toISOString(),
          photo_url: null,
          qr_data: qrTemp,
        })
        .select()
        .single()

      if (error) throw error

      const photoUrl = await uploadPhoto(data.id)
      if (photoUrl) {
        await supabase.from('visitors').update({ photo_url: photoUrl }).eq('id', data.id)
      }

      // อัปเดต QR ให้มี id จริง
      const qrFinal = await QRCode.toDataURL(
        JSON.stringify({
          id: data.id,
          id_number: form.id_number,
          time: new Date().toISOString(),
        })
      )
      await supabase.from('visitors').update({ qr_data: qrFinal }).eq('id', data.id)

      setForm((prev) => ({
        ...prev,
        id_number: '',
        full_name: '',
        phone: '',
        company: '',
        purpose: '',
        vehicle_plate: '',
        vehicle_type: '',
        contact_person: '',
        chip_serial: '',
        note: '',
        gender: '',
      }))
      setPhotoDataUrl('')
      setErrors({})
      await loadVisitors()
      window.open(`/print/${data.id}`, '_blank')
    } catch (err) {
      alert('บันทึกไม่สำเร็จ: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const checkOut = async (id) => {
    await supabase
      .from('visitors')
      .update({ checkout_time: new Date().toISOString() })
      .eq('id', id)
    loadVisitors()
  }

  const toggleField = (key) => setFields((prev) => ({ ...prev, [key]: !prev[key] }))

  const closeGuide = (dontShowAgain = false) => {
    setShowGuide(false)
    if (dontShowAgain) localStorage.setItem('vms_hide_guide', '1')
  }

  return (
    <div className="container">
      {/* inline CSS สำหรับ error & modal */}
      <style>{`
        .input.error{ border:1px solid #e23; box-shadow:0 0 0 3px rgba(226,35,67,.12); }
        .error-text{ color:#e23; margin-top:4px; display:inline-block; }
        .modal-backdrop{ position:fixed; inset:0; background:rgba(0,0,0,.45); display:grid; place-items:center; z-index:9999; }
        .modal{ width:min(680px,92vw); background:#fff; border-radius:16px; padding:20px; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .modal h3{ margin:0 0 10px; font-size:20px }
        .guide{ margin:8px 0 0 18px }
      `}</style>

      <div className="row noprint" style={{ marginBottom: 12 }}>
        <div className="badge">
          องค์กร: <b>{ORG}</b>
        </div>
        <div className="badge">
          สถานที่: <b>{SITE}</b>
        </div>
        <div className="badge">
          กล้อง: <span className="kbd">อนุญาต</span> เพื่อถ่ายภาพ
        </div>
        <button
          type="button"
          className="btn outline"
          style={{ marginLeft: 'auto' }}
          onClick={() => setShowGuide(true)}
        >
          📘 ไกด์ก่อนลงทะเบียน
        </button>
      </div>

      <div className="grid noprint">
        {/* ฟอร์มลงทะเบียน */}
        <div className="card">
          <h2>ลงทะเบียนผู้มาติดต่อ (Check-in)</h2>
          <form onSubmit={onSubmit}>
            {fields.id_type && (
              <>
                <label>ประเภทบัตร</label>
                <select
                  data-field="id_type"
                  className={errors.id_type ? 'input error' : 'input'}
                  aria-invalid={!!errors.id_type}
                  value={form.id_type}
                  onChange={(e) => setForm((f) => ({ ...f, id_type: e.target.value }))}
                >
                  <option value="citizen">บัตรประชาชน</option>
                  <option value="driver">ใบขับขี่</option>
                  <option value="other">อื่น ๆ</option>
                </select>
                {errors.id_type && <small className="error-text">{errors.id_type}</small>}
              </>
            )}

            {fields.id_number && (
              <>
                <label>หมายเลขบัตร</label>
                <input
                  data-field="id_number"
                  aria-invalid={!!errors.id_number}
                  className={errors.id_number ? 'input error' : 'input'}
                  value={form.id_number}
                  onChange={(e) => setForm((f) => ({ ...f, id_number: e.target.value }))}
                />
                {errors.id_number && (
                  <small className="error-text">{errors.id_number}</small>
                )}
              </>
            )}

            {fields.full_name && (
              <>
                <label>ชื่อ-นามสกุล</label>
                <input
                  data-field="full_name"
                  aria-invalid={!!errors.full_name}
                  className={errors.full_name ? 'input error' : 'input'}
                  value={form.full_name}
                  onChange={(e) => setForm((f) => ({ ...f, full_name: e.target.value }))}
                />
                {errors.full_name && (
                  <small className="error-text">{errors.full_name}</small>
                )}
              </>
            )}

            {fields.gender && (
              <>
                <label>เพศ</label>
                <select
                  data-field="gender"
                  aria-invalid={!!errors.gender}
                  className={errors.gender ? 'input error' : 'input'}
                  value={form.gender}
                  onChange={(e) => setForm((f) => ({ ...f, gender: e.target.value }))}
                >
                  <option value="">-</option>
                  <option value="ชาย">ชาย</option>
                  <option value="หญิง">หญิง</option>
                  <option value="อื่น ๆ">อื่น ๆ</option>
                </select>
                {errors.gender && <small className="error-text">{errors.gender}</small>}
              </>
            )}

            <div className="row">
              {fields.company && (
                <div style={{ flex: 1 }}>
                  <label>บริษัทต้นสังกัด</label>
                  <input
                    data-field="company"
                    aria-invalid={!!errors.company}
                    className={errors.company ? 'input error' : 'input'}
                    value={form.company}
                    onChange={(e) => setForm((f) => ({ ...f, company: e.target.value }))}
                  />
                  {errors.company && (
                    <small className="error-text">{errors.company}</small>
                  )}
                </div>
              )}
              {fields.phone && (
                <div style={{ flex: 1 }}>
                  <label>เบอร์โทร</label>
                  <input
                    data-field="phone"
                    aria-invalid={!!errors.phone}
                    className={errors.phone ? 'input error' : 'input'}
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                  />
                  {errors.phone && <small className="error-text">{errors.phone}</small>}
                </div>
              )}
            </div>

            <div className="row">
              {fields.contact_person && (
                <div style={{ flex: 1 }}>
                  <label>ผู้ติดต่อภายใน</label>
                  <input
                    data-field="contact_person"
                    aria-invalid={!!errors.contact_person}
                    className={errors.contact_person ? 'input error' : 'input'}
                    value={form.contact_person}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contact_person: e.target.value }))
                    }
                  />
                  {errors.contact_person && (
                    <small className="error-text">{errors.contact_person}</small>
                  )}
                </div>
              )}
              {fields.purpose && (
             <div style={{ flex: 1 }}>
  <label>วัตถุประสงค์</label>
  <select
    data-field="purpose"
    aria-invalid={!!errors.purpose}
    className={errors.purpose ? 'input error' : 'input'}
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
  </select> <br />

  {/* แสดง input เมื่อเลือก "อื่น ๆ" */}
  {form.purpose === "other" && (
    <input
      type="text"
      placeholder="โปรดระบุวัตถุประสงค์"
      className="input"
      value={form.otherPurpose || ""}
      onChange={(e) => setForm((f) => ({ ...f, otherPurpose: e.target.value }))}
    />
  )}

  {errors.purpose && (
    <small className="error-text">{errors.purpose}</small>
  )}
</div>

              )}
            </div>

            <div className="row">
              {fields.vehicle_plate && (
                <div style={{ flex: 1 }}>
                  <label>ทะเบียนรถ</label>
                  <input
                    data-field="vehicle_plate"
                    aria-invalid={!!errors.vehicle_plate}
                    className={errors.vehicle_plate ? 'input error' : 'input'}
                    value={form.vehicle_plate}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, vehicle_plate: e.target.value }))
                    }
                  />
                  {errors.vehicle_plate && (
                    <small className="error-text">{errors.vehicle_plate}</small>
                  )}
                </div>
              )}
              {fields.vehicle_type && (
                <div style={{ flex: 1 }}>
                  <label>ประเภทรถ</label>
                  <input
                    data-field="vehicle_type"
                    aria-invalid={!!errors.vehicle_type}
                    className={errors.vehicle_type ? 'input error' : 'input'}
                    value={form.vehicle_type}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, vehicle_type: e.target.value }))
                    }
                  />
                  {errors.vehicle_type && (
                    <small className="error-text">{errors.vehicle_type}</small>
                  )}
                </div>
              )}
            </div>

            <div className="row">
              {fields.chip_serial && (
                <div style={{ flex: 1 }}>
                  <label>Chip Serial (จากเครื่องอ่าน)</label>
                  <input
                    data-field="chip_serial"
                    aria-invalid={!!errors.chip_serial}
                    className={errors.chip_serial ? 'input error' : 'input'}
                    value={form.chip_serial}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, chip_serial: e.target.value }))
                    }
                  />
                  {errors.chip_serial && (
                    <small className="error-text">{errors.chip_serial}</small>
                  )}
                </div>
              )}
              {fields.note && (
                <div style={{ flex: 1 }}>
                  <label>บันทึกเพิ่มเติม</label>
                  <input
                    data-field="note"
                    aria-invalid={!!errors.note}
                    className={errors.note ? 'input error' : 'input'}
                    value={form.note}
                    onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  />
                  {errors.note && <small className="error-text">{errors.note}</small>}
                </div>
              )}
            </div>

            <div style={{ marginTop: 12 }}>
              <label>ภาพถ่าย</label>
              <div className="row">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  style={{
                    width: 220,
                    height: 160,
                    background: '#000',
                    borderRadius: 12,
                  }}
                />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button type="button" className="btn" onClick={takeSnapshot}>
                    ถ่ายภาพ
                  </button>
                  <button
                    type="button"
                    className="btn outline"
                    onClick={() => setPhotoDataUrl('')}
                  >
                    ลบรูป
                  </button>
                  {photoDataUrl && (
                    <img
                      src={photoDataUrl}
                      style={{
                        width: 220,
                        height: 160,
                        objectFit: 'cover',
                        borderRadius: 12,
                        border: '1px solid #ddd',
                      }}
                    />
                  )}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button className="btn" disabled={loading}>
                {loading ? 'กำลังบันทึก...' : 'บันทึก & ปริ้นสลิป'}
              </button>
            </div>
          </form>
        </div>

        {/* ตั้งค่าฟอร์ม */}
        <div className="card">
          <h2>ตั้งค่าฟอร์ม (เปิด/ปิดช่องกรอก)</h2>
          <div className="row" style={{ gap: 12 }}>
            {Object.keys(fields).map(k => (
  <label key={k} style={{display:'flex', alignItems:'center', gap:8, border:'1px solid #eee', padding:6, borderRadius:10}}>
    <input type="checkbox" checked={fields[k]} onChange={()=>toggleField(k)} />
     <span>{labelOf(k)}</span>
              </label>
            ))}
          </div>

          <div style={{ marginTop: 14 }}>
            <p className="badge">
              เคล็ดลับ: ปรับช่องที่ต้องใช้ให้ตรงนโยบาย เช่น ถ้าไม่ต้องการเก็บเพศ/เลขชิป ก็ปิดได้
            </p>
          </div>
        </div>
      </div>

      {/* รายการผู้มาติดต่อ */}
      {/* <div className="card noprint" style={{ marginTop: 16 }}>
        <h2>รายการผู้มาติดต่อ (Real-time)</h2>
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>ชื่อ</th>
              <th>ติดต่อกับ</th>
              <th>เวลาเข้า</th>
              <th>เวลาออก</th>
              <th>พิมพ์</th>
              <th>เช็คเอาท์</th>
            </tr>
          </thead>
          <tbody>
            {visitors.map((v) => (
              <tr key={v.id}>
                <td>{v.id}</td>
                <td>{v.full_name}</td>
                <td>{v.contact_person}</td>
                <td>{v.checkin_time ? new Date(v.checkin_time).toLocaleString() : ''}</td>
                <td>
                  {v.checkout_time ? (
                    new Date(v.checkout_time).toLocaleString()
                  ) : (
                    <span style={{ color: '#888' }}>—</span>
                  )}
                </td>
                <td>
                  <a className="btn outline" href={`/print/${v.id}`} target="_blank">
                    พิมพ์
                  </a>
                </td>
                <td>
                  {!v.checkout_time ? (
                    <button className="btn" onClick={() => checkOut(v.id)}>
                      เช็คเอาท์
                    </button>
                  ) : (
                    <span className="badge">เสร็จสิ้น</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div> */}

      {/* Modal ไกด์ก่อนลงทะเบียน */}
      {showGuide && (
        <div className="modal-backdrop">
          <div className="modal">
            <h3>คู่มือก่อนลงทะเบียน</h3>
            <ol className="guide">
              <li>ตรวจบัตรประชาชน/เอกสารก่อน (เลขต้องอ่านชัด)</li>
              <li>ถ่ายภาพหน้าผู้มาติดต่อให้เห็นใบหน้าเต็ม</li>
              <li>กรอก: ชื่อ-สกุล, เบอร์โทร, ผู้ติดต่อภายใน, วัตถุประสงค์ ให้ครบ</li>
              <li>หากใช้รถ ให้กรอกทะเบียน/ประเภทรถ</li>
              <li>ตรวจทานข้อมูลอีกครั้งก่อนกด “บันทึก & ปริ้นสลิป”</li>
            </ol>

            <div className="row" style={{ gap: 8, marginTop: 12 }}>
              <button className="btn" onClick={() => closeGuide(false)}>
                เริ่มลงทะเบียน
              </button>
              <button className="btn outline" onClick={() => closeGuide(true)}>
                ปิด และไม่ต้องโชว์อีก
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
