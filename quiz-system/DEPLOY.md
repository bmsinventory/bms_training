# คู่มือ Deploy – BMS Quiz & Certificate System

## สารบัญ
1. [ข้อกำหนดเบื้องต้น](#1-ข้อกำหนดเบื้องต้น)
2. [ตั้งค่า Supabase](#2-ตั้งค่า-supabase)
3. [ตั้งค่า Environment Variables](#3-ตั้งค่า-environment-variables)
4. [ติดตั้งและรัน Local](#4-ติดตั้งและรัน-local)
5. [Deploy Edge Functions](#5-deploy-edge-functions)
6. [Deploy ขึ้น Vercel](#6-deploy-ขึ้น-vercel)
7. [ตั้งค่า Admin User](#7-ตั้งค่า-admin-user)
8. [ทดสอบระบบ](#8-ทดสอบระบบ)
9. [ตั้งค่า Email (Resend)](#9-ตั้งค่า-email-resend)
10. [โครงสร้างโปรเจค](#10-โครงสร้างโปรเจค)

---

## 1. ข้อกำหนดเบื้องต้น

- **Node.js** 18+ ([nodejs.org](https://nodejs.org))
- **Supabase CLI** – `npm install -g supabase`
- **Vercel CLI** – `npm install -g vercel` (สำหรับ deploy)
- บัญชี [Supabase](https://supabase.com) (ฟรี)
- บัญชี [Vercel](https://vercel.com) (ฟรี)
- บัญชี [Resend](https://resend.com) สำหรับส่งอีเมล (ฟรี 100 อีเมล/วัน)

---

## 2. ตั้งค่า Supabase

### 2.1 สร้าง Project ใหม่
1. ไปที่ [supabase.com/dashboard](https://supabase.com/dashboard)
2. คลิก **"New Project"**
3. ตั้งชื่อ Project (เช่น `bms-quiz`)
4. ตั้ง Database Password (จดไว้)
5. เลือก Region ใกล้ไทย: **Southeast Asia (Singapore)**
6. รอประมาณ 2 นาที

### 2.2 รัน SQL Schema
1. ใน Supabase Dashboard คลิก **SQL Editor**
2. เปิดไฟล์ `supabase/schema.sql` จากโปรเจคนี้
3. วาง SQL ทั้งหมดลงใน Editor
4. คลิก **"Run"** (หรือ Ctrl+Enter)
5. ตรวจสอบว่าไม่มี Error (ควรเห็น "Success" สีเขียว)

### 2.3 ปิด Email Confirmation (สำหรับ Admin)
1. ไปที่ **Authentication → Providers → Email**
2. ปิด **"Confirm email"** (เพื่อให้ Admin login ได้ทันที)
3. หรือใช้ Supabase Dashboard เพิ่ม Admin user โดยตรง

### 2.4 เก็บ Project Keys
ไปที่ **Settings → API** และจดบันทึก:
- **Project URL**: `https://xxxxxxxx.supabase.co`
- **anon public key**: `eyJhbGciOiJ...`

---

## 3. ตั้งค่า Environment Variables

สร้างไฟล์ `.env` ใน folder `quiz-system/`:

```bash
# สร้างจาก template
cp .env.example .env
```

แล้วแก้ไข `.env`:

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
VITE_APP_URL=http://localhost:5173
```

> ⚠️ **ห้าม commit ไฟล์ `.env`** ลง Git (ควรอยู่ใน `.gitignore` แล้ว)

---

## 4. ติดตั้งและรัน Local

```bash
# เข้า folder quiz-system
cd quiz-system

# ติดตั้ง dependencies
npm install

# รัน development server
npm run dev
```

เปิดเบราเซอร์ไปที่ `http://localhost:5173`

---

## 5. Deploy Edge Functions

### 5.1 Login Supabase CLI
```bash
supabase login
```

### 5.2 Link กับ Project
```bash
supabase link --project-ref your-project-id
```
(หา `project-ref` จาก URL: `https://supabase.com/dashboard/project/your-project-id`)

### 5.3 ตั้งค่า Secrets สำหรับ Edge Functions

Edge Functions ต้องการ environment variables เหล่านี้:

```bash
# Service Role Key (จาก Settings → API)
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJ...

# Resend API Key
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
```

### 5.4 Deploy Functions
```bash
# Deploy ทั้งหมด
supabase functions deploy

# หรือ deploy ทีละ function
supabase functions deploy send-email
supabase functions deploy grade-quiz
```

### 5.5 ตรวจสอบ
```bash
supabase functions list
```

---

## 6. Deploy ขึ้น Vercel

### 6.1 Build ทดสอบก่อน
```bash
npm run build
```
ตรวจสอบว่าไม่มี Error

### 6.2 Deploy ผ่าน Vercel CLI
```bash
# ติดตั้ง Vercel CLI (ถ้ายังไม่มี)
npm install -g vercel

# Deploy
vercel

# ตอบคำถาม:
# - Set up and deploy? Yes
# - Which scope? (เลือก account)
# - Link to existing project? No
# - Project name: bms-quiz-system
# - Directory: ./dist (หรือกด Enter)
```

### 6.3 ตั้งค่า Environment Variables ใน Vercel
1. ไปที่ Vercel Dashboard → Project → **Settings → Environment Variables**
2. เพิ่ม Variables ต่อไปนี้ (ทุก Environment):

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` |
| `VITE_APP_URL` | `https://your-domain.vercel.app` |

### 6.4 Redeploy หลังตั้ง Env Vars
```bash
vercel --prod
```

### 6.5 อัปเดต verify_base_url ใน Settings
หลัง deploy สำเร็จ ให้เข้า Admin → Settings และอัปเดต:
- **URL ตรวจสอบใบรับรอง**: `https://your-domain.vercel.app/verify`

---

## 7. ตั้งค่า Admin User

### วิธีที่ 1: ผ่าน Supabase Dashboard (แนะนำ)
1. ไปที่ **Authentication → Users**
2. คลิก **"Invite user"** หรือ **"Add user"**
3. ใส่ Email และ Password ของ Admin
4. คลิก **Save**

### วิธีที่ 2: ผ่าน Admin Settings UI
1. Login ด้วย Admin คนแรก
2. ไปที่ **Admin → Settings**
3. ส่วน "เพิ่ม Admin ใหม่" กรอกอีเมลและรหัสผ่าน
4. คลิก **เพิ่ม**

### วิธีที่ 3: SQL (สำหรับ First Admin)
ใน Supabase SQL Editor:
```sql
-- สร้าง Admin user ผ่าน Auth API
select auth.users;
-- ใช้ Supabase Dashboard → Authentication → Users → Add user
```

---

## 8. ทดสอบระบบ

### 8.1 ทดสอบ User Flow
- [ ] เปิด `http://localhost:5173`
- [ ] เห็นรายการหลักสูตร
- [ ] คลิกหลักสูตร → กรอกข้อมูลลงทะเบียน
- [ ] ทำแบบทดสอบครบ → ส่งคำตอบ
- [ ] เห็นผลสอบ (PASS/FAIL)
- [ ] ถ้าผ่าน → เห็นปุ่มดูใบรับรอง
- [ ] ดาวน์โหลด PDF → ตรวจสอบหน้าตาใบรับรอง
- [ ] ไปหน้า `/verify/CERT-ID` → เห็นข้อมูลใบรับรอง

### 8.2 ทดสอบ Admin
- [ ] ไปที่ `/admin/login`
- [ ] Login ด้วย Admin credentials
- [ ] ดู Dashboard → เห็น Stats
- [ ] ไปหน้า Courses → เพิ่มหลักสูตรใหม่
- [ ] เพิ่มข้อสอบและตัวเลือก
- [ ] ดูผลสอบ → กรอง → Export Excel

### 8.3 ทดสอบ Email
- [ ] ตั้งค่า Resend API Key ใน Admin Settings
- [ ] สอบผ่านด้วยอีเมลจริง
- [ ] คลิก "ส่งใบรับรอง" → ตรวจสอบ Inbox

---

## 9. ตั้งค่า Email (Resend)

### 9.1 สมัคร Resend
1. ไปที่ [resend.com](https://resend.com) → Sign Up
2. ยืนยันอีเมล

### 9.2 สร้าง API Key
1. ใน Resend Dashboard → **API Keys**
2. คลิก **"Create API Key"**
3. ตั้งชื่อ (เช่น `bms-quiz`)
4. Permission: **Full access** หรือ **Sending access**
5. คัดลอก API Key (แสดงครั้งเดียว!)

### 9.3 ยืนยัน Domain (แนะนำ)
1. ใน Resend Dashboard → **Domains**
2. เพิ่ม domain ของคุณ
3. ตั้งค่า DNS records ตามที่ Resend บอก
4. รอ Verify (5-30 นาที)

**หรือ** ใช้ `onboarding@resend.dev` สำหรับทดสอบ (ส่งได้ 1 email/วัน)

### 9.4 ตั้งค่าใน Admin
1. Admin → Settings
2. กรอก **Resend API Key**
3. กรอก **From Email** (ต้องใช้ domain ที่ verify แล้ว)
4. กรอก **From Name**
5. คลิกบันทึก

### 9.5 ตั้งค่า Edge Function Secret
```bash
supabase secrets set RESEND_API_KEY=re_xxxxxxxx
supabase functions deploy send-email
```

---

## 10. โครงสร้างโปรเจค

```
quiz-system/
├── index.html                    # HTML template
├── package.json                  # Dependencies
├── vite.config.js                # Vite build config
├── tailwind.config.js            # Tailwind CSS config
├── postcss.config.js             # PostCSS config
├── .env                          # Environment variables (ไม่ commit)
├── .env.example                  # Template env vars
│
├── src/
│   ├── main.jsx                  # App entry point
│   ├── App.jsx                   # Router configuration
│   ├── index.css                 # Global styles + Tailwind
│   │
│   ├── lib/
│   │   ├── supabase.js           # Supabase client + DB functions
│   │   ├── utils.js              # Helper utilities
│   │   └── certificate.js        # PDF generation (jsPDF + html2canvas)
│   │
│   ├── contexts/
│   │   ├── ToastContext.jsx      # Toast notification system
│   │   └── AuthContext.jsx       # Admin authentication
│   │
│   ├── components/
│   │   ├── Navbar.jsx            # Navigation bar
│   │   └── Loading.jsx           # Loading spinner
│   │
│   └── pages/
│       ├── Home.jsx              # หน้าหลัก – รายการหลักสูตร
│       ├── Register.jsx          # ลงทะเบียนก่อนสอบ
│       ├── Quiz.jsx              # หน้าทำแบบทดสอบ
│       ├── Result.jsx            # ผลสอบ + เฉลย
│       ├── Certificate.jsx       # ดู/ดาวน์โหลดใบรับรอง
│       ├── Verify.jsx            # ตรวจสอบใบรับรอง
│       ├── ResendCert.jsx        # ขอส่งใบรับรองใหม่
│       ├── History.jsx           # ค้นหาประวัติสอบ
│       │
│       └── admin/
│           ├── Login.jsx         # Admin login
│           ├── AdminLayout.jsx   # Admin layout + sidebar
│           ├── Dashboard.jsx     # Dashboard – สถิติ
│           ├── Courses.jsx       # จัดการหลักสูตร
│           ├── Questions.jsx     # จัดการข้อสอบ
│           ├── Results.jsx       # ดูผลสอบ + Export
│           └── Settings.jsx      # ตั้งค่าระบบ
│
└── supabase/
    ├── schema.sql                # Database schema + RLS + sample data
    └── functions/
        ├── send-email/
        │   └── index.ts          # Edge Function: ส่งอีเมลใบรับรอง (Resend)
        └── grade-quiz/
            └── index.ts          # Edge Function: ตรวจคะแนน (server-side)
```

---

## Database Schema Overview

| ตาราง | คำอธิบาย |
|-------|----------|
| `courses` | หลักสูตรทดสอบ (ชื่อ, เกณฑ์ผ่าน, จำนวนข้อ) |
| `questions` | ข้อสอบในแต่ละหลักสูตร |
| `choices` | ตัวเลือกคำตอบ (1 ข้อมี 2-5 ตัวเลือก) |
| `quiz_attempts` | การสอบแต่ละครั้ง (ชื่อ, อีเมล, คะแนน, ผล) |
| `quiz_answers` | คำตอบแต่ละข้อของแต่ละครั้งสอบ |
| `certificates` | ใบรับรอง (PASS เท่านั้น, มี Cert ID, PDF URL) |
| `settings` | ตั้งค่าระบบ (key-value) |
| `email_logs` | บันทึกการส่งอีเมล |
| `audit_logs` | บันทึก Admin actions |

---

## User Flow

```
หน้าหลัก (/)
    └── เลือกหลักสูตร
            └── ลงทะเบียน (/register/:courseId)
                    └── ทำแบบทดสอบ (/quiz/:attemptId)
                            └── ผลสอบ (/result/:attemptId)
                                    ├── PASS → ดูใบรับรอง (/certificate/:attemptId)
                                    │              └── ดาวน์โหลด PDF
                                    │              └── ส่งอีเมล
                                    │              └── ตรวจสอบ QR (/verify/:certId)
                                    └── FAIL → สอบใหม่

หน้าค้นหา (/history) – ค้นหาจากชื่อ/อีเมล
หน้าส่งใหม่ (/resend) – แก้ไขอีเมลและส่งใบรับรองซ้ำ
หน้าตรวจสอบ (/verify) – กรอก Cert ID หรือสแกน QR

Admin (/admin)
    ├── Dashboard – สถิติภาพรวม
    ├── หลักสูตร (/admin/courses) – CRUD
    ├── ข้อสอบ (/admin/questions/:courseId) – CRUD
    ├── ผลสอบ (/admin/results) – ค้นหา กรอง Export Excel
    └── ตั้งค่า (/admin/settings) – Email, ชื่อระบบ, เพิ่ม Admin
```

---

## คำถามที่พบบ่อย

**Q: ผู้สอบสามารถโกงโดยดูซอร์สโค้ดเพื่อหาคำตอบได้หรือไม่?**
ไม่ได้ เพราะ `is_correct` ถูก RLS ซ่อน และคำตอบที่ถูกต้องไม่ถูกส่งไปยัง frontend ก่อนส่งคำตอบ อย่างไรก็ตาม สำหรับระบบที่ต้องการความปลอดภัยสูง ให้ใช้ Edge Function `grade-quiz` แทนการตรวจคะแนนบน frontend

**Q: จะเพิ่มรูปภาพในข้อสอบได้อย่างไร?**
แก้ไข schema `questions` เพิ่ม column `image_url text` แล้วอัปโหลดรูปไปยัง Supabase Storage

**Q: รองรับหลายภาษาได้ไหม?**
ระบบนี้ออกแบบสำหรับภาษาไทย แต่สามารถเปลี่ยน label ต่างๆ ใน code ได้ตามต้องการ

**Q: จะ Backup ฐานข้อมูลได้อย่างไร?**
ใช้ Supabase Dashboard → Settings → Database → Backups (เปิดใช้ได้ใน Pro plan) หรือ export ผ่าน `pg_dump`

---

## Support

หากพบปัญหาการติดตั้ง ตรวจสอบ:
1. Supabase Logs: Dashboard → Edge Functions → Logs
2. Browser Console (F12)
3. Vercel Function Logs: Vercel Dashboard → Functions
