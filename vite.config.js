import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import fs from 'fs' // เพิ่มตรงนี้

export default defineConfig({
  plugins: [react()],
  server: {
    host: true, // ให้ dev server ฟังทุก interface
    port: 3000, // หรือพอร์ตที่ใช้
    https: {
      key: fs.readFileSync('./192.168.0.181+1-key.pem'),
      cert: fs.readFileSync('./192.168.0.181+1.pem'),
    },
    allowedHosts: [
      '00c286eddb3c.ngrok-free.app', // เพิ่ม URL ของ ngrok
      'localhost',
      '127.0.0.1'
    ]
  }
})
