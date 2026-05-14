import { useEffect } from 'react';

export default function AdminLogin() {
  useEffect(() => {
    // Admin ย้ายไปอยู่ใน BMS Training แล้ว
    window.location.replace('../');
  }, []);
  return null;
}
