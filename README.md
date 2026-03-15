# 🏃‍♂️ PACELY — Your Intelligence-Driven Running Partner

[![React 19](https://img.shields.io/badge/Frontend-React%2019-61dafb?style=for-the-badge&logo=react)](https://react.dev/)
[![NestJS 11](https://img.shields.io/badge/Backend-NestJS%2011-e0234e?style=for-the-badge&logo=nestjs)](https://nestjs.com/)
[![Prisma](https://img.shields.io/badge/ORM-Prisma-2d3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL-336791?style=for-the-badge&logo=postgresql)](https://www.postgresql.org/)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%203%20Flash-blue?style=for-the-badge&logo=google-gemini)](https://deepmind.google/technologies/gemini/)

**PACELY** không chỉ là một ứng dụng theo dõi chạy bộ thông thường. Nó là một **AI Coaching Ecosystem** toàn diện, kết nối trực tiếp với Strava để biến những con số khô khan thành những lời khuyên chiến thuật, giúp runner chạy thông minh hơn, bền bỉ hơn.

---

## 🚀 Engineering Excellence (Tại sao dự án này đặc biệt?)

Thay vì chỉ gọi API đơn thuần, PACELY được xây dựng với tư duy giải quyết các bài toán thực tế của một hệ thống Production:

### 🧠 1. Hierarchical Memory Architecture
Chúng tôi triển khai cấu trúc bộ nhớ 3 tầng cho AI Coach, đảm bảo chatbot luôn "nhớ" đúng ngữ cảnh mà không làm bùng nổ chi phí Token:
-   **Short-term (In-context):** 10 tin nhắn gần nhất để giữ mạch hội thoại tức thời.
-   **Mid-term (Rolling Summary):** Tự động tóm tắt nội dung hội thoại sau mỗi 10 lượt, nhúng trực tiếp vào System Prompt để AI luôn nhớ mục tiêu dài hạn của người dùng.
-   **Cross-session (On-demand Tools):** Sử dụng **Function Calling** để AI chủ động truy xuất Profile, Lịch sử tập luyện và Nhật ký sức khỏe khi cần.

### ⚖️ 2. Multi-Key Load Balancer (Round Robin)
Để vượt qua giới hạn Rate Limit của các gói AI miễn phí và đảm bảo độ tin cậy 24/7:
-   Hệ thống quản lý hàng đợi API Key thông minh.
-   Tự động phát hiện Key bị lỗi/hết hạn và xoay vòng (Failover) sang Key khác ngay lập tức.
-   Theo dõi chi tiết Token Usage theo từng người dùng.

### 🌊 3. Chunked Response Streaming
Trải nghiệm Chat cao cấp với phản hồi dạng Stream (giống ChatGPT/Gemini). Văn bản hiển thị theo từng khối (chunk) mượt mà với hiệu ứng **Fade-in Animation**, mang lại cảm giác sống động và giảm bớt thời gian chờ đợi tâm lý cho người dùng.

### 📱 4. Cross-Platform Responsive UI
Giao diện được thiết kế theo ngôn ngữ **PACELY Design System**:
-   **Desktop:** Sidebar hiện đại, tối ưu không gian làm việc.
-   **Mobile:** Bottom Navigation chuẩn App di động (như Strava), thao tác một tay dễ dàng.
-   **Safe Areas:** Xử lý hoàn hảo khoảng trống StatusBar trên Android (Notch/Punch-hole).
-   **Theme System:** Hỗ trợ Light/Dark/System theme với hiệu ứng chuyển màu mượt mà.

---

## 🛠 Tech Stack

| Thành phần | Công nghệ |
| --- | --- |
| **Frontend** | React 19, TypeScript, Tailwind CSS, TanStack Query, Recharts, Zustand |
| **Backend** | NestJS 11, Node.js, RxJS (SSE for AI Status) |
| **Database** | PostgreSQL + Prisma ORM |
| **AI Engine** | Google Gemini 1.5 Pro/Flash |
| **Integrations** | Strava OAuth2 API, Capacitor (for Android support) |
| **Security** | AES-256-GCM Token Encryption, JWT Authentication |

---

## 📖 Key Features

-   **Dashboard Intel:** Trang chủ là báo cáo hiệu suất tự động tạo bởi AI.
-   **Automatic Sync:** Đồng bộ buổi tập từ Strava chỉ với một chạm.
-   **Daily Journal:** Lưu lại cảm nhận (ăn uống, chấn thương, tâm trạng) để AI có thêm dữ liệu phân tích sâu.
-   **AI Partner:** Chat trực tiếp với cộng sự AI để lập kế hoạch tập luyện hoặc hỏi về thông số buổi chạy.
-   **Dark Mode:** Giao diện tối chuyên nghiệp, tiết kiệm pin và dịu mắt khi sử dụng ban đêm.

---

## 🏗 Installation

### Prerequisites
- Node.js 20+
- PostgreSQL
- Strava API Client ID & Secret
- Gemini API Key(s)

### Backend Setup
```bash
cd backend
npm install
npx prisma db push
npm run start:dev
```

### Frontend Setup
```bash
cd frontend
npm install
npm start
```

---

## 🤝 Contact
**Dang M. Phong** - [dangminhphong912@gmail.com]

*Dự án được xây dựng với tâm huyết dành cho cộng đồng chạy bộ và những người yêu công nghệ.*
