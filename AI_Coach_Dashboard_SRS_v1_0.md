**AI COACH DASHBOARD**

*Running Club Intelligence Platform*

**SOFTWARE REQUIREMENTS SPECIFICATION --- v1.1**

**Phiên bản:** 1.1 --- Final (sau phê duyệt khách hàng)

**Ngày lập:** 14 tháng 3, 2026

**Cập nhật lần cuối:** 14 tháng 3, 2026

**Khách hàng:** Running Club (Bán chuyên)

**Trạng thái:** CHÍNH THỨC PHÊ DUYỆT

**1. TỔNG QUAN DỰ ÁN**

**1.1 Bối cảnh & Vấn đề nghiệp vụ**

Khách hàng là một Running Club hoạt động bán chuyên, hiện đang sử dụng
Strava như nền tảng chính để theo dõi hoạt động tập luyện. Tuy nhiên,
nhóm gặp phải các hạn chế cốt lõi sau:

-   Strava trả về dữ liệu thô (pace, heart rate, distance) mà không cung
    cấp phân tích có ngữ cảnh.

-   Thành viên không biết liệu họ đang tiến bộ hay đang overtraining
    (tập luyện quá mức).

-   Thiếu cơ chế cảnh báo chấn thương sớm dựa trên xu hướng tập luyện cá
    nhân.

-   Không có gợi ý thông minh về kế hoạch tập luyện tiếp theo phù hợp
    với thể trạng hiện tại.

**1.2 Phạm vi dự án**

  --------------------- -------------------------------------------------
  **Hạng mục**          **Nội dung**

  **Tên dự án**         AI Coach Dashboard --- Running Club Intelligence
                        Platform

  **Phạm vi phát        Web Application (Responsive, ưu tiên desktop)
  triển**               

  **Người dùng mục      Thành viên Running Club (bán chuyên), có tài
  tiêu**                khoản Strava

  **Ngoài phạm vi**     Mobile Native App, Strava Webhook (Phase 2),
                        Admin Group Dashboard (v2.0)

  **Ngôn ngữ giao       Tiếng Việt (chính) --- giữ nguyên thuật ngữ:
  diện**                Pace, Cadence, Zone, Suffer Score

  **Hosting**           Microsoft Azure (App Service + Azure SQL + Azure
                        Key Vault)
  --------------------- -------------------------------------------------

**1.3 Mục tiêu dự án**

1.  Xây dựng dashboard thông minh kết nối Strava, hiển thị dữ liệu tập
    luyện có phân tích ngữ cảnh.

2.  Tích hợp AI (Google Gemini 1.5 Flash) tự động nhận xét, cảnh báo và
    gợi ý kế hoạch tập luyện.

3.  Cung cấp báo cáo tiến độ so sánh theo thời gian giúp thành viên theo
    dõi sự phát triển dài hạn.

4.  Xây dựng nền tảng kiến trúc Modular có khả năng scale từ 100 lên
    500+ thành viên sau 3 tháng.

**1.4 Các bên liên quan (Stakeholders)**

  ------------------ ---------------------- ------------------------------
  **Stakeholder**    **Vai trò**            **Kỳ vọng chính**

  Running Club       Người dùng cuối        Dashboard trực quan, insights
  Members                                   AI thân thiện, phản hồi nhanh

  Club Administrator Quản trị viên (future  Xem báo cáo tổng hợp nhóm
                     scope v2.0)            (Backlog v2.0)

  Development Team   Nhóm phát triển        Tài liệu rõ ràng, kiến trúc dễ
                     NestJS + ReactJS       mở rộng

  Strava API         Bên thứ ba --- nguồn   Rate limit 200 req/15min,
                     dữ liệu                OAuth2 policy ổn định

  Google Gemini API  Bên thứ ba --- AI      Uptime ổn định, cost tối ưu
                     engine                 với Flash model
  ------------------ ---------------------- ------------------------------

**2. XÁC NHẬN KHÁCH HÀNG & THAY ĐỔI TỪ v1.0**

  ------------ ----------------------------------------------------------
  **✅ ĐÃ PHÊ  Khách hàng chính thức phê duyệt SRS v1.0 ngày 14/03/2026.
  DUYỆT**      Phiên bản v1.1 này tích hợp toàn bộ 6 câu trả lời làm rõ
               và điều chỉnh phạm vi.

  ------------ ----------------------------------------------------------

**2.1 Giải đáp 6 câu hỏi làm rõ --- Chốt thiết kế**

  ---------- ------------- ------------------------- ---------------------------
  **ID**     **Câu hỏi**   **Quyết định đã chốt**    **Tác động kỹ thuật**

  **Q-01**   Số lượng user Beta: 50-100 thành viên → Azure App Service cần
                           Scale 500 sau 3 tháng     auto-scaling plan. Gemini
                                                     cost budget cho 500 users.

  **Q-02**   Tuổi & Max HR Bổ sung trường birth_year max_hr = 220 - (2026 -
                           vào bảng users            birth_year). NULL fallback
                                                     về max_heartrate Strava.

  **Q-03**   Ngôn ngữ AI   100% Tiếng Việt, giữ      Prompt Gemini chỉ định rõ
                           thuật ngữ                 ngôn ngữ và whitelist từ kỹ
                           Pace/Cadence/Zone         thuật.

  **Q-04**   Webhook vs    Polling (nút bấm thủ      Loại Strava Webhook khỏi
             Polling       công) cho Phase 1         scope. Tiết kiệm \~3-4 ngày
                                                     dev.

  **Q-05**   Admin         Chưa cần --- tập trung UX Loại hoàn toàn khỏi v1.0.
             Dashboard     cá nhân                   Ghi vào Backlog v2.0.

  **Q-06**   Hosting       Microsoft Azure --- App   Dùng Azure Key Vault thay
                           Service + Azure SQL       .env cho API keys
                                                     production.
  ---------- ------------- ------------------------- ---------------------------

**2.2 Thay đổi schema so với v1.0**

Bảng users được bổ sung 1 cột dựa trên xác nhận Q-02:

+-----------------------------------------------------------------------+
| \-- Migration: SRS v1.0 -\> v1.1                                      |
|                                                                       |
| ALTER TABLE users                                                     |
|                                                                       |
| ADD birth_year SMALLINT NULL;                                         |
|                                                                       |
| \-- NULL: user chưa nhập tuổi, AI fallback về max_heartrate từ Strava |
|                                                                       |
| \-- Computed column (view hoặc logic tầng service)                    |
|                                                                       |
| \-- max_hr = 220 - (YEAR(GETDATE()) - birth_year)                     |
+-----------------------------------------------------------------------+

**3. YÊU CẦU CHỨC NĂNG (FUNCTIONAL REQUIREMENTS)**

**MODULE 1 --- XÁC THỰC & ĐỒNG BỘ DỮ LIỆU**

**3.1 Đăng nhập bằng Strava (OAuth2)**

**3.1.1 Luồng nghiệp vụ**

5.  Người dùng truy cập trang chủ, nhấn nút \"Kết nối với Strava\".

6.  Hệ thống redirect đến Authorization URL của Strava (scope:
    activity:read_all, profile:read_all).

7.  Người dùng xác nhận quyền → Strava redirect về callback URL kèm
    Authorization Code.

8.  Backend trao đổi code lấy Access Token & Refresh Token, mã hóa
    AES-256, lưu vào Azure SQL.

9.  Người dùng được redirect vào Dashboard.

**3.1.2 Tiêu chí chấp nhận**

  ------------ ----------------------------------------- ----------------------
  **AC-ID**    **Tiêu chí**                              **Ưu tiên**

  **AC-1.1**   Nút đăng nhập hiển thị với logo Strava    **Bắt buộc**
               theo brand guidelines.                    

  **AC-1.2**   Token phải được mã hóa AES-256 trước khi  **Bắt buộc**
               lưu vào database.                         

  **AC-1.3**   Access Token hết hạn phải tự động làm mới **Bắt buộc**
               bằng Refresh Token (silent refresh).      

  **AC-1.4**   Nếu user thu hồi quyền trên Strava, hệ    **Bắt buộc**
               thống phát hiện và yêu cầu xác thực lại.  
  ------------ ----------------------------------------- ----------------------

**3.2 Đồng bộ dữ liệu hoạt động (Polling)**

**3.2.1 Dữ liệu thu thập từ Strava API**

  ---------- ---------------------- ------------------------------- -----------------
  **ID**     **Tên trường**         **Mô tả**                       **Ưu tiên**

  **D-01**   activity_id            ID định danh duy nhất của buổi  Bắt buộc
                                    tập trên Strava                 

  **D-02**   name / type            Tên buổi tập và loại (Run ---   Bắt buộc
                                    lọc bỏ các loại khác)           

  **D-03**   start_date_local       Thời gian bắt đầu theo giờ địa  Bắt buộc
                                    phương                          

  **D-04**   distance (m)           Tổng quãng đường tính bằng mét  Bắt buộc

  **D-05**   moving_time (s)        Thời gian di chuyển thực tế     Bắt buộc
                                    (giây)                          

  **D-06**   average_speed /        Tốc độ trung bình và tối đa     Bắt buộc
             max_speed              (m/s)                           

  **D-07**   average_heartrate /    Nhịp tim trung bình và tối đa   Quan trọng
             max_heartrate          (bpm)                           

  **D-08**   average_cadence        Nhịp chân trung bình (spm)      Quan trọng

  **D-09**   total_elevation_gain   Tổng độ cao leo tính bằng mét   Quan trọng
             (m)                                                    

  **D-10**   suffer_score (Relative Chỉ số nỗ lực tương đối của     Quan trọng
             Effort)                Strava                          

  **D-11**   splits_metric\[\]      Dữ liệu chia theo km (pace, HR  Tùy chọn
                                    mỗi km)                         

  **D-12**   map.polyline           Dữ liệu bản đồ tuyến đường      Tùy chọn
                                    (encoded polyline)              
  ---------- ---------------------- ------------------------------- -----------------

**3.2.2 Tiêu chí chấp nhận**

-   AC-2.1: Đồng bộ hoàn tất trong vòng 5 giây sau khi đăng nhập thành
    công.

-   AC-2.2: Chỉ đồng bộ hoạt động có type = \'Run\'; bỏ qua Ride, Walk,
    Swim, v.v.

-   AC-2.3: Không tạo bản ghi trùng lặp --- upsert theo
    strava_activity_id (UNIQUE constraint).

-   AC-2.4: Khi thiếu dữ liệu HR (thiết bị không đo), AI vẫn phân tích
    dựa trên pace và cadence.

**MODULE 2 --- DASHBOARD PHÂN TÍCH TỔNG QUAN**

**3.3 Biểu đồ Relative Effort (Cường độ theo tuần)**

Biểu đồ cột thể hiện tổng Relative Effort (suffer_score) theo từng tuần
trong 8 tuần gần nhất, giúp nhận ra xu hướng tăng/giảm tải lượng tập
luyện.

-   Trục X: Các tuần (ngày đầu tuần dạng dd/MM), Trục Y: Tổng Relative
    Effort.

-   Màu cột: Xanh lam (bình thường) \| Cam (tăng \>30% tuần trước) \| Đỏ
    (tăng \>50% tuần trước).

-   Tooltip hover: Số buổi tập, tổng km, tổng effort của tuần.

-   Đường baseline: Average effort 4 tuần gần nhất.

**3.4 Phân tích Vùng nhịp tim (Heart Rate Zones)**

**3.4.1 Định nghĩa 5 vùng nhịp tim**

  ------------ ------------ ---------------------- -----------------------
  **Vùng**     **% Max HR** **Mô tả**              **Cảnh báo nếu vượt**

  Zone 1 ---   50-60%       Phục hồi, cực nhẹ      Không cảnh báo
  Recovery                                         

  Zone 2 ---   60-70%       Nền tảng aerobic, chạy Không cảnh báo
  Aerobic Base              dài                    

  Zone 3 ---   70-80%       Ngưỡng lactate nhẹ     Không cảnh báo
  Tempo                                            

  Zone 4 ---   80-90%       Lactate threshold,     Cảnh báo nếu Z4+Z5 \>
  Threshold                 cường độ cao           35%/tuần

  Zone 5 ---   90-100%      Tối đa, không duy trì  Cảnh báo nếu Z4+Z5 \>
  VO2 Max                   lâu                    35%/tuần
  ------------ ------------ ---------------------- -----------------------

-   Max HR công thức: 220 - (năm hiện tại - birth_year). Fallback:
    max_heartrate từ Strava.

-   Hiển thị: Donut Chart phân bố % thời gian ở mỗi zone.

**MODULE 3 --- AI COACH INSIGHTS**

**3.5 Nhận xét AI tự động cho từng buổi chạy**

**3.5.1 Cấu trúc 3 khối nhận xét bắt buộc**

  ---------- --------------- ----------------------------------- --------------
  **Khối**   **Tên**         **Mô tả & Ví dụ**                   **Ưu tiên**

  **I-01**   Khen ngợi / Góp Nhận xét chỉ số kỹ thuật nổi bật.   Bắt buộc
             ý kỹ thuật      VD: \"Cadence hôm nay ổn định ở     
                             178-182 spm, đây là dấu hiệu form   
                             chạy tốt.\"                         

  **I-02**   Cảnh báo chấn   Dựa trên 10% rule. VD: \"Quãng      Bắt buộc
             thương          đường tăng 28% so tuần trước. Rủi   
                             ro shin splints đang ở mức vừa      
                             phải.\"                             

  **I-03**   Gợi ý bài tập   Dựa trên recovery need. VD:         Bắt buộc
             tiếp theo       \"Suffer Score 68/100 --- ngày mai  
                             nên chạy Recovery Run 3-4km hoặc    
                             nghỉ hoàn toàn.\"                   
  ---------- --------------- ----------------------------------- --------------

**3.5.2 Gemini Prompt Template (Draft)**

+-----------------------------------------------------------------------+
| \[SYSTEM PROMPT\]                                                     |
|                                                                       |
| Ban la mot huan luyen vien chay bo chuyen nghiep, than thien va am    |
| hieu khoa hoc the thao.                                               |
|                                                                       |
| Nhiem vu: phan tich du lieu buoi chay va dua ra nhan xet ngan gon,    |
| chinh xac, mang                                                       |
|                                                                       |
| tinh khich le. Luon trich dan so lieu cu the (it nhat 2 chi so/nhan   |
| xet).                                                                 |
|                                                                       |
| Tra loi bang tieng Viet. Giu nguyen: Pace, Cadence, Zone, Suffer      |
| Score, Recovery Run.                                                  |
|                                                                       |
| \[USER PROMPT - context variables\]                                   |
|                                                                       |
| Buoi chay: {distance}km \| Pace: {avg_pace} min/km \| HR:             |
| {avg_hr}/{max_hr} bpm                                                 |
|                                                                       |
| Cadence: {avg_cadence} spm \| Elevation: {elevation}m \| Suffer       |
| Score: {suffer_score}/100                                             |
|                                                                       |
| Tuan nay: {weekly_km}km \| Tuan truoc: {prev_weekly_km}km \| Nghi:    |
| {rest_days} ngay                                                      |
|                                                                       |
| \[OUTPUT FORMAT - JSON ONLY, no extra text\]                          |
|                                                                       |
| {                                                                     |
|                                                                       |
| \"praise\": \"\...\", // Khen ngoi / Gop y ky thuat (toi da 2 cau)    |
|                                                                       |
| \"warning\": \"\...\", // Canh bao chan thuong (toi da 2 cau)         |
|                                                                       |
| \"suggestion\": \"\...\" // Goi y bai tap tiep theo (toi da 2 cau)    |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**3.5.3 Tiêu chí chấp nhận AI Insights**

-   AC-5.1: Mỗi nhận xét trích dẫn ít nhất 2 chỉ số số liệu cụ thể ---
    không nói chung chung.

-   AC-5.2: Mỗi khối tối đa 2 câu, ngắn gọn, dễ đọc trên mobile.

-   AC-5.3: Nếu thiếu dữ liệu HR, bỏ qua phân tích Zone, chỉ phân tích
    pace & cadence.

-   AC-5.4: Người dùng có thể nhấn \'Làm mới\' để tái tạo insights
    (không cache cứng).

-   AC-5.5: Gemini trả về insights trong \< 8 giây (production), \< 10
    giây (POC).

**MODULE 4 --- BÁO CÁO TIẾN ĐỘ & AI TREND ANALYSIS**

**3.6 So sánh hiệu suất tháng này vs tháng trước**

  --------------- ------------------------------- -----------------------
  **Chỉ số**      **Cách tính**                   **Hiển thị**

  Tổng km         SUM(distance) tháng hiện tại vs Số + % thay đổi + mũi
                  tháng trước                     tên

  Số buổi tập     COUNT(activities) của tháng     Số + so sánh delta

  Pace trung bình AVG(moving_time/distance) theo  min/km + trend icon
                  tháng                           

  Nhịp tim TB     AVG(avg_hr) của tháng (nếu có   bpm + thấp hơn = tốt
                  dữ liệu)                        hơn

  Tổng Relative   SUM(suffer_score) của tháng     Số + % thay đổi
  Effort                                          

  Long Run dài    MAX(distance) của tháng         km + so sánh tháng
  nhất                                            trước
  --------------- ------------------------------- -----------------------

**3.6.1 AI Trend Analysis**

Sau khi tính toán các chỉ số, hệ thống gọi Gemini API với toàn bộ dữ
liệu so sánh để tạo đoạn phân tích tổng hợp (200-300 từ), bao gồm:

-   Nhận xét tổng thể về tiến độ của tháng.

-   Xác định điểm mạnh và điểm cần cải thiện.

-   Đề xuất mục tiêu gợi ý cho tháng tiếp theo.

**4. YÊU CẦU PHI CHỨC NĂNG**

**4.1 Hiệu năng (Performance)**

  ---------- ------------------------ ------------------ ----------------------
  **ID**     **Yêu cầu**              **SLA**            **Ưu tiên**

  **P-01**   Dashboard load (dữ liệu  **\< 2 giây**      Bắt buộc
             đã cache)                                   

  **P-02**   Strava sync 10           **\< 5 giây**      Bắt buộc
             activities                                  

  **P-03**   Gemini AI insight        **\< 8 giây /      Bắt buộc
             generation               buổi**             

  **P-04**   Concurrent users không   **50 users (Beta)  Quan trọng
             degradation              \| 500 users       
                                      (Scale)**          

  **P-05**   API response time (REST  **\< 300ms (p95)** Quan trọng
             endpoints)                                  
  ---------- ------------------------ ------------------ ----------------------

**4.2 Bảo mật (Security)**

-   OAuth2 tokens mã hóa AES-256 trước khi lưu Azure SQL.

-   Strava Access Token không expose ra frontend --- toàn bộ gọi API qua
    NestJS backend proxy.

-   HTTPS bắt buộc (TLS 1.2+) cho mọi giao tiếp.

-   Gemini API Key & Strava Client Secret lưu trong Azure Key Vault,
    không hardcode.

-   Row-level security: mỗi user chỉ truy cập dữ liệu của chính mình
    (JWT claims validation).

-   CORS policy: chỉ chấp nhận request từ domain của frontend đã đăng
    ký.

**4.3 Khả dụng & Độ tin cậy**

-   Uptime mục tiêu: 99.5% (cho phép \~3.65 giờ downtime/tháng).

-   Khi Strava API lỗi/rate limit: graceful error, hiển thị thông báo
    thân thiện, không crash.

-   Khi Gemini API lỗi: hiển thị dữ liệu thô, insights hiện trạng thái
    \'Đang xử lý --- thử lại sau\'.

-   Dữ liệu đã đồng bộ bảo toàn kể cả khi Strava API tạm thời không khả
    dụng.

**5. KIẾN TRÚC HỆ THỐNG & MODULAR DESIGN**

**5.1 Tổng quan kiến trúc 3-Tier**

Hệ thống áp dụng kiến trúc 3 tầng rõ ràng, kết hợp mô hình Modular
Architecture ở tầng Backend để đảm bảo khả năng mở rộng và bảo trì dài
hạn.

+-----------------------------------------------------------------------+
| ┌─────────────────────────────────────────────────────────────────┐   |
|                                                                       |
| │ PRESENTATION TIER │                                                 |
|                                                                       |
| │ ReactJS SPA (Azure Static Web Apps) │                               |
|                                                                       |
| │ Pages: Login \| Dashboard \| Activity Detail \| Reports │           |
|                                                                       |
| │ State: React Query (server state) + Zustand (UI state) │            |
|                                                                       |
| └──────────────────────────┬──────────────────────────────────────┘   |
|                                                                       |
| │ HTTPS / REST API (JWT Bearer)                                       |
|                                                                       |
| ┌──────────────────────────▼──────────────────────────────────────┐   |
|                                                                       |
| │ BUSINESS TIER │                                                     |
|                                                                       |
| │ NestJS API Server (Azure App Service) │                             |
|                                                                       |
| │ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │       |
|                                                                       |
| │ │ Auth │ │Activities│ │ AI │ │ Reports │ │                          |
|                                                                       |
| │ │ Module │ │ Module │ │ Module │ │ Module │ │                       |
|                                                                       |
| │ └──────────┘ └──────────┘ └──────────┘ └──────────────────┘ │       |
|                                                                       |
| │ ┌──────────────────────────────────────────────────────────┐ │      |
|                                                                       |
| │ │ Shared / Core Module │ │                                          |
|                                                                       |
| │ │ Guards \| Interceptors \| Pipes \| Config \| Database │ │         |
|                                                                       |
| │ └──────────────────────────────────────────────────────────┘ │      |
|                                                                       |
| └──────────┬──────────────────────────────────┬───────────────────┘   |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| ┌──────────▼───────────┐ ┌──────────────▼───────────────────┐         |
|                                                                       |
| │ DATA TIER │ │ EXTERNAL SERVICES │                                   |
|                                                                       |
| │ Azure SQL Server │ │ Strava API \| Gemini API │                     |
|                                                                       |
| │ (Prisma ORM) │ │ (Rate-limited + Retry logic) │                     |
|                                                                       |
| └──────────────────────┘ └──────────────────────────────────┘         |
+-----------------------------------------------------------------------+

**5.2 NestJS --- Modular Architecture**

Backend được tổ chức theo mô hình Feature Module, mỗi module hoàn toàn
độc lập, dễ test, dễ mở rộng. Nguyên tắc: một module = một bounded
context.

**5.2.1 Cấu trúc thư mục NestJS**

+-----------------------------------------------------------------------+
| src/                                                                  |
|                                                                       |
| ├── main.ts \# Bootstrap NestJS app                                   |
|                                                                       |
| ├── app.module.ts \# Root Module --- import tất cả feature modules    |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── config/ \# Configuration Module                                   |
|                                                                       |
| │ ├── config.module.ts                                                |
|                                                                       |
| │ ├── config.service.ts \# Đọc Azure Key Vault / env vars             |
|                                                                       |
| │ └── config.schema.ts \# Joi validation schema                       |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── database/ \# Database Module                                      |
|                                                                       |
| │ ├── database.module.ts \# Prisma provider (global)                  |
|                                                                       |
| │ └── prisma.service.ts \# PrismaClient wrapper                       |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── common/ \# Shared utilities (không phải module feature)           |
|                                                                       |
| │ ├── decorators/                                                     |
|                                                                       |
| │ │ └── current-user.decorator.ts                                     |
|                                                                       |
| │ ├── guards/                                                         |
|                                                                       |
| │ │ └── jwt-auth.guard.ts                                             |
|                                                                       |
| │ ├── interceptors/                                                   |
|                                                                       |
| │ │ └── logging.interceptor.ts                                        |
|                                                                       |
| │ ├── filters/                                                        |
|                                                                       |
| │ │ └── http-exception.filter.ts                                      |
|                                                                       |
| │ └── pipes/                                                          |
|                                                                       |
| │ └── validation.pipe.ts                                              |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── modules/                                                          |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── auth/ \# AUTH MODULE                                            |
|                                                                       |
| │ │ ├── auth.module.ts                                                |
|                                                                       |
| │ │ ├── auth.controller.ts \# GET /auth/strava, /auth/callback,       |
| /auth/refresh                                                         |
|                                                                       |
| │ │ ├── auth.service.ts \# OAuth2 flow, token exchange, JWT issue     |
|                                                                       |
| │ │ ├── strava-oauth.service.ts \# Strava API calls (token, refresh)  |
|                                                                       |
| │ │ └── dto/                                                          |
|                                                                       |
| │ │ └── auth-callback.dto.ts                                          |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── activities/ \# ACTIVITIES MODULE                                |
|                                                                       |
| │ │ ├── activities.module.ts                                          |
|                                                                       |
| │ │ ├── activities.controller.ts \# GET /activities, GET              |
| /activities/:id, POST /sync                                           |
|                                                                       |
| │ │ ├── activities.service.ts \# Business logic: sync, transform,     |
| query                                                                 |
|                                                                       |
| │ │ ├── strava-api.service.ts \# HTTP client to Strava API            |
| (rate-limit aware)                                                    |
|                                                                       |
| │ │ ├── activities.repository.ts \# DB queries (Prisma)               |
|                                                                       |
| │ │ └── dto/                                                          |
|                                                                       |
| │ │ ├── sync-response.dto.ts                                          |
|                                                                       |
| │ │ └── activity-query.dto.ts                                         |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── ai/ \# AI MODULE                                                |
|                                                                       |
| │ │ ├── ai.module.ts                                                  |
|                                                                       |
| │ │ ├── ai.controller.ts \# POST /ai/insights/:activityId, POST       |
| /ai/trend                                                             |
|                                                                       |
| │ │ ├── ai.service.ts \# Orchestrate: get activity -\> build prompt   |
| -\> call Gemini                                                       |
|                                                                       |
| │ │ ├── gemini.service.ts \# HTTP client to Gemini API + retry logic  |
|                                                                       |
| │ │ ├── prompt.builder.ts \# Prompt template engine                   |
|                                                                       |
| │ │ ├── insights.repository.ts \# Lưu/đọc ai_insights từ DB           |
|                                                                       |
| │ │ └── dto/                                                          |
|                                                                       |
| │ │ └── insight-response.dto.ts                                       |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ └── reports/ \# REPORTS MODULE                                      |
|                                                                       |
| │ ├── reports.module.ts                                               |
|                                                                       |
| │ ├── reports.controller.ts \# GET /reports/monthly?month=&year=      |
|                                                                       |
| │ ├── reports.service.ts \# Tính toán chỉ số, gọi AI trend analysis   |
|                                                                       |
| │ └── reports.repository.ts \# Aggregate queries                      |
|                                                                       |
| │                                                                     |
|                                                                       |
| └── health/ \# Health check endpoint (Azure monitoring)               |
|                                                                       |
| └── health.controller.ts \# GET /health -\> {status: \'ok\'}          |
+-----------------------------------------------------------------------+

**5.2.2 Luồng xử lý theo Layered Pattern**

Mỗi feature module tuân theo nguyên tắc phân tầng nhất quán, đảm bảo
Single Responsibility và khả năng test độc lập từng tầng:

+-----------------------------------------------------------------------+
| Request → Controller → Service → Repository → Database                |
|                                                                       |
| ↘ External Service (Strava/Gemini)                                    |
|                                                                       |
| Controller : Validate input (DTO + Pipes), gọi Service, format        |
| response                                                              |
|                                                                       |
| Service : Business logic, orchestration, KHÔNG trực tiếp query DB     |
|                                                                       |
| Repository : Tất cả Prisma queries tập trung tại đây                  |
|                                                                       |
| Ext Service : HTTP calls ra ngoài, có retry/timeout/circuit-breaker   |
+-----------------------------------------------------------------------+

**5.2.3 Dependency Injection & Module Pattern**

+-----------------------------------------------------------------------+
| // activities.module.ts --- ví dụ module hoàn chỉnh                   |
|                                                                       |
| \@Module({                                                            |
|                                                                       |
| imports: \[                                                           |
|                                                                       |
| DatabaseModule, // PrismaService available via DI                     |
|                                                                       |
| ConfigModule, // ConfigService available via DI                       |
|                                                                       |
| HttpModule.registerAsync({ // Axios HTTP client                       |
|                                                                       |
| useFactory: (cfg: ConfigService) =\> ({                               |
|                                                                       |
| timeout: 10000,                                                       |
|                                                                       |
| headers: { Authorization: \`Bearer \${cfg.get(\'STRAVA_TOKEN\')}\` }  |
|                                                                       |
| }),                                                                   |
|                                                                       |
| inject: \[ConfigService\],                                            |
|                                                                       |
| }),                                                                   |
|                                                                       |
| \],                                                                   |
|                                                                       |
| controllers: \[ActivitiesController\],                                |
|                                                                       |
| providers: \[                                                         |
|                                                                       |
| ActivitiesService,                                                    |
|                                                                       |
| ActivitiesRepository,                                                 |
|                                                                       |
| StravaApiService,                                                     |
|                                                                       |
| \],                                                                   |
|                                                                       |
| exports: \[ActivitiesService\], // Export để AiModule có thể inject   |
|                                                                       |
| })                                                                    |
|                                                                       |
| export class ActivitiesModule {}                                      |
+-----------------------------------------------------------------------+

**5.2.4 Guard & Interceptor (Cross-cutting Concerns)**

+-----------------------------------------------------------------------+
| // Áp dụng globally trong main.ts                                     |
|                                                                       |
| app.useGlobalGuards(new JwtAuthGuard(reflector));                     |
|                                                                       |
| app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform:   |
| true }));                                                             |
|                                                                       |
| app.useGlobalInterceptors(new LoggingInterceptor());                  |
|                                                                       |
| app.useGlobalFilters(new HttpExceptionFilter());                      |
|                                                                       |
| // JwtAuthGuard: verify JWT token, inject user vào request            |
|                                                                       |
| // ValidationPipe: auto-validate DTO, strip extra fields              |
|                                                                       |
| // LoggingInterceptor: log request/response time, correlationId       |
|                                                                       |
| // HttpExceptionFilter: format lỗi nhất quán {statusCode, message,    |
| timestamp}                                                            |
+-----------------------------------------------------------------------+

**5.3 ReactJS --- Modular Frontend Architecture**

Frontend áp dụng Feature-based folder structure, tách biệt hoàn toàn
giữa UI components, business logic (hooks), API layer, và state
management.

**5.3.1 Cấu trúc thư mục ReactJS**

+-----------------------------------------------------------------------+
| src/                                                                  |
|                                                                       |
| ├── main.tsx \# Entry point                                           |
|                                                                       |
| ├── App.tsx \# Router + Auth provider                                 |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── api/ \# API Layer (Axios instances + query functions)             |
|                                                                       |
| │ ├── axios.instance.ts \# Axios với interceptor tự động refresh      |
| token                                                                 |
|                                                                       |
| │ ├── auth.api.ts \# /auth endpoints                                  |
|                                                                       |
| │ ├── activities.api.ts \# /activities endpoints                      |
|                                                                       |
| │ ├── ai.api.ts \# /ai endpoints                                      |
|                                                                       |
| │ └── reports.api.ts \# /reports endpoints                            |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── hooks/ \# React Query hooks (server state)                        |
|                                                                       |
| │ ├── useActivities.ts \# useQuery(\[\'activities\'\],                |
| fetchActivities)                                                      |
|                                                                       |
| │ ├── useInsights.ts \# useQuery(\[\'insights\', id\], fetchInsights) |
|                                                                       |
| │ ├── useSyncStrava.ts \# useMutation(syncStrava)                     |
|                                                                       |
| │ └── useMonthlyReport.ts \# useQuery(\[\'report\', month, year\])    |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── store/ \# Zustand (UI state only --- không dùng cho server state) |
|                                                                       |
| │ ├── auth.store.ts \# { user, token, setUser, logout }               |
|                                                                       |
| │ └── ui.store.ts \# { sidebarOpen, selectedActivity }                |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── features/ \# Feature modules                                      |
|                                                                       |
| │ ├── auth/                                                           |
|                                                                       |
| │ │ ├── LoginPage.tsx \# Trang đăng nhập + nút Strava                 |
|                                                                       |
| │ │ └── CallbackPage.tsx \# OAuth2 callback handler                   |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── dashboard/                                                      |
|                                                                       |
| │ │ ├── DashboardPage.tsx \# Layout chính                             |
|                                                                       |
| │ │ ├── EffortChart.tsx \# Recharts: bar chart Relative Effort        |
|                                                                       |
| │ │ ├── HRZoneChart.tsx \# Recharts: donut chart HR Zones             |
|                                                                       |
| │ │ └── ActivityList.tsx \# Danh sách 10 buổi chạy                    |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ ├── activity/                                                       |
|                                                                       |
| │ │ ├── ActivityDetailPage.tsx \# Chi tiết buổi chạy + AI Insights    |
| card                                                                  |
|                                                                       |
| │ │ └── InsightCard.tsx \# 3-block AI insight display                 |
|                                                                       |
| │ │                                                                   |
|                                                                       |
| │ └── reports/                                                        |
|                                                                       |
| │ ├── ReportsPage.tsx \# Trang báo cáo tháng                          |
|                                                                       |
| │ ├── MonthCompareTable.tsx \# Bảng so sánh chỉ số                    |
|                                                                       |
| │ └── TrendAnalysis.tsx \# AI trend analysis text block               |
|                                                                       |
| │                                                                     |
|                                                                       |
| ├── components/ \# Shared UI components (không có business logic)     |
|                                                                       |
| │ ├── ui/                                                             |
|                                                                       |
| │ │ ├── Button.tsx                                                    |
|                                                                       |
| │ │ ├── Badge.tsx \# Priority / status badges                         |
|                                                                       |
| │ │ ├── Spinner.tsx                                                   |
|                                                                       |
| │ │ └── ErrorBoundary.tsx                                             |
|                                                                       |
| │ └── layout/                                                         |
|                                                                       |
| │ ├── Sidebar.tsx                                                     |
|                                                                       |
| │ ├── Topbar.tsx                                                      |
|                                                                       |
| │ └── ProtectedRoute.tsx \# Redirect nếu chưa auth                    |
|                                                                       |
| │                                                                     |
|                                                                       |
| └── utils/                                                            |
|                                                                       |
| ├── format.ts \# formatPace, formatDistance, formatDuration           |
|                                                                       |
| └── hrZone.ts \# calculateZoneDistribution(activities, maxHr)         |
+-----------------------------------------------------------------------+

**5.3.2 Data Flow Pattern**

+-----------------------------------------------------------------------+
| Axios Instance (auto refresh token)                                   |
|                                                                       |
| ↓                                                                     |
|                                                                       |
| API functions (activities.api.ts) ← Pure async functions              |
|                                                                       |
| ↓                                                                     |
|                                                                       |
| React Query hooks (useActivities.ts) ← Cache, loading, error states   |
|                                                                       |
| ↓                                                                     |
|                                                                       |
| Feature components (DashboardPage.tsx) ← Compose hooks + UI           |
|                                                                       |
| ↓                                                                     |
|                                                                       |
| Shared UI components (Charts, Cards) ← Presentational only (no data   |
| fetching)                                                             |
|                                                                       |
| Zustand store: CHỈ lưu UI state (auth user, sidebar open)             |
|                                                                       |
| KHÔNG lưu server data (dùng React Query cache)                        |
+-----------------------------------------------------------------------+

**5.4 SQL Server --- Database Design**

**5.4.1 Entity Relationship Diagram**

+-----------------------------------------------------------------------+
| users activities                                                      |
|                                                                       |
| ────────────────────── ──────────────────────────────────             |
|                                                                       |
| PK id BIGINT PK id BIGINT                                             |
|                                                                       |
| strava_user_id VARCHAR FK user_id BIGINT → users.id                   |
|                                                                       |
| access_token_enc VARBINARY strava_activity_id VARCHAR UNIQUE          |
|                                                                       |
| refresh_token_enc VARBINARY name NVARCHAR                             |
|                                                                       |
| token_expires_at DATETIME type VARCHAR (always \'Run\')               |
|                                                                       |
| display_name NVARCHAR start_date_local DATETIME                       |
|                                                                       |
| profile_image_url VARCHAR distance_m DECIMAL                          |
|                                                                       |
| birth_year SMALLINT moving_time_s INT                                 |
|                                                                       |
| created_at DATETIME avg_speed_ms DECIMAL                              |
|                                                                       |
| updated_at DATETIME max_speed_ms DECIMAL                              |
|                                                                       |
| avg_hr SMALLINT                                                       |
|                                                                       |
| max_hr SMALLINT                                                       |
|                                                                       |
| ai_insights avg_cadence SMALLINT                                      |
|                                                                       |
| ────────────────────── elevation_gain_m DECIMAL                       |
|                                                                       |
| PK id BIGINT suffer_score SMALLINT                                    |
|                                                                       |
| FK activity_id BIGINT → activities.id raw_json NVARCHAR(MAX)          |
|                                                                       |
| FK user_id BIGINT → users.id synced_at DATETIME                       |
|                                                                       |
| praise_comment NVARCHAR                                               |
|                                                                       |
| injury_warning NVARCHAR monthly_reports                               |
|                                                                       |
| next_suggestion NVARCHAR ──────────────────────────────────           |
|                                                                       |
| model_version VARCHAR PK id BIGINT                                    |
|                                                                       |
| generated_at DATETIME FK user_id BIGINT                               |
|                                                                       |
| prompt_hash VARCHAR year SMALLINT                                     |
|                                                                       |
| month TINYINT                                                         |
|                                                                       |
| total_km DECIMAL                                                      |
|                                                                       |
| total_sessions SMALLINT                                               |
|                                                                       |
| avg_pace_sec_per_km INT                                               |
|                                                                       |
| avg_hr SMALLINT                                                       |
|                                                                       |
| total_effort INT                                                      |
|                                                                       |
| ai_trend_analysis NVARCHAR(MAX)                                       |
|                                                                       |
| generated_at DATETIME                                                 |
+-----------------------------------------------------------------------+

**5.4.2 Prisma Schema (ORM)**

+-----------------------------------------------------------------------+
| // schema.prisma                                                      |
|                                                                       |
| generator client {                                                    |
|                                                                       |
| provider = \"prisma-client-js\"                                       |
|                                                                       |
| }                                                                     |
|                                                                       |
| datasource db {                                                       |
|                                                                       |
| provider = \"sqlserver\"                                              |
|                                                                       |
| url = env(\"DATABASE_URL\") // từ Azure Key Vault                     |
|                                                                       |
| }                                                                     |
|                                                                       |
| model User {                                                          |
|                                                                       |
| id BigInt \@id \@default(autoincrement())                             |
|                                                                       |
| stravaUserId String \@unique \@map(\"strava_user_id\")                |
|                                                                       |
| accessTokenEnc Bytes \@map(\"access_token_enc\")                      |
|                                                                       |
| refreshTokenEnc Bytes \@map(\"refresh_token_enc\")                    |
|                                                                       |
| tokenExpiresAt DateTime \@map(\"token_expires_at\")                   |
|                                                                       |
| displayName String \@map(\"display_name\")                            |
|                                                                       |
| birthYear Int? \@map(\"birth_year\")                                  |
|                                                                       |
| createdAt DateTime \@default(now()) \@map(\"created_at\")             |
|                                                                       |
| activities Activity\[\]                                               |
|                                                                       |
| insights AiInsight\[\]                                                |
|                                                                       |
| reports MonthlyReport\[\]                                             |
|                                                                       |
| @@map(\"users\")                                                      |
|                                                                       |
| }                                                                     |
|                                                                       |
| model Activity {                                                      |
|                                                                       |
| id BigInt \@id \@default(autoincrement())                             |
|                                                                       |
| userId BigInt \@map(\"user_id\")                                      |
|                                                                       |
| stravaActivityId String \@unique \@map(\"strava_activity_id\")        |
|                                                                       |
| distanceM Decimal \@map(\"distance_m\")                               |
|                                                                       |
| movingTimeS Int \@map(\"moving_time_s\")                              |
|                                                                       |
| avgHr Int? \@map(\"avg_hr\")                                          |
|                                                                       |
| avgCadence Int? \@map(\"avg_cadence\")                                |
|                                                                       |
| sufferScore Int? \@map(\"suffer_score\")                              |
|                                                                       |
| rawJson String? \@map(\"raw_json\") // full Strava response           |
|                                                                       |
| syncedAt DateTime \@default(now()) \@map(\"synced_at\")               |
|                                                                       |
| user User \@relation(fields: \[userId\], references: \[id\])          |
|                                                                       |
| insights AiInsight\[\]                                                |
|                                                                       |
| @@map(\"activities\")                                                 |
|                                                                       |
| }                                                                     |
+-----------------------------------------------------------------------+

**5.4.3 Index Strategy**

  ----------------- --------------------------- ------------------------------
  **Bảng**          **Index**                   **Lý do**

  users             UNIQUE on strava_user_id    Tìm kiếm user khi OAuth
                                                callback

  activities        UNIQUE on                   Upsert --- tránh duplicate khi
                    strava_activity_id          sync

  activities        INDEX on (user_id,          Dashboard query: activities
                    start_date_local DESC)      của user theo thời gian

  activities        INDEX on (user_id,          Lấy 10 buổi gần nhất
                    synced_at DESC)             

  ai_insights       INDEX on activity_id        Lookup insights theo activity

  monthly_reports   UNIQUE on (user_id, year,   Tránh report trùng, upsert
                    month)                      monthly
  ----------------- --------------------------- ------------------------------

**5.5 Technology Stack --- Tổng hợp**

  -------------- --------------------- ---------- ----------------------------
  **Tầng**       **Công nghệ**         **Phiên    **Ghi chú**
                                       bản**      

  **Frontend**   ReactJS + TypeScript  React 18   Vite bundler, strict
                                                  TypeScript

  **Frontend**   Tailwind CSS          v3         Utility-first, responsive
                                                  design

  **Frontend**   Recharts              v2         Biểu đồ Effort, HR Zones,
                                                  trend

  **Frontend**   React Query           v5         Server state, caching,
                 (TanStack)                       background refetch

  **Frontend**   Zustand               v4         UI state management (nhẹ,
                                                  không boilerplate)

  **Backend**    NestJS + TypeScript   v10        Modular, DI container,
                                                  decorators

  **Backend**    Prisma ORM            v5         Type-safe queries,
                                                  migration, SQL Server
                                                  support

  **Backend**    Passport.js           v0.7       OAuth2 strategy cho Strava

  **Backend**    class-validator       latest     DTO validation với
                                                  decorators

  **Database**   SQL Server (Azure     SQL Server Azure SQL Standard tier
                 SQL)                  2022       (auto-scale)

  **AI**         Google Gemini 1.5     API v1     Cost-effective, \~8s
                 Flash                            response, tiếng Việt tốt

  **Auth**       Strava OAuth2 + JWT   OAuth 2.0  Authorization Code Flow

  **Infra**      Azure App Service     Plan B2    Auto-scale, deployment slots

  **Infra**      Azure Static Web Apps \-         Hosting ReactJS SPA, CDN
                                                  global

  **Infra**      Azure Key Vault       \-         Lưu API keys, connection
                                                  strings

  **Infra**      Docker                v25        Container hóa NestJS app
  -------------- --------------------- ---------- ----------------------------

**6. LỘ TRÌNH TRIỂN KHAI**

**6.1 Kế hoạch 11 tuần (đã cập nhật sau xác nhận khách hàng)**

  ----------- --------------- ---------- --------------------------- --------------
  **Phase**   **Tên**         **Tuần**   **Deliverables chính**      **Team**

  **1**       Foundation &    1-2        NestJS + React scaffold,    BE + FE
              Auth                       Strava OAuth2 flow, Azure   
                                         SQL schema, CI/CD pipeline  

  **2**       Data Sync       3-4        Strava Activity API, upsert BE
                                         logic, polling endpoint     
                                         POST /sync, API endpoints   
                                         CRUD                        

  **3**       Dashboard UI    5-6        React dashboard,            FE
                                         EffortChart, HRZoneChart    
                                         (Recharts), ActivityList,   
                                         responsive layout           

  **4**       AI Integration  7-8        Gemini API, prompt          BE + AI
                                         engineering, 3-block        
                                         insights, retry/fallback,   
                                         cache insights DB           

  **5**       Reports         9          Monthly comparison, AI      BE + FE
                                         Trend Analysis, ReportsPage 
                                         ReactJS                     

  **6**       Testing         10         Unit/Integration tests      QA
                                         (Jest), E2E (Playwright),   
                                         Security audit, Performance 
                                         tuning                      

  **7**       Launch          11         Deploy production Azure,    All
                                         monitoring setup, Azure Key 
                                         Vault, documentation, UAT   
                                         sign-off                    
  ----------- --------------- ---------- --------------------------- --------------

  ------------ ----------------------------------------------------------
  **⏱ Tổng     11 tuần (\~2.5 tháng) \| Beta launch: 50-100 members \|
  thời gian**  Scale to 500: tháng thứ 4

  ------------ ----------------------------------------------------------

**6.2 Kế hoạch POC --- Thứ 6 (21/03/2026)**

  ---------- ------------------------------- ----------------------------
  **Ngày**   **Việc cần làm**                **Deliverable**

  Thứ 2      Khởi tạo repo, cấu hình Azure   Repo chạy được npm start,
  (17/03)    SQL Dev, tạo Strava Developer   kết nối DB thành công
             App                             

  Thứ 3      Implement Strava OAuth2 flow,   Postman test OAuth flow
  (18/03)    API GET /activities (gọi        thành công, 5 activities
             Strava, lưu DB)                 trong DB

  Thứ 4      Implement Gemini prompt,        Gemini trả về 3 khối nhận
  (19/03) SA endpoint POST /ai/insights/:id, xét đúng format
             parse JSON response             

  Thứ 4      React UI: LoginPage,            UI kết nối được backend API
  (19/03) CH ActivityList, InsightCard       
             component                       

  Thứ 5      Integration E2E test, fix bugs, Demo nội bộ pass, sẵn sàng
  (20/03)    rehearsal demo nội bộ           trình KH

  Thứ 6      Demo chính thức với Khách hàng  Biên bản nghiệm thu POC
  (21/03)    (BA dẫn dắt)                    
  ---------- ------------------------------- ----------------------------

**6.3 Tiêu chí POC thành công**

  ---------------------------------- ------------------------------------
  **Tiêu chí**                       **Mức chấp nhận**

  OAuth2 login hoàn tất không lỗi    **100% --- bắt buộc**

  5 buổi chạy hiển thị đúng dữ liệu  **Sai lệch \< 1% so với Strava app
  từ Strava                          gốc**

  Gemini trả về đúng 3 khối nhận xét **Đủ 3 khối, mỗi khối ≥ 2 chỉ số**
  có số liệu cụ thể                  

  Thời gian Gemini phản hồi          **\< 10 giây (POC nới hơn SRS 2
                                     giây)**

  Ngôn ngữ AI output                 **100% Tiếng Việt, giữ
                                     Pace/Cadence/Zone**

  Không crash trong suốt buổi demo   **0 unhandled exception hiển thị ra
                                     UI**
  ---------------------------------- ------------------------------------

**7. RỦI RO & PHƯƠNG ÁN DỰ PHÒNG**

  ---------- ---------------- ---------- ---------- -------------------------------
  **ID**     **Rủi ro**       **Khả      **Tác      **Phương án dự phòng**
                              năng**     động**     

  **R-01**   Strava Rate      **Cao**    **Trung    Queue + exponential backoff
             Limit (200                  bình**     retry. Cache response 15 phút.
             req/15min)                             

  **R-02**   Thiếu dữ liệu HR **Cao**    **Thấp**   AI fallback: bỏ phân tích Zone,
             (không đeo đồng                        chỉ dùng pace & cadence.
             hồ)                                    

  **R-03**   Gemini API không **Trung    **Cao**    Retry 3 lần + JSON extraction
             trả JSON đúng    bình**                regex fallback + log lỗi.
             format                                 

  **R-04**   Strava Developer **Trung    **Cao**    Chuẩn bị mock JSON data chuẩn
             App chưa         bình**                để demo nếu cần.
             approved cho POC                       

  **R-05**   Chi phí Gemini   **Thấp**   **Trung    Cache insights đã tạo vào DB
             API tăng theo               bình**     (prompt_hash). Tái sử dụng nếu
             users                                  không có dữ liệu mới.

  **R-06**   Strava thay đổi  **Rất      **Cao**    Monitor Strava Dev changelog.
             OAuth/API policy thấp**                Abstraction layer qua
                                                    StravaApiService.
  ---------- ---------------- ---------- ---------- -------------------------------

**8. PHÊ DUYỆT TÀI LIỆU**

  ------------ ----------------------------------------------------------
  **📋 TRẠNG   SRS v1.1 --- Cập nhật sau phê duyệt chính thức của Khách
  THÁI**       hàng ngày 14/03/2026. Mọi thay đổi phát sinh sau ngày ký
               cần thông qua quy trình Change Request.

  ------------ ----------------------------------------------------------

  ------------------ ---------------- ------------- ---------------------
  **Vai trò**        **Họ tên**       **Ngày ký**   **Chữ ký**

  Đại diện Khách                                    
  hàng                                              

  Business Analyst                                  

  Technical Lead                                    

  Project Manager                                   
  ------------------ ---------------- ------------- ---------------------

*--- Hết tài liệu SRS v1.1 ---*
