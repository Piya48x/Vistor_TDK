import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const ORG = import.meta.env.VITE_ORG_NAME || 'Just-iD Visitor'
const SITE = import.meta.env.VITE_SITE_NAME || 'Global Securitech'

export default function SlipFromQR() {
  const [params] = useSearchParams()
  const [data, setData] = useState(null)

  useEffect(() => {
    const qr = params.get('qr')
    if (qr) {
      try {
        const decoded = decodeURIComponent(qr)
        const parsed = JSON.parse(decoded)
        setData(parsed)
        setTimeout(() => window.print(), 400)
      } catch (err) {
        console.error('Invalid QR data', err)
      }
    }
  }, [params])

  if (!data) return <div style={{ padding: 40 }}>กำลังโหลดข้อมูลจาก QR code...</div>

  return (
    <div className="receipt" style={{ width: 360, padding: 16, fontFamily: 'Arial, sans-serif', color: '#111827' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: 20, margin: 0 }}>{ORG}</h1>
      </div>
      <div style={{ fontSize: 14, marginBottom: 8 }}>{SITE}</div>
      <div style={{ borderTop: '1px dashed #000', marginBottom: 8 }}></div>

      <div style={{ fontSize: 12, whiteSpace: 'pre-line' }}>
        <div style={{ marginBottom: 4 }}><b>ID:</b> {String(data.id || '').padStart(10,'0')}</div>
        <div style={{ marginBottom: 4 }}><b>ชื่อ-นามสกุล:</b> {data.full_name || ''}</div>
        {data.gender && <div style={{ marginBottom: 4 }}><b>เพศ:</b> {data.gender}</div>}
        {data.contact_person && <div style={{ marginBottom: 4 }}><b>ติดต่อ:</b> {data.contact_person}</div>}
        {data.company && <div style={{ marginBottom: 4 }}><b>จากบริษัท:</b> {data.company}</div>}
        {data.vehicle_plate && <div style={{ marginBottom: 4 }}><b>ทะเบียนรถ:</b> {data.vehicle_plate}</div>}
        {data.purpose && <div style={{ marginBottom: 4 }}><b>ประสงค์:</b> {data.purpose}</div>}
        <div style={{ marginBottom: 4 }}>
          <b>เวลาเข้า:</b> {data.checkin_time ? new Date(data.checkin_time).toLocaleString() : ''}
        </div>
        <div style={{ marginBottom: 8 }}><b>เวลาออก:</b> {data.checkout_time ? new Date(data.checkout_time).toLocaleString() : '................................'}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '8px 0' }}></div>

      {data.photo_url && (
        <div style={{ display: 'flex', justifyContent: 'center', margin: '8px 0' }}>
          <img src={data.photo_url} alt="photo" style={{ width: 140, height: 90, objectFit: 'cover', border: '1px solid #ddd' }} />
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
        {data.qr_data && <img src={data.qr_data} alt="qr" style={{ width: 120, height: 120 }} />}
      </div>

      <div style={{ textAlign: 'center', fontSize: 12, marginBottom: 12 }}>TDK</div>

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

      <div style={{ fontSize: 11, textAlign: 'center' }}>
        (ตั๋วนี้จะต้องนำไปให้เจ้าหน้าที่ เมื่อเสร็จธุระ) โปรดปฏิบัติตามนโยบายความปลอดภัยของหน่วยงาน
      </div>
    </div>
  )
}
