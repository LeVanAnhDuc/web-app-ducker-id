# Color System Documentation

> Hệ thống màu sắc semantic sử dụng oklch format theo quy tắc 60-30-10

---

## Table of Contents

1. [Quy tắc 60-30-10](#quy-tắc-60-30-10)
2. [oklch Color Format](#oklch-color-format)
3. [Color Variables Reference](#color-variables-reference)
4. [Semantic Color Pairs](#semantic-color-pairs)
5. [Contrast Rules](#contrast-rules)
6. [Common Mistakes](#common-mistakes)
7. [Best Practices](#best-practices)
8. [Quick Reference](#quick-reference)

---

## Quy tắc 60-30-10

### Phân bổ màu sắc

- **60%** - Màu nền trung tính (zinc) - `background`, `card`, `muted`
- **30%** - Màu phụ/bổ trợ - `info`, `cream`, `success`, `warning`
- **10%** - Màu nhấn - `primary` (amber), `destructive`

### Visual Preview

```
┌─────────────────────────────────────────────────────────────┐
│                        60% ZINC                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                     CARD (zinc)                      │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │        30% CREAM (Instructions)             │    │    │
│  │  │   Hint: Enter your email to continue        │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                      │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │        30% INFO (Alert box)                 │    │    │
│  │  │   Response time: 24-48 hours                │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                      │    │
│  │  ┌─────────────────────────────────────────────┐    │    │
│  │  │        30% SUCCESS (Completed)              │    │    │
│  │  │   Your request has been submitted           │    │    │
│  │  └─────────────────────────────────────────────┘    │    │
│  │                                                      │    │
│  │           ┌──────────────────────┐                  │    │
│  │           │  10% PRIMARY BUTTON  │                  │    │
│  │           │      Continue →      │                  │    │
│  │           └──────────────────────┘                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## oklch Color Format

### Cấu trúc

oklch = **Oklab Lightness Chroma Hue** - không gian màu đồng nhất về nhận thức.

```css
oklch(L C H)
```

| Thành phần        | Phạm vi | Mô tả                    |
| ----------------- | ------- | ------------------------ |
| **L** (Lightness) | 0 - 1   | 0 = đen, 1 = trắng       |
| **C** (Chroma)    | 0 - 0.4 | Độ bão hòa màu           |
| **H** (Hue)       | 0 - 360 | Góc màu trên bánh xe màu |

### Phân loại Lightness

| Giá trị L    | Phân loại  | Foreground cần    |
| ------------ | ---------- | ----------------- |
| L < 0.3      | Rất tối    | Chữ SÁNG/TRẮNG    |
| L 0.3 - 0.5  | Tối        | Chữ SÁNG/TRẮNG    |
| L 0.5 - 0.7  | Trung bình | Chữ SÁNG (thường) |
| L 0.7 - 0.85 | Sáng       | Chữ TỐI           |
| L > 0.85     | Rất sáng   | Chữ TỐI           |

---

## Color Variables Reference

### Light Mode (:root)

```css
:root {
  /* Base Colors */
  --background: oklch(1 0 0); /* L=1.0   - Trắng tinh */
  --foreground: oklch(0.141 0.005 285.823); /* L=0.141 - Gần đen */

  /* Primary (Amber) - SÁNG */
  --primary: oklch(0.769 0.188 70.08); /* L=0.769 - Vàng cam SÁNG */
  --primary-foreground: oklch(0.141 0.005 285.823); /* L=0.141 - Chữ TỐI */

  /* Info (Blue) - TỐI */
  --info: oklch(0.45 0.12 260); /* L=0.45  - Xanh dương TỐI */
  --info-foreground: oklch(0.985 0 0); /* L=0.985 - Chữ TRẮNG */

  /* Success (Green) - TRUNG BÌNH */
  --success: oklch(0.6 0.15 150); /* L=0.6   - Xanh lá TB */
  --success-foreground: oklch(0.985 0 0); /* L=0.985 - Chữ TRẮNG */

  /* Warning (Yellow-Orange) - SÁNG */
  --warning: oklch(0.75 0.15 85); /* L=0.75  - Vàng SÁNG */
  --warning-foreground: oklch(0.35 0.05 85); /* L=0.35  - Chữ TỐI */

  /* Cream - RẤT SÁNG */
  --cream: oklch(0.95 0.02 70); /* L=0.95  - Kem rất nhạt */
  --cream-foreground: oklch(0.35 0.02 70); /* L=0.35  - Chữ TỐI */

  /* Destructive (Red) - TRUNG BÌNH */
  --destructive: oklch(0.577 0.245 27.325); /* L=0.577 - Đỏ TB */

  /* Muted */
  --muted: oklch(0.967 0.001 286.375); /* L=0.967 - Xám rất nhạt */
  --muted-foreground: oklch(0.552 0.016 285.938); /* L=0.552 - Xám TB */
}
```

### Dark Mode (.dark)

```css
.dark {
  /* Base Colors */
  --background: oklch(0.141 0.005 285.823); /* L=0.141 - Gần đen */
  --foreground: oklch(0.985 0 0); /* L=0.985 - Gần trắng */

  /* Primary (Amber) - Giữ nguyên lightness */
  --primary: oklch(0.769 0.188 70.08); /* L=0.769 - Vàng cam SÁNG */
  --primary-foreground: oklch(0.141 0.005 285.823); /* L=0.141 - Chữ TỐI */

  /* Info (Blue) - Sáng hơn một chút */
  --info: oklch(0.55 0.12 260); /* L=0.55  - Xanh sáng hơn */
  --info-foreground: oklch(0.95 0.02 260); /* L=0.95  - Xanh nhạt-trắng */

  /* Success (Green) - Tối hơn một chút */
  --success: oklch(0.55 0.12 150); /* L=0.55  - Xanh tối hơn */
  --success-foreground: oklch(0.95 0.02 150); /* L=0.95  - Xanh nhạt-trắng */

  /* Warning (Yellow-Orange) */
  --warning: oklch(0.65 0.12 85); /* L=0.65  - Vàng tối hơn */
  --warning-foreground: oklch(0.95 0.02 85); /* L=0.95  - Vàng nhạt-trắng */

  /* Cream - Đảo ngược cho dark mode */
  --cream: oklch(0.25 0.02 70); /* L=0.25  - Cream tối */
  --cream-foreground: oklch(0.9 0.02 70); /* L=0.9   - Chữ SÁNG */
}
```

---

## Semantic Color Pairs

### Hiểu về pattern Base + Foreground

Mỗi màu semantic có **2 phần**:

| Variable               | Mục đích                  | Sử dụng                   |
| ---------------------- | ------------------------- | ------------------------- |
| `--{color}`            | Màu **nền**               | `bg-{color}`              |
| `--{color}-foreground` | Màu **chữ** cho nền solid | `text-{color}-foreground` |

### Phân tích các cặp màu

| Màu         | Base Lightness | Foreground Lightness | Kết hợp             |
| ----------- | -------------- | -------------------- | ------------------- |
| **primary** | 0.769 (SÁNG)   | 0.141 (TỐI)          | Nền sáng + Chữ tối  |
| **info**    | 0.45 (TỐI)     | 0.985 (TRẮNG)        | Nền tối + Chữ trắng |
| **success** | 0.6 (TB)       | 0.985 (TRẮNG)        | Nền TB + Chữ trắng  |
| **warning** | 0.75 (SÁNG)    | 0.35 (TỐI)           | Nền sáng + Chữ tối  |
| **cream**   | 0.95 (SÁNG)    | 0.35 (TỐI)           | Nền sáng + Chữ tối  |

### Biểu đồ trực quan

```
┌─────────────────────────────────────────────────────────────┐
│                 MÀU NỀN SÁNG (L > 0.7)                      │
│                (cần chữ TỐI)                                │
├─────────────────────────────────────────────────────────────┤
│  primary (L=0.769)  │  warning (L=0.75)  │  cream (L=0.95)  │
│  ████████████████   │  ████████████████  │  ████████████████│
│  text-primary-fg    │  text-warning-fg   │  text-cream-fg   │
│  (chữ tối)          │  (chữ tối)         │  (chữ tối)       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                 MÀU NỀN TỐI (L < 0.7)                       │
│                (cần chữ SÁNG/TRẮNG)                         │
├─────────────────────────────────────────────────────────────┤
│  info (L=0.45)      │  success (L=0.6)   │  destructive     │
│  ████████████████   │  ████████████████  │  ████████████████│
│  text-info-fg       │  text-success-fg   │  text-white      │
│  (chữ trắng)        │  (chữ trắng)       │  (chữ trắng)     │
└─────────────────────────────────────────────────────────────┘
```

---

## Contrast Rules

### Rule 1: Nền Solid

**Khi dùng nền solid (`bg-{color}`), dùng màu chữ tương ứng (`text-{color}-foreground`).**

```tsx
// ✅ ĐÚNG - Nền solid với foreground text
<div className="bg-primary text-primary-foreground">
  Chữ tối trên nền amber sáng
</div>

<div className="bg-info text-info-foreground">
  Chữ trắng trên nền xanh tối
</div>

<div className="bg-success text-success-foreground">
  Chữ trắng trên nền xanh lá
</div>
```

### Rule 2: Nền Tinted/Trong suốt

**Khi dùng nền tinted (`bg-{color}/10`, `bg-{color}/20`), dùng `text-foreground` hoặc `text-muted-foreground`.**

> **Tại sao?** Nền tinted là lớp phủ bán trong suốt trên nền trang. Các màu `-foreground` (như `info-foreground` = trắng) được thiết kế cho nền solid tối, không phải nền tinted nhạt.

```tsx
// ✅ ĐÚNG - Nền tinted với text tiêu chuẩn
<div className="bg-info/10 text-foreground">
  Chữ tối trên nền xanh nhạt
</div>

<div className="bg-success/10 text-foreground">
  Chữ tối trên nền xanh lá nhạt
</div>

<div className="bg-warning/20 text-muted-foreground">
  Chữ xám trên nền vàng nhạt
</div>
```

```tsx
// ❌ SAI - Chữ trắng trên nền tinted nhạt
<div className="bg-info/10 text-info-foreground">
  Chữ trắng trên nền xanh nhạt = CONTRAST THẤP!
</div>

<div className="bg-success/10 text-success-foreground">
  Chữ trắng trên nền xanh lá nhạt = CONTRAST THẤP!
</div>
```

### Rule 3: Nền Gradient

**Với nền gradient, xác định foreground dựa trên lightness của màu chính.**

```tsx
// ✅ ĐÚNG - Gradient từ màu tối
<div className="bg-gradient-to-br from-info to-info/80 text-info-foreground">
  Chữ trắng trên gradient xanh tối
</div>

// ✅ ĐÚNG - Gradient từ màu sáng
<div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground">
  Chữ tối trên gradient amber sáng
</div>
```

### Sơ đồ quyết định

```
Nền là SOLID (bg-{color})?
├── CÓ → Dùng text-{color}-foreground
└── KHÔNG (tinted/trong suốt)
    └── Dùng text-foreground hoặc text-muted-foreground

Màu có SÁNG không (L > 0.7)?
├── CÓ (primary, warning, cream) → Cần chữ TỐI
└── KHÔNG (info, success, destructive) → Cần chữ SÁNG/TRẮNG
```

---

## Common Mistakes

### Lỗi 1: Chữ trắng trên nền sáng

```tsx
// ❌ SAI
<div className="bg-primary text-white">
  Chữ trắng trên amber sáng = CONTRAST RẤT THẤP
</div>

// ✅ ĐÚNG
<div className="bg-primary text-primary-foreground">
  Chữ tối trên amber sáng = CONTRAST CAO
</div>
```

### Lỗi 2: Foreground colors trên nền tinted

```tsx
// ❌ SAI - info-foreground là TRẮNG (L=0.985)
<div className="bg-info/10 text-info-foreground">
  Chữ trắng trên nền xanh nhạt = CONTRAST THẤP
</div>

// ✅ ĐÚNG
<div className="bg-info/10 text-foreground">
  Chữ tối trên nền xanh nhạt = CONTRAST CAO
</div>
```

### Lỗi 3: Màu hardcoded

```tsx
// ❌ SAI - Màu Tailwind hardcoded
<div className="bg-blue-500 text-white">...</div>
<div className="text-green-600">...</div>

// ✅ ĐÚNG - Màu semantic
<div className="bg-info text-info-foreground">...</div>
<div className="text-success">...</div>
```

### Lỗi 4: Thiếu màu chữ trên button

```tsx
// ❌ SAI - Dựa vào màu chữ mặc định
<button className="bg-info">Click me</button>

// ✅ ĐÚNG - Màu chữ rõ ràng
<button className="bg-info text-info-foreground">Click me</button>
```

---

## Best Practices

### 1. Luôn ghép cặp Background với Foreground

```tsx
// Pattern: bg-{color} text-{color}-foreground
<Badge className="bg-primary text-primary-foreground">Primary</Badge>
<Badge className="bg-info text-info-foreground">Info</Badge>
<Badge className="bg-success text-success-foreground">Success</Badge>
```

### 2. Dùng DataSources cho màu động

Khi component cần render màu khác nhau, lưu color classes trong dataSources:

```typescript
// dataSources/ContactAdmin/index.ts
export const NEXT_STEPS = [
  {
    key: "step1",
    color: "from-info to-info/80",
    textColor: "text-info-foreground" // Nền tối → chữ trắng
  },
  {
    key: "step2",
    color: "from-primary to-primary/80",
    textColor: "text-primary-foreground" // Nền sáng → chữ tối
  },
  {
    key: "step3",
    color: "from-success to-success/80",
    textColor: "text-success-foreground" // Nền TB → chữ trắng
  }
] as const;
```

```tsx
// Sử dụng trong component
{
  steps.map((step) => (
    <div className={`bg-gradient-to-br ${step.color} ${step.textColor}`}>
      {step.title}
    </div>
  ));
}
```

### 3. Test cả Light và Dark mode

Luôn kiểm tra contrast ở cả 2 mode:

```tsx
// Cùng classes hoạt động ở cả 2 mode vì CSS variables tự điều chỉnh
<div className="bg-info text-info-foreground">
  {/* Light mode: nền xanh tối + chữ trắng */}
  {/* Dark mode: nền xanh sáng hơn + chữ xanh nhạt-trắng */}
</div>
```

### 4. Dùng semantic classes thay vì hardcoded

```tsx
// ❌ Tránh
<div className="bg-[#f59e0b] text-[#1a1a1a]">...</div>

// ✅ Ưu tiên
<div className="bg-primary text-primary-foreground">...</div>
```

### 5. Document quyết định màu sắc

Khi thêm color combination mới, ghi chú lý do:

```tsx
// Dùng text-foreground thay vì text-info-foreground
// vì bg-info/10 là nền tinted nhạt
<div className="bg-info/10 text-foreground">{message}</div>
```

---

## Quick Reference

### Kết hợp nền Solid

| Background       | Text Class                | Kết quả                   |
| ---------------- | ------------------------- | ------------------------- |
| `bg-primary`     | `text-primary-foreground` | Chữ tối trên amber        |
| `bg-info`        | `text-info-foreground`    | Chữ trắng trên xanh dương |
| `bg-success`     | `text-success-foreground` | Chữ trắng trên xanh lá    |
| `bg-warning`     | `text-warning-foreground` | Chữ tối trên vàng         |
| `bg-cream`       | `text-cream-foreground`   | Chữ tối trên kem          |
| `bg-destructive` | `text-white`              | Chữ trắng trên đỏ         |

### Kết hợp nền Tinted

| Background          | Text Class         | Kết quả                   |
| ------------------- | ------------------ | ------------------------- |
| `bg-info/10`        | `text-foreground`  | Chữ tối trên xanh nhạt    |
| `bg-success/10`     | `text-foreground`  | Chữ tối trên xanh lá nhạt |
| `bg-warning/20`     | `text-foreground`  | Chữ tối trên vàng nhạt    |
| `bg-destructive/10` | `text-destructive` | Chữ đỏ trên hồng nhạt     |

### Bảng tra Lightness

| Màu         | Lightness | Phân loại | Foreground cần |
| ----------- | --------- | --------- | -------------- |
| primary     | 0.769     | SÁNG      | Chữ TỐI        |
| info        | 0.45      | TỐI       | Chữ TRẮNG      |
| success     | 0.6       | TB        | Chữ TRẮNG      |
| warning     | 0.75      | SÁNG      | Chữ TỐI        |
| cream       | 0.95      | RẤT SÁNG  | Chữ TỐI        |
| destructive | 0.577     | TB        | Chữ TRẮNG      |

---

## Sử dụng theo Category

### Info/Instruction Boxes → `bg-cream` hoặc `bg-info/10`

| Component               | Màu sử dụng                      |
| ----------------------- | -------------------------------- |
| `OtpInstruction`        | `bg-cream text-cream-foreground` |
| `MagicLinkInstructions` | `bg-cream text-cream-foreground` |
| `PasswordRequirements`  | `bg-cream text-cream-foreground` |
| `RecoveryOptionsInfo`   | `bg-cream text-cream-foreground` |

### Alert/Notice Boxes → `bg-info/10` hoặc `bg-warning/10`

| Component           | Màu sử dụng                                       |
| ------------------- | ------------------------------------------------- |
| `ResponseTimeAlert` | `bg-info/10 border-info/30 text-foreground`       |
| `ImportantNotes`    | `bg-warning/10 border-warning/30 text-foreground` |

### Success States → `bg-success` hoặc `bg-success/10`

| Component               | Màu sử dụng                          |
| ----------------------- | ------------------------------------ |
| `SuccessIcon`           | `bg-success text-success-foreground` |
| `NextSteps` (completed) | `bg-success/10 text-foreground`      |

### Buttons → `bg-{color} text-{color}-foreground`

| Component      | Màu sử dụng                          |
| -------------- | ------------------------------------ |
| `SubmitButton` | `bg-primary text-primary-foreground` |
| `BackButton`   | `bg-info text-info-foreground`       |

### Social Buttons (Giữ nguyên brand colors)

- Google & Facebook brand colors là bắt buộc theo brand guidelines
- **Không thay đổi:** `#4285F4`, `#34A853`, `#FBBC05`, `#EA4335`, `#1877F2`

---

## Lưu ý quan trọng

1. **Social buttons** (Google, Facebook) giữ nguyên brand colors
2. **Destructive** giữ nguyên màu đỏ hiện tại
3. **Dark mode** - CSS variables tự động điều chỉnh
4. **Accessibility** - Đảm bảo contrast ratio >= 4.5:1

---

**Last Updated**: December 2024
