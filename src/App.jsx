import React, { useEffect, useRef, useState } from 'react'
import { supabase } from './supabaseClient'
import { DEFAULT_FIELDS } from './config'
import QRCode from 'qrcode'
import { useNavigate } from 'react-router-dom'

const ORG = import.meta.env.VITE_ORG_NAME || 'Just-iD Visitor'
const SITE = import.meta.env.VITE_SITE_NAME || 'Global Securitech'

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
    note: ''
  })
  const [photoDataUrl, setPhotoDataUrl] = useState('')
  const [loading, setLoading] = useState(false)
  const [visitors, setVisitors] = useState([])
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const navigate = useNavigate()

  // Init webcam
  useEffect(() => {
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
        streamRef.current = stream
        if (videoRef.current) { videoRef.current.srcObject = stream }
      } catch (err) { console.warn('camera error', err) }
    })()
    return () => { if (streamRef.current) { streamRef.current.getTracks().forEach(t => t.stop()) } }
  }, [])

  // Load visitors
  const loadVisitors = async () => {
    const { data, error } = await supabase.from('visitors').select('*').order('id', { ascending: false }).limit(50)
    if (!error) setVisitors(data || [])
  }
  useEffect(() => { loadVisitors() }, [])

  // Realtime subscribe
  useEffect(() => {
    const channel = supabase.channel('visitors-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, payload => { loadVisitors() })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
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
    const filePath = `photos/${visitorId}.jpg`
    const { error } = await supabase.storage.from('photos').upload(filePath, blob, {
      contentType: 'image/jpeg', upsert: true
    })
    if (error) { console.error('upload error', error); return null }
    const { data } = supabase.storage.from('photos').getPublicUrl(filePath)
    return data?.publicUrl || null
  }

  const savePhoto = async () => {
    if (!photoDataUrl) return alert('กรุณาถ่ายรูปก่อน!')
    setLoading(true)
    try {
      const fileName = form.id_number ? `${form.id_number}.jpg` : `${Date.now()}.jpg`
      const blob = await (await fetch(photoDataUrl)).blob()
      const { error } = await supabase.storage.from('photos').upload(`photos/${fileName}`, blob, { contentType: 'image/jpeg', upsert: true })
      if (error) throw error
      const { data } = supabase.storage.from('photos').getPublicUrl(`photos/${fileName}`)
      alert('บันทึกรูปเรียบร้อย! URL: ' + data.publicUrl)
    } catch (err) {
      console.error(err)
      alert('บันทึกรูปไม่สำเร็จ: ' + err.message)
    } finally { setLoading(false) }
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1️⃣ เตรียม payload สำหรับ insert
      const payload = {
        ...form,
        checkin_time: new Date().toISOString(),
        checkout_time: null,
        photo_url: null,
        qr_data: null,
      };

      // 2️⃣ Insert ข้อมูลลง Supabase
      const { data, error } = await supabase
        .from('visitors')
        .insert(payload)
        .select()
        .single();
      if (error) throw error;

      // 3️⃣ Upload รูปถ่าย (ถ้ามี)
      let photoUrl = null;
      if (photoDataUrl) {
        const blob = await (await fetch(photoDataUrl)).blob();
        const fileName = `${data.id}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('photos')
          .upload(`photos/${fileName}`, blob, { contentType: 'image/jpeg', upsert: true });
        if (uploadError) throw uploadError;

        const { data: publicData } = supabase.storage
          .from('photos')
          .getPublicUrl(`photos/${fileName}`);
        photoUrl = publicData?.publicUrl || null;

        // อัปเดท photo_url
        if (photoUrl) {
          await supabase.from('visitors').update({ photo_url: photoUrl }).eq('id', data.id);
        }
      }

      // 4️⃣ สร้าง QR code เป็น URL → /visitor/:id
      const BASE_URL = import.meta.env.VITE_BASE_URL || window.location.origin;
      const qrUrl = `${BASE_URL}/visitor/${data.id}`;
      const qrDataUrl = await QRCode.toDataURL(qrUrl);



      // อัปเดต QR ให้มี id สุดท้าย
      const qrFinal = await QRCode.toDataURL(JSON.stringify({ id: data.id, id_number: form.id_number, time: new Date().toISOString() }))
      await supabase.from('visitors').update({ qr_data: qrFinal }).eq('id', data.id)

      // 6️⃣ Reset form + รูป
      setForm({
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
        note: ''
      });
      setPhotoDataUrl('');

      // 7️⃣ โหลด visitor ใหม่
      await loadVisitors();

      // 8️⃣ เปิดหน้าปริ้นสลิป (ถ้าต้องการ)
      window.open(`/print/${data.id}`, '_blank');

      // alert('บันทึกเรียบร้อย! QR code เป็น URL พร้อมสแกน');
    } catch (err) {
      console.error(err);
      alert('บันทึกไม่สำเร็จ: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const checkOut = async (id) => {
    await supabase.from('visitors').update({ checkout_time: new Date().toISOString() }).eq('id', id)
    loadVisitors()
  }

  const readCard = async () => {
  try {
    const res = await fetch('http://localhost:12345/read-card'); // local server ของ card reader
    if (!res.ok) throw new Error('ไม่สามารถเชื่อมต่อเครื่องอ่านบัตรได้');
    const data = await res.json();
    
    // อัปเดต form ด้วยข้อมูลจากบัตร
    setForm(f => ({
      ...f,
      id_number: data.id_number || '',
      full_name: data.full_name || '',
      gender: data.gender || '',
      // ถ้าต้องการเพิ่ม field อื่น ๆ เช่น birthdate
      note: `วันเกิด: ${data.birthdate || ''}`
    }));
    
    alert('อ่านบัตรสำเร็จ!');
  } catch (err) {
    console.error('อ่านบัตรไม่สำเร็จ', err);
    alert('ไม่พบเครื่องอ่านบัตรหรือบัตรไม่ได้เสียบ');
  }
};


  return (
    <div className="container">
      {/* Header */}
      <div className="row noprint" style={{ marginBottom: 12 }}>
        <div className="badge">องค์กร: <b>{ORG}</b></div>
        <div className="badge">สถานที่: <b>{SITE}</b></div>
        <div className="badge">กล้อง: <span className="kbd">อนุญาต</span> เพื่อถ่ายภาพ</div>
        <button type="button" className="btn outline" style={{ marginLeft: 'auto' }} onClick={() => navigate('/Report')}>📊 Export รายงาน</button>
      </div>

      <div className="grid noprint">
        {/* ฟอร์มลงทะเบียน */}
        <div className="card">
          <h2>ลงทะเบียนผู้มาติดต่อ (Check-in)</h2>
          <form onSubmit={onSubmit}>
            {fields.id_type && (<>
              <label>ประเภทบัตร</label>
              <select value={form.id_type} onChange={e => setForm(f => ({ ...f, id_type: e.target.value }))}>
                <option value="citizen">บัตรประชาชน</option>
                <option value="driver">ใบขับขี่</option>
                <option value="other">อื่น ๆ</option>
              </select>
            </>)}
            {fields.id_number && (<><label>หมายเลขบัตร</label><input value={form.id_number} onChange={e => setForm(f => ({ ...f, id_number: e.target.value }))} /></>)}
            {fields.full_name && (<><label>ชื่อ-นามสกุล</label><input value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} /></>)}
            {fields.gender && (<><label>เพศ</label><select value={form.gender} onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}><option value="">-</option><option value="ชาย">ชาย</option><option value="หญิง">หญิง</option><option value="อื่น ๆ">อื่น ๆ</option></select></>)}

            {/* แถวฟิลด์อื่น ๆ */}
            <div className="row">
              {fields.company && (<div style={{ flex: 1 }}><label>บริษัทต้นสังกัด</label><input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>)}
              {fields.phone && (<div style={{ flex: 1 }}><label>เบอร์โทร</label><input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>)}
            </div>

            <div className="row">
              {fields.contact_person && (<div style={{ flex: 1 }}><label>ผู้ติดต่อภายใน</label><input value={form.contact_person} onChange={e => setForm(f => ({ ...f, contact_person: e.target.value }))} /></div>)}
              {fields.purpose && (<div style={{ flex: 1 }}><label>วัตถุประสงค์</label><input value={form.purpose} onChange={e => setForm(f => ({ ...f, purpose: e.target.value }))} /></div>)}
            </div>

            <div className="row">
              {fields.vehicle_plate && (<div style={{ flex: 1 }}><label>ทะเบียนรถ</label><input value={form.vehicle_plate} onChange={e => setForm(f => ({ ...f, vehicle_plate: e.target.value }))} /></div>)}
              {fields.vehicle_type && (<div style={{ flex: 1 }}><label>ประเภทรถ</label><input value={form.vehicle_type} onChange={e => setForm(f => ({ ...f, vehicle_type: e.target.value }))} /></div>)}
            </div>

            <div className="row">
              {fields.chip_serial && (<div style={{ flex: 1 }}><label>Chip Serial (จากเครื่องอ่าน)</label><input value={form.chip_serial} onChange={e => setForm(f => ({ ...f, chip_serial: e.target.value }))} /></div>)}
              {fields.note && (<div style={{ flex: 1 }}><label>บันทึกเพิ่มเติม</label><input value={form.note} onChange={e => setForm(f => ({ ...f, note: e.target.value }))} /></div>)}
            </div>

            <div style={{ marginTop: 12 }}>
  <button type="button" className="btn outline" onClick={readCard}>
    💳 อ่านบัตรประชาชน
  </button>
</div>


            {/* ภาพถ่าย */}
            <div style={{ marginTop: 12 }}>
              <label>ภาพถ่าย</label>
              <div className="row">
                <video ref={videoRef} autoPlay playsInline style={{ width: 220, height: 160, background: '#000', borderRadius: 12 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button type="button" className="btn" onClick={takeSnapshot}>📸 ถ่ายภาพ</button>
                  <button type="button" className="btn outline" onClick={() => setPhotoDataUrl('')}>🗑 ลบรูป</button>
                  <button type="button" className="btn outline" onClick={savePhoto} disabled={loading}>{loading ? 'กำลังบันทึก...' : '💾 บันทึกรูป'}</button>
                  {photoDataUrl && <img src={photoDataUrl} style={{ width: 220, height: 160, objectFit: 'cover', borderRadius: 12, border: '1px solid #ddd' }} />}
                </div>
              </div>
            </div>

            <div style={{ marginTop: 14 }}>
              <button className="btn" disabled={loading}>{loading ? 'กำลังบันทึก...' : 'บันทึก & ปริ้นสลิป'}</button>
            </div>
            
          </form>
        </div>

        {/* ฟังก์ชันตั้งค่าฟอร์ม เปิด/ปิดช่อง */}
        <div className="card" style={{ marginTop: 16 }}>
          <h2>ตั้งค่าฟอร์ม (เปิด/ปิดช่องกรอก)</h2>
          <div className="row" style={{ gap: 12 }}>
            {Object.keys(fields).map(k => (
              <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid #eee', padding: 6, borderRadius: 10 }}>
                <input type="checkbox" checked={fields[k]} onChange={() => setFields(prev => ({ ...prev, [k]: !prev[k] }))} />
                <span>{k}</span>
              </label>
            ))}
          </div>
          <div style={{ marginTop: 14 }}>
            <p className="badge">เคล็ดลับ: ปรับช่องที่ต้องใช้ให้ตรงนโยบาย เช่น ถ้าไม่ต้องการเก็บเพศ/เลขชิป ก็ปิดได้</p>
          </div>

        </div>
      </div>
    </div>
  )
}
