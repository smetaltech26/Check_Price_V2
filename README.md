# Check Price V2

เว็บแอปสำหรับตรวจสอบราคาขายและราคาวัตถุดิบจาก Google Sheets รองรับ QR Code และการค้นหาด้วย ITEM / Name Part

## Google Sheet

- Spreadsheet ID: `1Aq1ZvwqKVKDQGIynEILrFIEe6A-sUqFk9Ztxm6SrNPo`
- Sheet: `price`
- คอลัมน์ที่ต้องมี: `ITEM`, `Name Part`, `price`, `RM Price`
- ตั้งค่าสิทธิ์ชีตเป็น **ทุกคนที่มีลิงก์ดูได้** เพื่อให้ GitHub Pages อ่านข้อมูลได้

แก้ค่าการเชื่อมต่อหรือชื่อคอลัมน์ได้ที่ `config.js`

## เปิดใช้งานบน GitHub Pages

1. สร้าง Repository ชื่อ `Check_Price_V2` ในบัญชี `smetaltech26`
2. Push ไฟล์ทั้งหมดขึ้น branch `main`
3. เปิด **Settings > Pages**
4. Source เลือก **Deploy from a branch**, branch `main`, folder `/ (root)`
5. เว็บจะอยู่ที่ `https://smetaltech26.github.io/Check_Price_V2/`

กล้องสแกน QR ต้องใช้งานผ่าน HTTPS หรือ localhost เท่านั้น
