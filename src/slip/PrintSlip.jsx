import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../supabaseClient'

const ORG = import.meta.env.VITE_ORG_NAME || 'Just-iD Visitor'
const SITE = import.meta.env.VITE_SITE_NAME || 'Global Securitech'

export default function PrintSlip() {
  const { id } = useParams()
  const [v, setV] = useState(null)

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('visitors').select('*').eq('id', id).single()
      if (!error) setV(data)
      setTimeout(() => window.print(), 400)
    })()
  }, [id])

  if (!v) return <div style={{ padding: 40 }}>กำลังโหลด...</div>

  return (
    <div className="receipt" style={{ width: 360, padding: 16, fontFamily: 'Arial, sans-serif', color: '#111827' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>{ORG}</h1>
      </div>
      <div style={{ fontSize: 14, marginBottom: 8 }}>{SITE}</div>
      <div style={{ borderTop: '1px dashed #000', marginBottom: 8 }}></div>

      {/* Visitor Info */}
      <div style={{ fontSize: 12, whiteSpace: 'pre-line' }}>
        <div style={{ marginBottom: 4 }}><b>ID:</b> {String(v.id).padStart(10, '0')}</div>
        <div style={{ marginBottom: 4 }}><b>ผู้ติดต่อ:</b> {v.full_name}</div>
        {v.gender && <div style={{ marginBottom: 4 }}><b>เพศ:</b> {v.gender}</div>}
        {v.contact_person && <div style={{ marginBottom: 4 }}><b>ติดต่อ:</b> {v.contact_person}</div>}
        {v.company && <div style={{ marginBottom: 4 }}><b>จากบริษัท:</b> {v.company}</div>}
        {v.vehicle_plate && <div style={{ marginBottom: 4 }}><b>ทะเบียนรถ:</b> {v.vehicle_plate}</div>}
        {v.purpose && <div style={{ marginBottom: 4 }}><b>ประสงค์:</b> {v.purpose}</div>}
        <div style={{ marginBottom: 4 }}>
          <b>เวลาเข้า:</b> {v.checkin_time ? new Date(v.checkin_time).toLocaleString() : ''}
        </div>
        <div style={{ marginBottom: 8 }}><b>เวลาออก:</b> ................................</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      {/* QR Code */}
      {v.qr_data && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <img src={v.qr_data} alt="qr" style={{ width: 120, height: 120 }} />
        </div>
      )}

      {/* Photo */}
      {v.photo_url && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          <img src={v.photo_url} alt="photo" style={{ width: 140, height: 90, objectFit: 'cover', border: '1px solid #ddd' }} />
        </div>
      )}

      <div style={{ textAlign: 'center', fontSize: 12, marginBottom: 12 }}>TDK</div>

      {/* Signature Box */}
      <div style={{ fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
        <div style={{
          width: 100,
          height: 50,
          border: '1px solid #000',
          borderRadius: 4,
          marginBottom: 4
        }}></div>
        <div style={{ textAlign: 'center', fontSize: 12 }}>
          (ลงชื่อผู้ได้รับการติดต่อ)
        </div>
      </div>

      {/* Footer Note */}
      <div style={{ fontSize: 11, textAlign: 'center' }}>
        (ตั๋วนี้จะต้องนำไปให้เจ้าหน้าที่ เมื่อเสร็จธุระ) โปรดปฏิบัติตามนโยบายความปลอดภัยของหน่วยงาน
      </div>
    </div>
  )
}
