
export const DEFAULT_FIELDS = {
  id_type: true,            // ประเภทบัตร (บัตรประชาชน/ใบขับขี่)
  id_number: true,          // หมายเลขบัตร
  full_name: true,
  gender: false,
  company: true,
  phone: true,
  contact_person: true,
  purpose: true,
  vehicle_plate: true,
  vehicle_type: false,
  chip_serial: false,       // สำหรับผูกกับเครื่องอ่านชิป (ใส่มือถ้ายังไม่มีเครื่อง)
  note: false
}
