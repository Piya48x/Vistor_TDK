
# VMS — Visitor Management System (Supabase Free Tier)

ระบบบันทึกผู้มาติดต่อพื้นที่ (VMS) ใช้ **Supabase (Free tier)** เป็นฐานข้อมูล + ที่เก็บรูป + realtime.

## การตั้งค่า Privacy Notice / PDPA

ก่อนนำหน้าลงทะเบียนไปใช้งานจริง ให้รัน migration
`supabase/migrations/202610300001_add_visitor_consent_audit.sql` ใน Supabase SQL Editor
เพื่อเพิ่มหลักฐานเวลาให้ความยินยอม เวอร์ชันประกาศ และวิธีให้ความยินยอมในรายการผู้มาติดต่อ

สามารถกำหนดข้อความสำคัญตามนโยบายที่ฝ่ายกฎหมายหรือ DPO อนุมัติผ่าน environment variables:

```env
VITE_PRIVACY_NOTICE_VERSION=2026-10-30
VITE_PRIVACY_RETENTION_DAYS=90
VITE_PRIVACY_CONTACT=อีเมลหรือช่องทางติดต่อ DPO/ผู้รับผิดชอบข้อมูลส่วนบุคคล
```

ต้องตั้งกระบวนการลบข้อมูลในฐานข้อมูลและไฟล์ภาพบน Supabase Storage ให้สอดคล้องกับ
`VITE_PRIVACY_RETENTION_DAYS` ด้วย เพราะการแสดงระยะเวลาในหน้าเว็บเพียงอย่างเดียวไม่ได้ลบข้อมูลอัตโนมัติ
รองรับ: เก็บข้อมูลจากบัตร (ป้อนเอง/ต่อยอดเครื่องอ่านชิป), ถ่ายภาพ, พิมพ์สลิปแนวตั้ง 58mm พร้อม QR, Dashboard เรียลไทม์, เช็คเอาท์.

> หมายเหตุเรื่องเครื่องอ่านชิปบัตรประชาชน/ใบขับขี่: การอ่านจากชิปต้องใช้ไลบรารี/SDK ของผู้ผลิตเครื่องอ่าน ซึ่งต้องทำงานแบบ Native (Windows App) หรือผ่าน Web Serial/WebHID ที่ HTTPS + อุปกรณ์รองรับ.
> ในโปรเจกต์นี้เราทำช่อง `chip_serial` ให้กรอกหรือเชื่อมต่อภายหลังได้ (bridge app ส่งค่าเข้าเว็บก็ได้).

---

## 1) เตรียมเครื่องมือ
- ติดตั้ง **Node.js 18+** (LTS)
- สมัคร/เข้าสู่ระบบ **Supabase** (ฟรี tier)

## 2) สร้างโปรเจกต์บน Supabase
1. Create new project
2. คัดลอกค่า **Project URL** และ **Anon public API key** (ใช้ใน `.env.local`)

## 3) สร้างตารางฐานข้อมูล
ไปที่ **SQL Editor** แล้วรันสคริปต์นี้ (สร้างตาราง `visitors`):
```sql
create table if not exists public.visitors (
  id bigint generated always as identity primary key,
  created_at timestamp with time zone default now(),
  id_type text,
  id_number text,
  full_name text,
  gender text,
  company text,
  phone text,
  contact_person text,
  purpose text,
  vehicle_plate text,
  vehicle_type text,
  chip_serial text,
  note text,
  checkin_time timestamp with time zone,
  checkout_time timestamp with time zone,
  photo_url text,
  qr_data text
);
```

## 4) เปิด Realtime ให้ตารางนี้
- ไปที่ **Database → Replication → Realtime** แล้วเปิดที่ตาราง `visitors`

## 5) ตั้งค่า Storage สำหรับรูปถ่าย
- ไปที่ **Storage → Create bucket** สร้างชื่อ `photos` (ตั้งเป็น **Public**) เพื่อให้พิมพ์สลิปแสดงรูปได้

## 6) ตั้งค่านโยบาย RLS (สำหรับทดสอบ)
ในช่วงทดสอบ โปรเจกต์นี้สามารถใช้กฎแบบเปิดง่ายๆ (โปรดปรับปรุงในระบบจริง):
```sql
alter table public.visitors enable row level security;

create policy "Allow read/write for anon"
on public.visitors
for all
to anon
using (true)
with check (true);
```
> ระบบจริงควรเปิด Auth และจำกัดสิทธิ์ตามผู้ใช้

## 7) ตั้งค่าตัวแปรแวดล้อม
คัดลอก `.env.example` เป็น `.env.local` แล้วใส่ค่า:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
VITE_ORG_NAME=Just-iD Visitor
VITE_SITE_NAME=Global Securitech
```

## 8) รันโปรเจกต์
```bash
npm install
npm run dev
# เปิด http://localhost:3000
```

---

## วิธีใช้งาน
1. เข้าหน้าเว็บ → ให้เบราว์เซอร์อนุญาตใช้กล้อง
2. กรอกข้อมูลผู้มาติดต่อ (เปิด/ปิดช่องได้ในบล็อค "ตั้งค่าฟอร์ม")
3. กด **ถ่ายภาพ** → **บันทึก & ปริ้นสลิป**
   - ระบบจะ: บันทึกฐานข้อมูล, อัปโหลดรูปเข้า Supabase Storage, สร้าง QR, เปิดหน้า `/print/:id` เพื่อสั่งพิมพ์
4. ที่ Dashboard รายชื่อด้านล่างจะเห็นรายการใหม่แบบ **Realtime**
5. เมื่อออกพื้นที่ → กด **เช็คเอาท์** (จะบันทึกเวลาออก)

## การพิมพ์สลิป 58mm
- หน้า `/print/:id` กำหนด CSS ให้พิมพ์ **58mm** (ดู `@page { size: 58mm auto }`)
- ตั้งค่าพิมพ์ในเบราว์เซอร์: Margins = None/Minimal, Scale = 100%
- ต้องการ 80mm: แก้ใน `src/styles.css` ที่ `--w:` เป็น ~560-576px และปรับ `@page` เป็น `80mm`

## ปรับแต่งฟิลด์/ฟอร์ม
- เปิด/ปิดช่องกรอก: ปรับที่ `src/config.js` (ค่าเริ่มต้นใน `DEFAULT_FIELDS`)
- เพิ่มฟิลด์: เพิ่มในตาราง Supabase + เพิ่มในฟอร์ม และในหน้าพิมพ์ถ้าต้องการ

## การเชื่อมเครื่องอ่านชิปบัตร (ต่อยอด)
แนวทางที่นิยม (เลือก 1):
1) **Native Bridge (แนะนำ)** สร้างแอป Windows ที่ใช้ SDK เครื่องอ่าน แล้ว POST ข้อมูลมายัง URL ของเว็บ (หรือเขียนลงตาราง Supabase โดยตรงด้วย service role key ฝั่งแอป)  
2) **Web Serial / WebHID** (ถ้าอุปกรณ์รองรับ) อ่านข้อมูลจากเบราว์เซอร์ผ่าน HTTPS แล้วเติมค่า `chip_serial` อัตโนมัติ

> โค้ดตัวอย่างนี้เว้นพื้นที่ไว้ให้กรอก `chip_serial` เพื่อเป็นจุดเชื่อมภายหลัง

## โครงสร้างไฟล์สำคัญ
- `src/App.jsx` — ฟอร์มลงทะเบียน + ถ่ายภาพ + รายการแบบ realtime
- `src/slip/PrintSlip.jsx` — หน้าใบเสร็จสำหรับพิมพ์
- `src/supabaseClient.js` — ตั้งค่า Supabase client
- `src/config.js` — เปิด/ปิดช่องของฟอร์ม
- `src/styles.css` — สไตล์รวม + ขนาดสลิป

## เคล็ดลับแก้ปัญหา
- กล้องไม่ติด: ตรวจสอบสิทธิ์กล้องในเบราว์เซอร์/ระบบปฏิบัติการ
- รูปไม่ขึ้นในหน้า `/print/:id`: ตรวจว่า Storage bucket `photos` เป็น Public และมี public URL
- Realtime ไม่เด้ง: เช็คว่าเปิด Realtime ที่ตาราง `visitors` แล้ว

---

พร้อมใช้งาน! ถ้าต้องการแปลงเป็น 15×9 ซม. (บัตรแขวน) เพิ่มหน้าใหม่และใช้ CSS `@page { size: 15cm 9cm }` คล้ายตัวอย่าง แล้วเลือกฟิลด์ที่จะแสดงตามต้องการ.


------------
โอเคครับ ✨
เรื่อง RLS (Row Level Security) ของ Supabase (Postgres) มันคือการกำหนดสิทธิ์ว่า ใครมีสิทธิ์อ่าน/เขียนแถวไหนของตาราง

🔹 ขั้นตอนเปิด RLS และใส่นโยบายเบื้องต้น (Test Mode)

(ไว้ใช้ทดสอบก่อนเท่านั้น — ระบบจริงต้องล็อกสิทธิ์ให้รัดกุมมากขึ้น)

1. ไปที่ Supabase Project

เข้าสู่ Supabase Dashboard

เลือกโปรเจคของคุณ

2. เปิด Table Editor

ไปที่ Table editor → เลือกตารางที่คุณสร้าง เช่น visitors

3. เปิด RLS

ที่ตาราง → แท็บ Security

กด Enable RLS

4. ใส่ Policy (นโยบาย)

สำหรับทดสอบ (ทุกคนเข้าถึงได้หมด) ใช้ SQL แบบนี้:

-- อนุญาตให้ทุกคน SELECT ได้
create policy "Allow anyone to read visitors"
on visitors
for select
using (true);

-- อนุญาตให้ทุกคน INSERT ได้
create policy "Allow anyone to insert visitors"
on visitors
for insert
with check (true);

-- อนุญาตให้ทุกคน UPDATE ได้
create policy "Allow anyone to update visitors"
on visitors
for update
using (true)
with check (true);

-- อนุญาตให้ทุกคน DELETE ได้
create policy "Allow anyone to delete visitors"
on visitors
for delete
using (true);


📌 วิธีใส่

ไปที่ SQL Editor → วางโค้ดนี้ → Run

5. ทดลองเชื่อมต่อ

หลังจากเปิด RLS และใส่นโยบายแล้ว

คุณสามารถลอง INSERT และ SELECT จาก frontend ได้เลย

ถ้าไม่มี Policy → RLS จะบล็อกหมด

⚠️ หมายเหตุ

แบบนี้เป็น โหมดทดสอบ (ทุกคนเข้าถึงได้)

ถ้าใช้งานจริง → ต้องทำ Authentication (เช่น login ด้วย email, magic link, หรือ JWT)

และปรับ Policy ให้ตรงกับ auth.uid() เช่น

create policy "Users can see only their own rows"
on visitors
for select
using ( auth.uid() = user_id );


คุณอยากให้ผมทำ ไฟล์ SQL setup อัตโนมัติ สำหรับ visitors table (สร้างตาราง + เปิด RLS + policy test mode) ไว้แนบไปกับ zip ที่ผมทำให้ก่อนหน้านี้ไหมครับ?
