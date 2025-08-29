import React, { useEffect, useState, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom'; // เพิ่ม useLocation
import { supabase } from '../supabaseClient';

const ORG = import.meta.env.VITE_ORG_NAME || 'Just-iD Visitor';
const SITE = import.meta.env.VITE_SITE_NAME || 'Global Securitech';
const LOGO_URL = import.meta.env.VITE_LOGO_URL || '/logo/f.png'; // ใส่ path logo ของคุณ

export default function PrintSlip() {
  const { id } = useParams();
  const location = useLocation(); // ใช้ location จาก react-router
  const [v, setV] = useState(null);
  const printedRef = useRef(false); // กันไม่ให้ print ซ้ำ

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('visitors')
        .select('*')
        .eq('id', id)
        .single()

      if (!error) {
        setV(data)

        // รอ DOM render แล้วค่อยปริ้น
        setTimeout(() => {
          if (!printedRef.current) {
            window.print()
            printedRef.current = true
          }
        }, 500)
      }
    })()
  }, [id])

  function formatDate(dateString) {
    if (!dateString) return '';
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    }).format(new Date(dateString));
  }

  if (!v) return <div style={{ padding: 40 }}>กำลังโหลด...</div>;

  return (
    <div
      className="receipt"
      style={{
        width: '100mm',
        margin: '0 auto',
        padding: '10mm 5mm',
        fontFamily: 'Arial, sans-serif',
        color: '#111827',
        fontSize: 13,
        lineHeight: 1.6,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 12 }}>
        <img src={LOGO_URL} alt="logo" style={{ width: 100, height: 'auto' }} />
      </div>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 8 }}>
        <h1 style={{ fontSize: 18, margin: 0 }}>{ORG}</h1>
        <div style={{ fontSize: 14 }}>{SITE}</div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

      {/* Visitor Info */}
      <div style={{ whiteSpace: 'pre-line', marginBottom: 10 }}>
        <div>
          <b>ID:</b> {String(v.id).padStart(10, '0')}
        </div>
        <div>
          <b>ชื่อ:</b> {v.full_name}
        </div>
        {v.gender && (
          <div>
            <b>เพศ:</b> {v.gender}
          </div>
        )}
        {v.contact_person && (
          <div>
            <b>ติดต่อ:</b> {v.contact_person}
          </div>
        )}
        {v.company && (
          <div>
            <b>บริษัท:</b> {v.company}
          </div>
        )}
        {v.vehicle_plate && (
          <div>
            <b>ทะเบียนรถ:</b> {v.vehicle_plate}
          </div>
        )}
        {v.purpose && (
          <div>
            <b>ประสงค์:</b> {v.purpose}
          </div>
        )}
        <div>
          <b>เวลาเข้า:</b> {formatDate(v.checkin_time)}
        </div>
        <br />
        <br />
        <div>
          <b>เวลาออก:</b> {formatDate(v.checkout_time) || '................................'}
        </div>
      </div>

      <div style={{ borderTop: '1px dashed #000', margin: '10px 0' }}></div>

      {/* QR Code */}
      {v.qr_data && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <img src={v.qr_data} alt="qr" style={{ width: 120, height: 120 }} />
        </div>
      )}

      {/* Photo */}
      {v.photo_url && (
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <img
            src={v.photo_url}
            alt="photo"
            style={{ width: 160, height: 110, objectFit: 'cover', border: '1px solid #ddd' }}
          />
        </div>
      )}

      {/* Signature Box */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 12 }}>
        <div
          style={{
            width: 120,
            height: 60,
            border: '1px solid #000',
            borderRadius: 4,
            marginBottom: 4,
          }}
        ></div>
        <div style={{ fontSize: 12, textAlign: 'center' }}>(ลงชื่อผู้ได้รับการติดต่อ)</div>
      </div>

      {/* Footer Note */}
      <div style={{ fontSize: 12, textAlign: 'center' }}>
        (ตั๋วนี้ต้องนำไปให้เจ้าหน้าที่เมื่อเสร็จธุระ) <br />
        โปรดปฏิบัติตามนโยบายความปลอดภัยของหน่วยงาน
      </div>
    </div>
  );
}
