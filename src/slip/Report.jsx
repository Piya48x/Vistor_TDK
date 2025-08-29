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
  const [selectedIds, setSelectedIds] = useState([]) // เก็บ row ที่เลือก
  const printedIdsRef = useRef(new Set()) // เก็บ ID ที่เคยปริ้นแล้ว
  const navigate = useNavigate()

  // Load visitors
  const loadVisitors = async (dateFilter = '') => {
    let query = supabase.from('visitors').select('*').order('id', { ascending: false }).limit(50)
    if (dateFilter) {
      const start = new Date(dateFilter)
      start.setHours(0, 0, 0, 0)
      const end = new Date(dateFilter)
      end.setHours(23, 59, 59, 999)
      query = query.gte('checkin_time', start.toISOString()).lte('checkin_time', end.toISOString())
    }
    const { data, error } = await query
    if (!error) setVisitors(data || [])
  }

  useEffect(() => { loadVisitors() }, [])

  // Realtime update
 useEffect(() => {
  const channel = supabase
    .channel("visitors-changes")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "visitors" },
      (payload) => {
        loadVisitors(searchDate)  // ปรับถ้าต้องการใช้ date ล่าสุด อาจเก็บใน ref แทน state

      if (payload.eventType === "INSERT") {
          const newVisitor = payload.new
          if (newVisitor?.id && !printedIdsRef.current.has(newVisitor.id)) {
            printedIdsRef.current.add(newVisitor.id)
            window.open(`/print/${newVisitor.id}`, "_blank")
          }
        }
      }
    )
    .subscribe()

  return () => {
    supabase.removeChannel(channel)
  }
}, []) // <-- ลบ searchDate ออกจาก dependency


  // toggle select
  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  // select all
  const toggleSelectAll = () => {
    if (selectedIds.length === visitors.length) {
      setSelectedIds([])
    } else {
      setSelectedIds(visitors.map(v => v.id))
    }
  }

  // checkOut
  const checkOut = async (id) => {
    await supabase.from('visitors').update({ checkout_time: new Date().toISOString() }).eq('id', id)
    loadVisitors(searchDate)
  }

  // delete
  const deleteVisitor = async (ids) => {
    if (!ids.length) return alert("กรุณาเลือกรายการก่อน")
    if (!confirm('ต้องการลบรายการที่เลือกใช่หรือไม่?')) return
    await supabase.from('visitors').delete().in('id', ids)
    setSelectedIds([])
    loadVisitors(searchDate)
  }

  // export excel
  const exportToExcel = async (ids) => {
    const rows = ids.length ? visitors.filter(v => ids.includes(v.id)) : visitors
    if (!rows.length) return alert("กรุณาเลือกรายการก่อน")

    const wb = new ExcelJS.Workbook()
    const ws = wb.addWorksheet('Visitors')

    ws.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'ชื่อ', key: 'full_name', width: 25 },
      { header: 'ผู้ติดต่อ', key: 'contact_person', width: 25 },
      { header: 'เวลาเข้า', key: 'checkin_time', width: 20 },
      { header: 'เวลาออก', key: 'checkout_time', width: 20 },
      { header: 'รูปภาพ', key: 'photo', width: 15 }
    ]

    for (const v of rows) {
      const row = ws.addRow({
        id: String(v.id).padStart(10, '0'),
        full_name: v.full_name || '',
        contact_person: v.contact_person || '',
        checkin_time: v.checkin_time ? new Date(v.checkin_time).toLocaleString() : '',
        checkout_time: v.checkout_time ? new Date(v.checkout_time).toLocaleString() : '',
        photo: ''
      })

      if (v.photo_url) {
        try {
          const imgBlob = await (await fetch(v.photo_url)).arrayBuffer()
          const imgId = wb.addImage({ buffer: imgBlob, extension: 'jpeg' })
          ws.addImage(imgId, {
            tl: { col: 5, row: row.number },
            ext: { width: 80, height: 60 }
          })
        } catch (err) {
          console.warn('ไม่สามารถโหลดรูป', v.photo_url, err)
        }
      }
    }

    ws.columns.forEach((col) => {
      let maxLength = 10
      col.eachCell({ includeEmpty: true }, (cell) => {
        const cellValue = cell.value ? cell.value.toString() : ''
        maxLength = Math.max(maxLength, cellValue.length)
      })
      col.width = maxLength + 2
    })

    ws.eachRow((row) => {
      let maxLines = 1
      row.eachCell((cell) => {
        if (typeof cell.value === 'string') {
          const lines = cell.value.split(/\r?\n/).length
          maxLines = Math.max(maxLines, lines)
        }
      })
      row.height = maxLines * 15
    })

    const buf = await wb.xlsx.writeBuffer()
    saveAs(
      new Blob([buf], { type: 'application/octet-stream' }),
      `visitors_${new Date().toISOString().slice(0, 10)}.xlsx`
    )
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap gap-4 noprint">
        <div className="px-4 py-2 bg-blue-100 text-blue-800 rounded shadow">
          องค์กร: <b>{ORG}</b>
        </div>
        <div className="px-4 py-2 bg-green-100 text-green-800 rounded shadow">
          สถานที่: <b>{SITE}</b>
        </div>
      </div>

      {/* Search / Action */}
      <div className="flex flex-wrap gap-3 items-center" style={{ marginBottom: 20 }}>
        <input
          type="date"
          value={searchDate}
          onChange={e => setSearchDate(e.target.value)}
          className="border rounded px-3 py-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-400"
        />
        <div>
          <button onClick={() => loadVisitors(searchDate)} className="custom-btn bg-blue-500 text-white px-4 py-2 rounded shadow">ค้นหา</button>
          <button onClick={() => exportToExcel(selectedIds)} className="custom-btn bg-green-500 text-white px-4 py-2 rounded shadow" style={{ marginLeft: 7 }}>Export</button>
          <button onClick={() => deleteVisitor(selectedIds)} className="custom-btn bg-red-500 text-white px-4 py-2 rounded shadow" style={{ marginLeft: 7 }}>ลบ (เลือก)</button>
          <button onClick={() => navigate('/')} className="custom-btn ml-auto bg-gray-500 text-white px-6 py-3 rounded-full shadow-lg" style={{ marginLeft: 7 }}>⬅ กลับสู่หน้าหลัก</button>
        </div>
      </div>

      {/* Visitor Table */}
      <div className="overflow-x-auto noprint shadow rounded border">
        <table className="table-auto border-collapse w-full text-sm">
          <thead className="bg-gray-100 text-gray-700">
            <tr>
              <th className="border px-3 py-2 text-center">
                <input type="checkbox" checked={selectedIds.length === visitors.length && visitors.length > 0} onChange={toggleSelectAll} />
              </th>
              <th className="border px-3 py-2">ID</th>
              <th className="border px-3 py-2">ชื่อ</th>
              <th className="border px-3 py-2">ติดต่อกับ</th>
              <th className="border px-3 py-2">เวลาเข้า</th>
              <th className="border px-3 py-2">เวลาออก</th>
              <th className="border px-3 py-2">พิมพ์</th>
              <th className="border px-3 py-2">เช็คเอาท์</th>
              <th className="border px-3 py-2">ลบ</th>
            </tr>
          </thead>

          <tbody>
            {visitors.map(v => (
              <tr key={v.id} className={`hover:bg-gray-50 ${selectedIds.includes(v.id) ? 'bg-yellow-50' : ''}`}>
                <td className="border px-3 py-2 text-center">
                  <input type="checkbox" checked={selectedIds.includes(v.id)} onChange={() => toggleSelect(v.id)} />
                </td>
                <td className="border px-3 py-2">{v.id}</td>
                <td className="border px-3 py-2">{v.full_name}</td>
                <td className="border px-3 py-2">{v.contact_person}</td>
                <td className="border px-3 py-2">{v.checkin_time ? new Date(v.checkin_time).toLocaleString() : ''}</td>
                <td className="border px-3 py-2">{v.checkout_time ? new Date(v.checkout_time).toLocaleString() : <span className="text-gray-400">—</span>}</td>
                <td className="border px-3 py-2 text-center">
                  <a className="bg-gray-200 px-3 py-1 rounded hover:bg-gray-300" href={`/print/${v.id}`} target="_blank">พิมพ์</a>
                </td>
                <td className="border px-3 py-2 text-center">
                  {!v.checkout_time ? (
                    <button className="custom-btn1 bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600" onClick={() => checkOut(v.id)}>เช็คเอาท์</button>
                  ) : (
                    <span className="text-green-500 font-bold">เสร็จสิ้น</span>
                  )}
                </td>
                <td className="border px-3 py-2 text-center">
                  <button className="custom-btn2 bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600" onClick={() => deleteVisitor([v.id])}>ลบ</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
