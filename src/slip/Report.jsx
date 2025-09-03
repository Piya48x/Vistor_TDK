import React, { useEffect, useState, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { DEFAULT_FIELDS } from '../config'
import ExcelJS from 'exceljs'
import { saveAs } from 'file-saver'
import { useNavigate } from 'react-router-dom'

const ORG = import.meta.env.VITE_ORG_NAME || 'Just-iD Visitor'
const SITE = import.meta.env.VITE_SITE_NAME || 'Global Securitech'

export default function Report() {
  const [fields, setFields] = useState(DEFAULT_FIELDS)
  const [visitors, setVisitors] = useState([])
  const [searchDate, setSearchDate] = useState('')
  const [searchName, setSearchName] = useState('')
  const [selectedIds, setSelectedIds] = useState([])
  const printedIdsRef = useRef(new Set())
  const navigate = useNavigate()

  // Load visitors
  const loadVisitors = async (dateFilter = '', nameFilter = '') => {
    let query = supabase.from('visitors').select('*').order('id', { ascending: false }).limit(50)

    if (dateFilter) {
      const start = new Date(dateFilter)
      start.setHours(0, 0, 0, 0)
      const end = new Date(dateFilter)
      end.setHours(23, 59, 59, 999)
      query = query.gte('checkin_time', start.toISOString()).lte('checkin_time', end.toISOString())
    }

    if (nameFilter) {
      query = query.ilike('full_name', `%${nameFilter}%`)
    }

    const { data, error } = await query
    if (!error) setVisitors(data || [])
  }

  useEffect(() => { loadVisitors() }, [])

  // Reset filter every 24 hours
  useEffect(() => {
    const lastReset = localStorage.getItem('reportReset')
    const now = Date.now()
    if (!lastReset || now - parseInt(lastReset) > 24 * 60 * 60 * 1000) {
      localStorage.setItem('reportReset', now.toString())
      setSearchDate('')
      setSearchName('')
      loadVisitors()
    }
  }, [])

  // Realtime update
  useEffect(() => {
    const channel = supabase
      .channel('visitors-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'visitors' }, (payload) => {
        loadVisitors(searchDate, searchName)
        if (payload.eventType === 'INSERT') {
          const newVisitor = payload.new
          if (newVisitor?.id && !printedIdsRef.current.has(newVisitor.id)) {
            printedIdsRef.current.add(newVisitor.id)
            window.open(`/print/${newVisitor.id}`, '_blank')
          }
        }
      })
      .subscribe()

    return () => supabase.removeChannel(channel)
  }, [])

  // toggle select
  const toggleSelect = (id) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  // select all
  const toggleSelectAll = () => {
    if (selectedIds.length === visitors.length) setSelectedIds([])
    else setSelectedIds(visitors.map((v) => v.id))
  }

  const checkOut = async (id) => {
    await supabase.from('visitors').update({ checkout_time: new Date().toISOString() }).eq('id', id)
    loadVisitors(searchDate, searchName)
  }

  const deleteVisitor = async (ids) => {
    if (!ids.length) return alert('กรุณาเลือกรายการก่อน')
    if (!confirm('ต้องการลบรายการที่เลือกใช่หรือไม่?')) return
    await supabase.from('visitors').delete().in('id', ids)
    setSelectedIds([])
    loadVisitors(searchDate, searchName)
  }

  // export excel with photo (aligned per-row)
  const exportToExcel = async (ids) => {
    const rows = ids.length ? visitors.filter((v) => ids.includes(v.id)) : visitors
    if (!rows.length) return alert('กรุณาเลือกรายการก่อน')

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Visitors')

    ws.columns = [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'ชื่อ', key: 'full_name', width: 25 },
      { header: 'ผู้ติดต่อ', key: 'contact_person', width: 25 },
      { header: 'เวลาเข้า', key: 'checkin_time', width: 22 },
      { header: 'เวลาออก', key: 'checkout_time', width: 22 },
      { header: 'รูปถ่าย', key: 'photo', width: 18 }, // photo column
    ]

    // Header style + freeze + autofilter
    ws.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } }
    ws.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' }
    ws.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E40AF' } }
    ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1 }]
    ws.autoFilter = 'A1:F1'

    const PHOTO_COL_LETTER = 'F' // 6th column

    for (const v of rows) {
      const row = ws.addRow({
        id: String(v.id).padStart(10, '0'),
        full_name: v.full_name || '',
        contact_person: v.contact_person || '',
        checkin_time: v.checkin_time ? new Date(v.checkin_time).toLocaleString() : '',
        checkout_time: v.checkout_time ? new Date(v.checkout_time).toLocaleString() : '',
        photo: ''
      })

      // Make each data row tall enough for the image
      row.height = 48 // points (~64px). Adjust if needed

      if (v.photo_url) {
        try {
          const res = await fetch(v.photo_url)
          const buf = await res.arrayBuffer()
          const ct = res.headers.get('content-type') || ''
          const ext = ct.includes('png') ? 'png' : 'jpeg'
          const imgId = wb.addImage({ buffer: buf, extension: ext })

          // Place image exactly inside its row's photo cell (fit-to-cell)
          const cellRef = `${PHOTO_COL_LETTER}${row.number}:${PHOTO_COL_LETTER}${row.number}`
          ws.addImage(imgId, cellRef)
        } catch (err) {
          console.warn('ไม่สามารถโหลดรูป', v.photo_url, err)
        }
      }
    }

    const buf = await wb.xlsx.writeBuffer()
    saveAs(new Blob([buf], { type: 'application/octet-stream' }), `visitors_${new Date().toISOString().slice(0, 10)}.xlsx`)
  }

  return (
    <div className="container mx-auto p-6 space-y-6"><br />
      {/* Header */}
 {/* Header / Context */}
<div className="noprint rounded-xl border bg-white/70 backdrop-blur p-4 md:p-5 shadow-sm">
  <div className="grid grid-cols-1 md:grid-cols-3 items-center gap-3 md:gap-4">
    {/* Org */}
    <div className="inline-flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-blue-800">
      <span className="text-base">🏢</span>
      <span className="text-sm md:text-base">
        องค์กร: <b className="font-semibold">{ORG}</b>
      </span>
    </div>

    {/* Site */}
    <div className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-800">
      <span className="text-base">📍</span>
      <span className="text-sm md:text-base">
        สถานที่: <b className="font-semibold">{SITE}</b>
      </span>
    </div>

    {/* Back button (right) */}
    <div className="md:col-start-3 flex justify-end">
     
    </div>
  </div>
</div>


<br />
      {/* Search / Action */}
      <div className="flex flex-wrap gap-3 items-center noprint" style={{ marginBottom: 20 }}>
        <input
          type="date"
          value={searchDate}
          onChange={(e) => setSearchDate(e.target.value)}
          className="border rounded px-3 py-2 shadow-sm"
        /> <br />
        <input
          type="text"
          placeholder="ค้นหาชื่อ"
          value={searchName}
          onChange={(e) => setSearchName(e.target.value)}
          className="border rounded px-3 py-2 shadow-sm"
        /> 
       <div><br />
         <button onClick={() => loadVisitors(searchDate, searchName)} style={{marginRight: 10}} className="ml-8 custom-btn bg-blue-500 text-white px-4 py-2 rounded shadow hover:bg-blue-600">ค้นหา</button>
        <button onClick={() => exportToExcel(selectedIds)} style={{marginRight: 10}} className="custom-btn bg-green-500 text-white px-4 py-2 rounded shadow hover:bg-green-600">Export</button>
        <button onClick={() => deleteVisitor(selectedIds)} style={{marginRight: 10}} className="custom-btn bg-red-500 text-white px-4 py-2 rounded shadow hover:bg-red-600">ลบ</button>
         <button
        onClick={() => navigate('/')}
        className="custom-btn inline-flex items-center gap-2 rounded-lg bg-gray-700 px-5 py-2.5 text-white shadow hover:bg-gray-800 active:scale-[.98] transition"
      >
        <span className="text-lg">↩️</span>
        <span className="font-medium">กลับสู่หน้าหลัก</span>
      </button>
       </div>
      </div>

      {/* Visitor Table */}
      <div className="overflow-x-auto noprint shadow rounded border">
        <table className="table-auto border-collapse w-full text-sm">
          <thead className="bg-indigo-600 text-white sticky top-0">
            <tr>
              <th className="border px-3 py-2 text-center"><input type="checkbox" checked={selectedIds.length === visitors.length && visitors.length > 0} onChange={toggleSelectAll} /></th>
              <th className="border px-3 py-2">ID</th>
              <th className="border px-3 py-2">ชื่อ</th>
              <th className="border px-3 py-2">ติดต่อกับ</th>
              <th className="border px-3 py-2">เวลาเข้า</th>
              <th className="border px-3 py-2">เวลาออก</th>
              {/* <th className="border px-3 py-2">รูปภาพ</th> */}
              <th className="border px-3 py-2">พิมพ์</th>
              <th className="border px-3 py-2">เช็คเอาท์</th>
              <th className="border px-3 py-2">ลบ</th>
            </tr>
          </thead>
          <tbody>
            {visitors.map((v) => (
              <tr key={v.id} className={`hover:bg-gray-50 ${selectedIds.includes(v.id) ? 'bg-yellow-50' : ''}`}>
                <td className="border px-3 py-2 text-center"><input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggleSelect(v.id)} /></td>
                <td className="border px-3 py-2">{v.id}</td>
                <td className="border px-3 py-2">{v.full_name}</td>
                <td className="border px-3 py-2">{v.contact_person}</td>
                <td className="border px-3 py-2">{v.checkin_time ? new Date(v.checkin_time).toLocaleString() : ''}</td>
                <td className="border px-3 py-2">{v.checkout_time ? new Date(v.checkout_time).toLocaleString() : <span className="text-gray-400">—</span>}</td>
                {/* <td className="border px-3 py-2 text-center">
  {v.photo_url ? (
   <img
  src={v.photo_url}
  alt="visitor"
  className="max-h-12 max-w-16 object-contain rounded"
/>

  ) : (
    <span className="text-gray-400">—</span>
  )}
</td> */}
                <td className="border px-3 py-2 text-center">
                  <a className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300" href={`/print/${v.id}`} target="_blank">พิมพ์</a>
                </td>
                <td className="border px-3 py-2 text-center">
                  {!v.checkout_time ? (
                    <button className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600" onClick={() => checkOut(v.id)}>เช็คเอาท์</button>
                  ) : (
                    <span className="text-green-500 font-bold">✔ เสร็จสิ้น</span>
                  )}
                </td>
                <td className="border px-3 py-2 text-center">
                  <button className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" onClick={() => deleteVisitor([v.id])}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
